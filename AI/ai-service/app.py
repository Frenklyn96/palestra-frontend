import os
import time
import asyncio
import json
import urllib.request
import urllib.error
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import uvicorn

from detector import PeopleCounter
from managers.scanner_manager import ScannerManager
from managers.webcam_manager import WebcamManager
from core.enums import ScannerMode, WsEventType

# ── Managers Initialization ──────────────────────────────────────────────
detector = PeopleCounter()
webcam_manager = WebcamManager(detector)
scanner_manager = ScannerManager()

# ── WebSocket & Backend Integration Setups ──────────────────────────────────
_ws_clients: set[WebSocket] = set()
_ws_clients_lock = threading.Lock()
_be_url: str | None = None
_user_id: str | None = None

# Aggiungiamo un riferimento globale al loop di FastAPI per usarlo dai thread secondari
_fastapi_loop: asyncio.AbstractEventLoop | None = None

def _do_broadcast(loop: asyncio.AbstractEventLoop, payload: dict):
    # Se per qualche motivo il loop passato è staccato, cerchiamo di usare quello principale
    target_loop = _fastapi_loop or loop
    if target_loop is None:
        print("[QR] Impossibile trasmettere WS: nessun loop disponibile")
        return
        
    async def _send():
        with _ws_clients_lock:
            clients = set(_ws_clients)
        dead = set()
        for ws in clients:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        with _ws_clients_lock:
            _ws_clients.difference_update(dead)
    
    try:
        asyncio.run_coroutine_threadsafe(_send(), target_loop)
    except Exception as e:
        print(f"[QR] Fallita la schedulazione WS sul loop: {e}")

def _register_entrance(code: str, loop: asyncio.AbstractEventLoop):
    cliente = None
    scan_result = None

    if not _be_url or not _user_id:
        print(f"[QR] be_url/user_id non configurati, solo broadcast WS per: {code}")
        _do_broadcast(loop, {"type": WsEventType.QR_SCAN.value, "code": code})
        return

    try:
        try:
            url_cliente = f"{_be_url}/api/Clienti/{code}"
            print(f"[QR] GET {url_cliente}")
            req = urllib.request.Request(url_cliente)
            with urllib.request.urlopen(req, timeout=8) as resp:
                cliente = json.loads(resp.read().decode())
            print(f"[QR] Cliente OK: {cliente.get('nome')} {cliente.get('cognome')}")
        except Exception as e:
            print(f"[QR] Cliente non trovato ({code}): {e}")

        body = json.dumps({"clienteId": code, "userId": _user_id}).encode()
        url_scan = f"{_be_url}/api/Entrance/qr-scan"
        print(f"[QR] POST {url_scan}")
        req = urllib.request.Request(url_scan, data=body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                scan_result = json.loads(resp.read().decode())
            print(f"[QR] Entrance response: success={scan_result.get('success')}")
        except urllib.error.HTTPError as e:
            if e.code == 400:
                scan_result = json.loads(e.read().decode())
                print(f"[QR] Entrance 400: {scan_result.get('errorMessage')}")
            else:
                raise

        if scan_result and scan_result.get("success"):
            webcam_manager.decrement_count()
            print(f"[QR] Ingresso registrato: {code}")
        else:
            print(f"[QR] Errore ingresso ({code}): {scan_result}")

    except Exception as e:
        print(f"[QR] Errore chiamata BE: {e}")
        scan_result = {"success": False, "errorMessage": "Errore di comunicazione con il server"}

    _do_broadcast(loop, {
        "type": WsEventType.QR_PROCESSED.value,
        "code": code,
        "success": scan_result.get("success", False) if scan_result else False,
        "entrance": scan_result.get("entrance") if scan_result else None,
        "errorMessage": scan_result.get("errorMessage") if scan_result else None,
        "errorDetails": scan_result.get("errorDetails") if scan_result else None,
        "cliente": cliente,
    })

def on_scan(code: str):
    def thread_task(c):
        try:
            # Usa direttamente il loop principale
            if _fastapi_loop:
                _register_entrance(c, _fastapi_loop)
            else:
                print("[QR] Errore: FastAPI loop non inizializzato.")
        except Exception as err:
            print(f"[QR] Errore nel thread_task per _register_entrance: {err}")

    threading.Thread(target=thread_task, args=(code,), daemon=True).start()

scanner_manager.set_on_scan_callback(on_scan)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _fastapi_loop
    _fastapi_loop = asyncio.get_running_loop()
    
    webcam_manager.start()
    yield
    print("Shutting down - releasing camera...")
    scanner_manager.stop_scanner()
    webcam_manager.stop()
    print("Camera released.")

app = FastAPI(lifespan=lifespan, title="AI People Counter")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ── REST API: Counter & General ─────────────────────────────────────────────
@app.get("/api/count")
def get_count():
    return {"enter": webcam_manager.get_count()}

@app.post("/api/decrement")
def decrement_count():
    webcam_manager.decrement_count()
    return {"message": "Counter decremented", "enter": webcam_manager.get_count()}

@app.post("/api/reset")
def reset_count():
    webcam_manager.reset_count()
    return {"message": "Counter reset successfully", "enter": 0}

@app.get("/api/photos")
def list_photos():
    photos_dir = webcam_manager.detector.photos_dir
    if not os.path.exists(photos_dir): return []
    return sorted([f for f in os.listdir(photos_dir) if f.endswith(('.jpg', '.png'))], reverse=True)

@app.get("/api/photos/path")
def get_photos_path():
    return {"containerPath": webcam_manager.detector.photos_dir, "hostPath": os.getenv("HOST_PHOTOS_DIR", "")}

@app.get("/api/photos/{filename}")
def get_photo(filename: str):
    file_path = os.path.join(webcam_manager.detector.photos_dir, filename)
    if os.path.isfile(file_path): return FileResponse(file_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Photo not found")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/health")
def health_check_api():
    return {"status": "ok"}

@app.get("/api/video-sources")
def list_video_sources():
    cameras = webcam_manager.list_available_cameras()
    return {"cameras": cameras, "current": webcam_manager.get_current_source()}

@app.get("/api/video-source")
def get_video_source():
    return {"source": webcam_manager.get_current_source(), "running": webcam_manager.running}

@app.post("/api/video-source")
async def change_video_source(request: Request):
    try:
        data = await request.json()
        new_source = data.get("source")
        if new_source is None: raise HTTPException(status_code=400, detail="Missing 'source' parameter")
        
        success = webcam_manager.change_video_source(new_source)
        if success: return {"message": "Video source changed successfully", "source": webcam_manager.get_current_source()}
        else: raise HTTPException(status_code=500, detail="Failed to change video source")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/line-ratio")
def get_line_ratio():
    return {"line_y_ratio": webcam_manager.get_line_y_ratio()}

@app.post("/api/line-ratio")
async def set_line_ratio(request: Request):
    try:
        data = await request.json()
        ratio = data.get("line_y_ratio")
        if ratio is None: raise HTTPException(status_code=400, detail="Missing 'line_y_ratio' parameter")
        
        if not (0.0 <= float(ratio) <= 1.0):
            raise HTTPException(status_code=400, detail="'line_y_ratio' must be between 0.0 and 1.0")

        success = webcam_manager.set_line_y_ratio(float(ratio))
        if success: return {"message": "Line ratio changed successfully", "line_y_ratio": webcam_manager.get_line_y_ratio()}
        else: raise HTTPException(status_code=500, detail="Failed to change line ratio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── REST API: Scanner ────────────────────────────────────────────────────────
@app.get("/api/input-devices")
def list_input_devices():
    try:
        devices = scanner_manager.list_input_devices()
        return devices
    except Exception as e:
        raise HTTPException(status_code=501, detail=str(e))

@app.get("/api/last-qr-scan")
def get_last_qr_scan():
    scan = scanner_manager.get_last_scan()
    return {"code": scan["code"] if scan else None}

@app.post("/api/set-context")
async def set_context(request: Request):
    global _be_url, _user_id
    data = await request.json()
    _be_url = data.get("beUrl", "").rstrip("/") or None
    _user_id = data.get("userId") or None
    print(f"[QR] Contesto configurato: beUrl={_be_url}, userId={_user_id}")
    return {"ok": True}

@app.post("/api/qr-trigger")
async def qr_trigger(request: Request):
    data = await request.json()
    code = scanner_manager.normalize_qr(str(data.get("code", "")))
    if not code: raise HTTPException(status_code=400, detail="code is required")
    scanner_manager.broadcast_scan(code)
    return {"ok": True, "code": code}

@app.get("/api/scanner-device")
def get_scanner_device():
    return {"mode": scanner_manager.mode.value, "device": scanner_manager.device}

@app.post("/api/scanner-device")
async def set_scanner_device(request: Request):
    data = await request.json()
    if data.get("mode") == ScannerMode.GLOBAL_HOOK.value:
        try: scanner_manager.restart_scanner()
        except Exception as e: raise HTTPException(status_code=500, detail=str(e))
        scanner_manager.device = None
        return {"message": "Global keyboard hook started", "mode": ScannerMode.GLOBAL_HOOK.value}

    vendor_id = data.get("vendorId")
    product_id = data.get("productId")
    if not isinstance(vendor_id, int) or not isinstance(product_id, int):
        raise HTTPException(status_code=400, detail="vendorId and productId must be integers")
    label = data.get("label", f"HID {vendor_id:04x}:{product_id:04x}")
    try: scanner_manager.restart_scanner(vendor_id=vendor_id, product_id=product_id)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    
    scanner_manager.device = {"vendorId": vendor_id, "productId": product_id, "label": label}
    return {"message": "Scanner device set", "device": scanner_manager.device}

@app.delete("/api/scanner-device")
def clear_scanner_device():
    scanner_manager.stop_scanner()
    return {"message": "Scanner disabled", "mode": ScannerMode.DISABLED.value}

# ── Video Streaming & WebSockets ───────────────────────────────────────────
@app.get("/video_feed")
def video_feed():
    return StreamingResponse(webcam_manager.generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    webcam_manager.increment_clients()
    with _ws_clients_lock:
        _ws_clients.add(websocket)
    try:
        while True:
            current_count = webcam_manager.get_count()
            await websocket.send_json({"enter": current_count})
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        with _ws_clients_lock:
            _ws_clients.discard(websocket)
        webcam_manager.decrement_clients()
        await websocket.close()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
