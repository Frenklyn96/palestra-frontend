import os
import cv2
import time
import threading
import logging
import functools
import numpy as np
import torch
from collections import deque
from datetime import datetime
from ultralytics import YOLO
from ultralytics.nn.tasks import DetectionModel

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def configure_torch_checkpoint_loading():
    add_safe_globals = getattr(torch.serialization, "add_safe_globals", None)
    if add_safe_globals is None:
        return

    try:
        add_safe_globals([
            DetectionModel,
            torch.nn.modules.container.Sequential,
        ])
        logger.info("Configured PyTorch safe globals for Ultralytics checkpoints.")
    except Exception as exc:
        logger.warning(f"Unable to configure PyTorch safe globals: {exc}")


def configure_torch_load_defaults():
    original_torch_load = torch.load

    @functools.wraps(original_torch_load)
    def patched_torch_load(*args, **kwargs):
        # PyTorch 2.6 changed the default to weights_only=True.
        # Ultralytics 8.1.x checkpoints still expect the previous behavior.
        kwargs.setdefault("weights_only", False)
        return original_torch_load(*args, **kwargs)

    torch.load = patched_torch_load
    logger.info("Configured torch.load default weights_only=False for trusted checkpoints.")


configure_torch_checkpoint_loading()
configure_torch_load_defaults()

class PeopleCounter:
    def __init__(self):
        # Configuration from Envs
        self.video_source = os.getenv("VIDEO_SOURCE", "0")
        # Support int for webcam index, or string for URL/File
        if self.video_source.isdigit():
            self.video_source = int(self.video_source)
        
        self.line_y_ratio = float(os.getenv("LINE_Y", "0.5")) # 0.5 = middle of screen
        self.direction = os.getenv("DIRECTION", "down").lower() # "down" or "up"
        self.conf_threshold = float(os.getenv("CONF", "0.3"))
        
        # State
        self.enter_count = 0
        self.running = False
        self.lock = threading.Lock()
        
        # VideoCapture reference per rilascio esplicito
        self.cap = None
        
        # Ultimo frame elaborato (per lo streaming web)
        self.current_frame = None
        
        # Tracking history: ID -> deque of (x, y)
        self.track_history = {}
        self.max_track_length = 30
        
        # Keep track of already counted IDs to prevent double counting
        self.counted_ids = set()
        
        # Paths
        self.photos_dir = os.path.abspath(
            os.getenv("PHOTOS_DIR", os.path.join(os.getcwd(), "photos"))
        )
        os.makedirs(self.photos_dir, exist_ok=True)
        logger.info(f"Photo storage directory: {self.photos_dir}")
        
        # Model
        logger.info("Loading YOLOv8n model...")
        self.model = YOLO("yolov8n.pt") # Will download first time
        logger.info("Model loaded.")

    def get_count(self):
        with self.lock:
            return self.enter_count

    def delete_most_recent_photo(self):
        """Elimina la foto più recente dalla cartella photos"""
        try:
            if not os.path.exists(self.photos_dir):
                logger.warning(f"Photos directory does not exist: {self.photos_dir}")
                return False
            
            # Ottieni tutti i file .jpg nella cartella
            photos = [f for f in os.listdir(self.photos_dir) if f.endswith('.jpg') and f.startswith('entry_')]
            
            if not photos:
                logger.warning("No photos found to delete")
                return False
            
            # Ordina per nome (che contiene il timestamp) in ordine decrescente
            # Il nome più recente sarà il primo
            photos.sort(reverse=True)
            most_recent = photos[0]
            
            photo_path = os.path.join(self.photos_dir, most_recent)
            os.remove(photo_path)
            logger.info(f"🗑️  Deleted most recent photo: {most_recent}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting most recent photo: {e}")
            return False

    def decrement_count(self):
        with self.lock:
            if self.enter_count > 0:
                self.enter_count -= 1
                logger.info(f"Counter decremented to {self.enter_count}")
                # Elimina la foto più recente quando si decrementa
                self.delete_most_recent_photo()
            return self.enter_count

    def reset_count(self):
        with self.lock:
            self.enter_count = 0
            logger.info("Counter reset to 0")

    def save_entry_photo(self, frame):
        os.makedirs(self.photos_dir, exist_ok=True)
        # Format the timestamp as YYYY-MM-DD_HH-MM-SS
        time_str = time.strftime("%Y-%m-%d_%H-%M-%S")
        # Add milliseconds for uniqueness if multiple people cross at the precise same second
        ms = int((time.time() % 1) * 1000)
        filename = f"entry_{time_str}_{ms:03d}.jpg"
        path = os.path.join(self.photos_dir, filename)
        
        # Async save to not block processing too much (simple implementation here)
        cv2.imwrite(path, frame)
        logger.info(f"📸 Entry detected! Photo saved: {filename}")

    def process_crossing(self, track_id, previous_y, current_y, line_y, frame):
        # Determine crossing based on direction
        crossed = False
        
        if self.direction == "down":
            # Moving down: Prev < Line AND Curr >= Line
            if previous_y < line_y and current_y >= line_y:
                crossed = True
        elif self.direction == "up":
            # Moving up: Prev > Line AND Curr <= Line
            if previous_y > line_y and current_y <= line_y:
                crossed = True
                
        if crossed:
            with self.lock:
                self.enter_count += 1
            self.save_entry_photo(frame)
            # Mark ID as counted instead of deleting history, to prevent double counting
            self.counted_ids.add(track_id)

    def run(self):
        self.running = True
        
        # Prova diversi backend per Windows con fallback
        cap = None
        
        if isinstance(self.video_source, int) and os.name == 'nt':
            logger.info(f"Tentativo apertura webcam {self.video_source} su Windows...")
            
            # 1° tentativo: DirectShow (più stabile su Windows con alcune webcam)
            logger.info("  Tentativo 1: DirectShow (CAP_DSHOW)...")
            cap = cv2.VideoCapture(self.video_source, cv2.CAP_DSHOW)
            
            if not cap.isOpened():
                logger.warning("  DirectShow fallito. Provo Auto-detect (MSMF)...")
                cap = cv2.VideoCapture(self.video_source)
            
            if not cap.isOpened():
                logger.warning("  Auto-detect fallito. Provo CAP_MSMF esplicito...")
                cap = cv2.VideoCapture(self.video_source, cv2.CAP_MSMF)
            
            if not cap.isOpened():
                logger.error(f"❌ Impossibile aprire la webcam {self.video_source}")
                logger.error("   Possibili cause:")
                logger.error("   - Webcam già in uso da altra app (Teams, Zoom, Skype)")
                logger.error("   - Driver webcam non installati")
                logger.error("   - Webcam disconnessa")
                logger.error("")
                logger.error("   Soluzioni:")
                logger.error("   1. Chiudi tutte le app che usano la webcam")
                logger.error("   2. Verifica Device Manager > Fotocamere")
                logger.error("   3. Prova a cambiare VideoSource a '1' per seconda camera")
                self.running = False
                return
            
            logger.info(f"✅ Webcam {self.video_source} aperta con successo!")
        else:
            # URL o file video
            cap = cv2.VideoCapture(self.video_source)
            
            if not cap.isOpened():
                logger.error(f"Could not open video source: {self.video_source}")
                self.running = False
                return

        # Salva riferimento per rilascio esplicito
        self.cap = cap
        
        # Verifica che possiamo leggere almeno un frame
        test_success, test_frame = cap.read()
        if not test_success:
            logger.error("❌ Camera si apre ma non riesce a leggere frame!")
            logger.error("   La camera potrebbe essere in uso o disconnessa.")
            cap.release()
            self.cap = None
            self.running = False
            return
        
        logger.info(f"✅ Started detection on source: {self.video_source}")
        
        retry_count = 0
        max_retries = 3
        consecutive_errors = 0  # Conta errori consecutivi
        
        while self.running:
            success, frame = cap.read()
            if not success:
                retry_count += 1
                consecutive_errors += 1
                logger.warning(f"Failed to read frame (tentativo {retry_count}/{max_retries}, consecutivi: {consecutive_errors})")
                
                if retry_count >= max_retries:
                    logger.error("❌ Troppi errori di lettura. Camera disconnessa o in uso.")
                    logger.error("   Controlla se un'altra app ha preso possesso della webcam.")
                    self.running = False  # IMPORTANTE: setta running = False
                    break
                
                time.sleep(2)
                # Prova a riaprire
                cap.release()
                
                # Riprova con DirectShow se siamo su Windows
                if isinstance(self.video_source, int) and os.name == 'nt':
                    logger.info(f"  Tentativo riapertura con DirectShow...")
                    cap = cv2.VideoCapture(self.video_source, cv2.CAP_DSHOW)
                else:
                    cap = cv2.VideoCapture(self.video_source)
                continue
            
            # Reset retry counter on successful read
            retry_count = 0
            consecutive_errors = 0  # Reset anche errori consecutivi

            # Frame dimensions
            height, width = frame.shape[:2]
            line_y = int(height * self.line_y_ratio)

            # YOLOv8 Tracking
            # persist=True is crucial for tracking between frames
            results = self.model.track(frame, persist=True, classes=[0], conf=self.conf_threshold, verbose=False, device='cpu')

            if results and results[0].boxes and results[0].boxes.id is not None:
                boxes = results[0].boxes.xywh.cpu().numpy()
                track_ids = results[0].boxes.id.int().cpu().numpy()

                for box, track_id in zip(boxes, track_ids):
                    x, y, w, h = box
                    center_x, center_y = float(x), float(y)
                    
                    # Initialize history if new
                    if track_id not in self.track_history:
                        self.track_history[track_id] = deque(maxlen=self.max_track_length)
                    
                    track_deque = self.track_history[track_id]
                    
                    if len(track_deque) > 1 and track_id not in self.counted_ids:
                        # Check crossing with last known position
                        prev_x, prev_y = track_deque[-1]
                        self.process_crossing(track_id, prev_y, center_y, line_y, frame)

                    track_deque.append((center_x, center_y))

            # Disegna le bounding box usando il metodo built-in plot di YOLO
            annotated_frame = results[0].plot()

            # Disegna la linea di conteggio (verde)
            cv2.line(annotated_frame, (0, line_y), (width, line_y), (0, 255, 0), 2)
            
            # Mostra il contatore sullo schermo
            cv2.putText(annotated_frame, f"Counter: {self.enter_count}", (20, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            # Mettiamo da parte il frame per lo streaming web
            # Copiamo il frame con .copy() in modo asincrono in thread-safety lock
            with self.lock:
                self.current_frame = annotated_frame.copy()

            # Simple sleep to prevent 100% CPU usage if processing is too fast
            time.sleep(0.01)

        cap.release()
        self.cap = None
        try:
            cv2.destroyAllWindows()
        except:
            pass
        logger.info("Detector stopped.")

    def start_background(self):
        t = threading.Thread(target=self.run, daemon=True)
        t.start()
    
    def stop(self):
        """Ferma il detector e rilascia la webcam"""
        logger.info("Stopping detector...")
        self.running = False
        
        # Rilascia esplicitamente la webcam se aperta
        if self.cap is not None:
            try:
                logger.info("  Releasing camera...")
                self.cap.release()
                self.cap = None
                cv2.destroyAllWindows()
            except Exception as e:
                logger.warning(f"  Error releasing camera: {e}")
        
        # Aspetta che il thread finisca (più tempo per sicurezza)
        time.sleep(2)
        logger.info("Detector stopped and camera released.")
    
    def get_current_source(self):
        """Ritorna la sorgente video corrente"""
        return str(self.video_source)
    
    def change_video_source(self, new_source):
        """Cambia sorgente video e riavvia il detector"""
        logger.info(f"Changing video source from {self.video_source} to {new_source}")
        
        # Ferma il detector corrente e rilascia la camera
        self.stop()
        
        # Aspetta un po' di più per assicurarsi che la camera sia completamente rilasciata
        logger.info("Waiting for camera to be fully released...")
        time.sleep(1)
        
        # Cambia la sorgente
        if isinstance(new_source, str) and new_source.isdigit():
            self.video_source = int(new_source)
        else:
            self.video_source = new_source
        
        # Reset stato
        self.current_frame = None
        self.track_history = {}
        self.counted_ids = set()
        
        # Riavvia
        logger.info(f"Restarting detector with new source: {self.video_source}")
        self.start_background()
        
        return True
    
    @staticmethod
    def list_available_cameras():
        """Lista le webcam disponibili su Windows"""
        available = []
        
        # Testa fino a 10 indici webcam
        for i in range(10):
            try:
                if os.name == 'nt':
                    # Prova con auto-detect prima (più veloce)
                    cap = cv2.VideoCapture(i)
                else:
                    cap = cv2.VideoCapture(i)
                
                if cap.isOpened():
                    # Prova a leggere un frame per verificare che funzioni davvero
                    ret, _ = cap.read()
                    if ret:
                        available.append({
                            "index": i,
                            "name": f"Camera {i}",
                            "type": "webcam"
                        })
                    cap.release()
                else:
                    # Se non riesce ad aprire, probabilmente non ci sono più webcam
                    break
            except Exception:
                break
        
        return available