import threading
import time
from datetime import datetime
import asyncio
import cv2
import numpy as np

from detector import PeopleCounter

class WebcamManager:
    def __init__(self, detector: PeopleCounter):
        self.detector = detector
        self.active_clients = 0
        self.clients_lock = threading.Lock()
        self.last_client_disconnect: datetime | None = None
        self.auto_pause_seconds = 30
        self.running = False

    def get_count(self):
        return self.detector.get_count()

    def decrement_count(self):
        self.detector.decrement_count()

    def reset_count(self):
        self.detector.reset_count()
        
    def get_current_source(self):
        return self.detector.get_current_source()
        
    def change_video_source(self, new_source):
        return self.detector.change_video_source(new_source)

    def get_line_y_ratio(self):
        return self.detector.get_line_y_ratio()

    def set_line_y_ratio(self, ratio):
        return self.detector.set_line_y_ratio(ratio)

    def list_available_cameras(self):
        return PeopleCounter.list_available_cameras()

    def start(self):
        self.detector.start_background()
        self.running = True

    def stop(self):
        self.detector.stop()
        self.running = False

    def increment_clients(self):
        with self.clients_lock:
            self.active_clients += 1
            print(f"Client connected. Active clients: {self.active_clients}")
            if not self.detector.running:
                print("Resuming detector (client connected)...")
                self.detector.start_background()

    def decrement_clients(self):
        with self.clients_lock:
            self.active_clients -= 1
            if self.active_clients < 0:
                self.active_clients = 0
            print(f"Client disconnected. Active clients: {self.active_clients}")
            if self.active_clients == 0:
                self.last_client_disconnect = datetime.now()

    def generate_frames(self):
        """Generatore video frame-by-frame per lo streaming in multipart/x-mixed-replace"""
        self.increment_clients()
        placeholder_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder_frame, "WEBCAM IN USE OR DISCONNECTED", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ret, placeholder_buffer = cv2.imencode('.jpg', placeholder_frame)
        placeholder_bytes_ready = placeholder_buffer.tobytes()

        try:
            while True:
                with self.detector.lock:
                    frame = self.detector.current_frame
                    
                if frame is None:
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + placeholder_bytes_ready + b'\r\n')
                    time.sleep(1.0)
                    continue
                    
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                    
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.03)
        except Exception:
            pass
        finally:
            self.decrement_clients()

    async def auto_pause_monitor(self):
        while True:
            await asyncio.sleep(5)
            with self.clients_lock:
                if self.active_clients == 0 and self.last_client_disconnect is not None:
                    elapsed = (datetime.now() - self.last_client_disconnect).total_seconds()
                    if elapsed >= self.auto_pause_seconds and self.detector.running:
                        print(f"No clients for {int(elapsed)}s - pausing detector to release camera...")
                        self.detector.stop()
                        self.last_client_disconnect = None
