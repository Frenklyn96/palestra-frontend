import os
import time
import asyncio
import numpy as np
import cv2
import threading
from datetime import datetime
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import cv2
from contextlib import asynccontextmanager
import uvicorn

from detector import PeopleCounter

# Initialize Detector
counter = PeopleCounter()

# Client tracking per auto-pause
active_clients = 0
clients_lock = threading.Lock()
last_client_disconnect = None
auto_pause_seconds = 30  # Pausa detector dopo 30 secondi senza client

def increment_clients():
    global active_clients
    with clients_lock:
        active_clients += 1
        print(f"Client connected. Active clients: {active_clients}")
        # Riavvia detector se era in pausa
        if not counter.running:
            print("Resuming detector (client connected)...")
            counter.start_background()

def decrement_clients():
    global active_clients, last_client_disconnect
    with clients_lock:
        active_clients -= 1
        if active_clients < 0:
            active_clients = 0
        print(f"Client disconnected. Active clients: {active_clients}")
        if active_clients == 0:
            last_client_disconnect = datetime.now()

async def auto_pause_monitor():
    """Monitora e mette in pausa il detector se nessun client per X secondi"""
    global last_client_disconnect
    while True:
        await asyncio.sleep(5)  # Controlla ogni 5 secondi
        
        with clients_lock:
            if active_clients == 0 and last_client_disconnect is not None:
                elapsed = (datetime.now() - last_client_disconnect).total_seconds()
                if elapsed >= auto_pause_seconds and counter.running:
                    print(f"No clients for {int(elapsed)}s - pausing detector to release camera...")
                    counter.stop()
                    last_client_disconnect = None  # Reset

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    counter.start_background()
    
    # Avvia monitor auto-pause in background
    asyncio.create_task(auto_pause_monitor())
    
    yield
    
    # Shutdown - rilascia webcam correttamente
    print("Shutting down - releasing camera...")
    counter.stop()  # Usa stop() invece di solo running=False
    print("Camera released.")

app = FastAPI(lifespan=lifespan, title="AI People Counter")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REST API ---

@app.get("/api/count")
def get_count():
    return {"enter": counter.get_count()}

@app.post("/api/decrement")
def decrement_count():
    counter.decrement_count()
    return {"message": "Counter decremented", "enter": counter.get_count()}

@app.post("/api/reset")
def reset_count():
    counter.reset_count()
    return {"message": "Counter reset successfully", "enter": 0}

@app.get("/api/photos")
def list_photos():
    photos_dir = counter.photos_dir
    if not os.path.exists(photos_dir):
        return []
    
    files = sorted(
        [f for f in os.listdir(photos_dir) if f.endswith(('.jpg', '.png'))],
        reverse=True
    )
    return files

@app.get("/api/photos/path")
def get_photos_path():
    return {
        "containerPath": counter.photos_dir,
        "hostPath": os.getenv("HOST_PHOTOS_DIR", "")
    }

@app.get("/api/photos/{filename}")
def get_photo(filename: str):
    file_path = os.path.join(counter.photos_dir, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Photo not found")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/health")
def health_check_api():
    return {"status": "ok"}

@app.get("/api/video-sources")
def list_video_sources():
    """Lista le webcam disponibili"""
    cameras = PeopleCounter.list_available_cameras()
    return {"cameras": cameras, "current": counter.get_current_source()}

@app.get("/api/video-source")
def get_video_source():
    """Ottiene la sorgente video corrente"""
    return {
        "source": counter.get_current_source(),
        "running": counter.running
    }

@app.post("/api/video-source")
async def change_video_source(request: Request):
    """Cambia sorgente video"""
    try:
        data = await request.json()
        new_source = data.get("source")
        
        if new_source is None:
            raise HTTPException(status_code=400, detail="Missing 'source' parameter")
        
        # Cambia sorgente
        success = counter.change_video_source(new_source)
        
        if success:
            return {
                "message": "Video source changed successfully",
                "source": counter.get_current_source()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to change video source")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Video Streaming ---

def generate_frames():
    """Generatore video frame-by-frame per lo streaming in multipart/x-mixed-replace"""
    
    # Registra client connesso
    increment_clients()
    
    # Crea un frame di placeholder una sola volta
    placeholder_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(placeholder_frame, "WEBCAM IN USE OR DISCONNECTED", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    ret, placeholder_buffer = cv2.imencode('.jpg', placeholder_frame)
    placeholder_bytes_ready = placeholder_buffer.tobytes()

    try:
        while True:
            # Creiamo una copia locale veloce per non tenere bloccato il Counter thread troppo a lungo
            with counter.lock:
                frame = counter.current_frame
                
            if frame is None:
                # Invia il placeholder se la camera non è pronta o è in errore
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + placeholder_bytes_ready + b'\r\n')
                time.sleep(1.0)
                continue
                
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Necessario permettere all'async loop di respirare per rilevare se il client si è disconnesso
            time.sleep(0.03)
    except Exception as e:
        # Quando il Client Web Browser chiude la pagina (chiudendo inaspettatamente la socket mjpeg)
        # o quando avvengono errori di encoding, FastAPI lancerà un eccezione Async nel generatore. 
        # Noi la ignoriamo quietamente per evitare che crashi tutta l'applicazione ASGI.
        pass
    finally:
        # Deregistra client quando si disconnette
        decrement_clients()

@app.get("/video_feed")
def video_feed():
    # Ritorna la risposta stream generata continuamente al client
    return StreamingResponse(
        generate_frames(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# --- WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Registra client WebSocket connesso
    increment_clients()
    
    try:
        last_count = -1
        while True:
            current_count = counter.get_count()
            # Send update only if changed or heartbeat needed
            # Here we send every second for demo purposes
            await websocket.send_json({"enter": current_count})
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        # Deregistra client WebSocket
        decrement_clients()
        await websocket.close()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)