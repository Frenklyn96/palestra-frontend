import os
import time
import asyncio
import numpy as np
import cv2
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import cv2
from contextlib import asynccontextmanager
import uvicorn

from detector import PeopleCounter

# Initialize Detector
counter = PeopleCounter()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    counter.start_background()
    yield
    # Shutdown
    counter.running = False

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

# --- Video Streaming ---

def generate_frames():
    """Generatore video frame-by-frame per lo streaming in multipart/x-mixed-replace"""
    
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
        await websocket.close()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)