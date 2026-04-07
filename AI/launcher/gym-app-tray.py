"""
GymProject Frontend Tray Application
Gestisce l'avvio del frontend React con icona nella system tray di Windows
"""
import subprocess
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# Verifica e installa dipendenze
def setup_dependencies():
    """Installa le dipendenze necessarie se mancanti"""
    try:
        import pystray
        from PIL import Image
        import requests
        return True
    except ImportError:
        pass
    
    print("Installazione dipendenze richieste...")
    print("Questo potrebbe richiedere qualche secondo...")
    
    # Prova con ensurepip per configurare pip
    try:
        subprocess.check_call([sys.executable, "-m", "ensurepip", "--default-pip"], 
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass
    
    # Prova ad installare le dipendenze
    packages = ["pystray", "pillow", "requests"]
    
    for package in packages:
        try:
            print(f"  Installazione {package}...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", package],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except subprocess.CalledProcessError:
            print(f"\n❌ Errore: pip non disponibile o installazione fallita.")
            print(f"\n💡 Soluzione:")
            print(f"   1. Installa manualmente: pip install pystray pillow requests")
            print(f"   2. Oppure usa Python 3.11 che ha pip configurato:")
            print(f"      py -3.11 gym-app-tray.py")
            print(f"\n   Premi un tasto per chiudere...")
            input()
            return False
    
    print("✅ Dipendenze installate con successo!")
    return True

if not setup_dependencies():
    sys.exit(1)

try:
    import pystray
    from PIL import Image, ImageDraw
    import requests
except ImportError as e:
    print(f"❌ Errore nell'importazione dei moduli: {e}")
    print("\n💡 Prova ad eseguire con Python 3.11:")
    print("   py -3.11 gym-app-tray.py")
    input("\nPremi un tasto per chiudere...")
    sys.exit(1)


"""
GymProject AI Service Tray Application
Gestisce il servizio AI con icona nella system tray di Windows
"""
import subprocess
import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# Verifica e installa dipendenze
def setup_dependencies():
    """Installa le dipendenze necessarie se mancanti"""
    try:
        import pystray
        from PIL import Image
        import requests
        return True
    except ImportError:
        pass
    
    print("Installazione dipendenze richieste...")
    print("Questo potrebbe richiedere qualche secondo...")
    
    # Prova con ensurepip per configurare pip
    try:
        subprocess.check_call([sys.executable, "-m", "ensurepip", "--default-pip"], 
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass
    
    # Prova ad installare le dipendenze
    packages = ["pystray", "pillow", "requests"]
    
    for package in packages:
        try:
            print(f"  Installazione {package}...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", package],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except subprocess.CalledProcessError:
            print(f"\n❌ Errore: pip non disponibile o installazione fallita.")
            print(f"\n💡 Soluzione:")
            print(f"   1. Installa manualmente: pip install pystray pillow requests")
            print(f"   2. Oppure usa Python 3.11 che ha pip configurato:")
            print(f"      py -3.11 gym-app-tray.py")
            print(f"\n   Premi un tasto per chiudere...")
            input()
            return False
    
    print("✅ Dipendenze installate con successo!")
    return True

if not setup_dependencies():
    sys.exit(1)

try:
    import pystray
    from PIL import Image, ImageDraw
    import requests
except ImportError as e:
    print(f"❌ Errore nell'importazione dei moduli: {e}")
    print("\n💡 Prova ad eseguire con Python 3.11:")
    print("   py -3.11 gym-app-tray.py")
    input("\nPremi un tasto per chiudere...")
    sys.exit(1)


class AIServiceTray:
    def __init__(self):
        self.launcher_dir = Path(__file__).parent
        self.installer_dir = self.launcher_dir.parent / "installer"
        self.install_script = self.installer_dir / "install-ai-service.ps1"
        self.icon = None
        self.service_url = "http://localhost:8001/api/health"
        self.video_url = "http://localhost:8001/video_feed"
        
    def create_icon_image(self, color="blue"):
        """Crea un'icona colorata per lo stato del servizio AI"""
        width = 64
        height = 64
        image = Image.new('RGB', (width, height), color="white")
        dc = ImageDraw.Draw(image)
        
        colors = {
            "blue": "#2196F3",
            "green": "#4CAF50",
            "red": "#F44336",
            "orange": "#FF9800",
            "gray": "#9E9E9E"
        }
        
        # Disegna un cerchio
        dc.ellipse([8, 8, width-8, height-8], fill=colors.get(color, "#2196F3"))
        
        # Aggiungi lettere "AI"
        dc.text((width//4, height//3), "AI", fill="white")
        
        return image
    
    def run_powershell_script(self, action):
        """Esegue lo script PowerShell per gestire il servizio AI"""
        try:
            cmd = [
                "powershell",
                "-ExecutionPolicy", "Bypass",
                "-File", str(self.install_script),
                "-Action", action
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=str(self.installer_dir)
            )
            
            return result.returncode == 0, result.stdout + result.stderr
        except Exception as e:
            return False, str(e)
    
    def check_service_health(self):
        """Controlla se il servizio AI è raggiungibile"""
        try:
            response = requests.get(self.service_url, timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def get_service_status(self):
        """Ottiene lo stato del servizio"""
        success, output = self.run_powershell_script("status")
        is_healthy = self.check_service_health()
        
        if "IN ESECUZIONE" in output and is_healthy:
            return "running"
        elif "NON in esecuzione" in output:
            return "stopped"
        else:
            return "error"
    
    def start_service(self, icon, item):
        """Avvia il servizio AI"""
        icon.notify("Avvio servizio AI in corso...\nPotrebbe richiedere fino a 2 minuti al primo avvio", "Servizio AI")
        
        def start_async():
            success, output = self.run_powershell_script("start")
            time.sleep(3)
            self.update_icon()
            
            if success and self.check_service_health():
                icon.notify("Servizio AI avviato con successo!", "Servizio AI")
            else:
                icon.notify("Controlla i log per dettagli sull'errore", "Errore avvio servizio")
        
        threading.Thread(target=start_async, daemon=True).start()
    
    def stop_service(self, icon, item):
        """Ferma il servizio AI"""
        icon.notify("Arresto servizio AI in corso...", "Servizio AI")
        success, output = self.run_powershell_script("stop")
        
        time.sleep(1)
        self.update_icon()
        
        if success:
            icon.notify("Servizio AI arrestato", "Servizio AI")
        else:
            icon.notify("Errore nell'arresto del servizio", "Servizio AI")
    
    def show_status(self, icon, item):
        """Mostra lo stato del servizio"""
        status = self.get_service_status()
        
        if status == "running":
            msg = "✅ Servizio AI in esecuzione\n✅ Health check OK"
        elif status == "stopped":
            msg = "❌ Servizio AI non in esecuzione"
        else:
            msg = "⚠️ Servizio AI in stato di errore"
        
        icon.notify(msg, "Stato Servizio AI")
    
    def open_video_feed(self, icon, item):
        """Apre lo stream video nel browser"""
        if self.get_service_status() != "running":
            icon.notify("Avvio servizio AI prima di aprire il video...", "Servizio AI")
            self.start_service(icon, item)
            time.sleep(5)
        
        webbrowser.open(self.video_url)
    
    def open_scanner_page(self, icon, item):
        """Apre la pagina scanner nel browser"""
        webbrowser.open("http://localhost:5173/scanner")
    
    def quit_app(self, icon, item):
        """Chiude l'applicazione tray (il servizio continua)"""
        icon.stop()
    
    def quit_and_stop(self, icon, item):
        """Chiude l'applicazione tray e ferma il servizio"""
        icon.notify("Chiusura servizio AI...", "Servizio AI")
        self.stop_service(icon, item)
        time.sleep(1)
        icon.stop()
    
    def create_menu(self):
        """Crea il menu contestuale della tray"""
        return pystray.Menu(
            pystray.MenuItem("Avvia Servizio AI", self.start_service),
            pystray.MenuItem("Ferma Servizio AI", self.stop_service),
            pystray.MenuItem("Stato Servizio", self.show_status),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Apri Video Stream", self.open_video_feed),
            pystray.MenuItem("Apri Pagina Scanner", self.open_scanner_page),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Esci (servizio continua)", self.quit_app),
            pystray.MenuItem("Esci e Ferma Servizio", self.quit_and_stop)
        )
    
    def update_icon(self):
        """Aggiorna l'icona in base allo stato"""
        if not self.icon:
            return
        
        status = self.get_service_status()
        
        if status == "running":
            color = "green"
            tooltip = "Servizio AI - In esecuzione"
        elif status == "stopped":
            color = "red"
            tooltip = "Servizio AI - Spento"
        else:
            color = "orange"
            tooltip = "Servizio AI - Errore"
        
        self.icon.icon = self.create_icon_image(color)
        self.icon.title = tooltip
    
    def monitor_service(self):
        """Thread che monitora lo stato del servizio e aggiorna l'icona"""
        last_status = None
        startup_notified = False
        
        while self.icon and self.icon.visible:
            current_status = self.get_service_status()
            
            # Notifica cambio di stato
            if current_status != last_status and last_status is not None:
                if current_status == "running" and not startup_notified:
                    if self.icon:
                        self.icon.notify("✅ Servizio AI pronto!\nHealth check OK", "Servizio AI")
                    startup_notified = True
                    print("✅ Servizio AI pronto e funzionante!")
                elif current_status == "stopped" and last_status == "running":
                    if self.icon:
                        self.icon.notify("⚠️ Servizio AI arrestato", "Servizio AI")
            
            last_status = current_status
            self.update_icon()
            
            # Controlla più frequentemente se il servizio è in avvio
            if current_status == "stopped":
                time.sleep(5)  # Controlla ogni 5 secondi quando spento
            else:
                time.sleep(10)  # Controlla ogni 10 secondi quando attivo
    
    def run(self):
        """Avvia l'applicazione tray"""
        print("""
╔══════════════════════════════════════════╗
║     GymProject AI Service Manager        ║
║   Gestione servizio AI con tray icon     ║
╚══════════════════════════════════════════╝
""")
        
        # Crea icona tray subito
        image = self.create_icon_image("blue")
        
        self.icon = pystray.Icon(
            "ai_service",
            image,
            "Servizio AI - Caricamento...",
            menu=self.create_menu()
        )
        
        # Avvia thread di monitoraggio
        monitor_thread = threading.Thread(target=self.monitor_service, daemon=True)
        monitor_thread.start()
        
        # Controlla e avvia il servizio in background
        def check_and_start():
            time.sleep(1)
            initial_status = self.get_service_status()
            
            if initial_status == "stopped":
                print("Il servizio AI non è in esecuzione.")
                print("Avvio del servizio AI in background...")
                
                # Avvia in modo asincrono (non aspettare)
                def start_async():
                    try:
                        cmd = [
                            "powershell",
                            "-ExecutionPolicy", "Bypass",
                            "-File", str(self.install_script),
                            "-Action", "start"
                        ]
                        
                        # Usa Popen invece di run per non bloccare
                        subprocess.Popen(
                            cmd,
                            cwd=str(self.installer_dir),
                            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                        )
                        
                        print("✅ Comando di avvio inviato!")
                        print("⏳ Il servizio si avvierà in background (1-2 minuti)...")
                        
                        if self.icon:
                            self.icon.notify(
                                "Avvio servizio AI in corso...\nPuò richiedere 1-2 minuti",
                                "Servizio AI"
                            )
                    except Exception as e:
                        print(f"⚠️ Errore: {e}")
                
                threading.Thread(target=start_async, daemon=True).start()
            else:
                print("✅ Servizio AI già in esecuzione")
        
        startup_thread = threading.Thread(target=check_and_start, daemon=True)
        startup_thread.start()
        
        print("\n✨ Icona aggiunta alla system tray!")
        print("Click destro sull'icona 'AI' per gestire il servizio.\n")
        
        # Avvia l'icona (blocca fino a quit)
        self.icon.run()


if __name__ == "__main__":
    app = AIServiceTray()
    
    try:
        app.run()
    except KeyboardInterrupt:
        print("\nChiusura in corso...")
    except Exception as e:
        print(f"Errore: {e}")
        input("\nPremi un tasto per chiudere...")

    def __init__(self):
        self.app_dir = Path(__file__).parent
        self.icon = None
        self.process = None
        self.app_url = "http://localhost:5173"
        self.running = False
        
    def create_icon_image(self, color="blue"):
        """Crea un'icona colorata per lo stato dell'app"""
        width = 64
        height = 64
        image = Image.new('RGB', (width, height), color="white")
        dc = ImageDraw.Draw(image)
        
        colors = {
            "blue": "#2196F3",
            "green": "#4CAF50",
            "red": "#F44336",
            "orange": "#FF9800",
            "gray": "#9E9E9E"
        }
        
        # Disegna un cerchio
        dc.ellipse([8, 8, width-8, height-8], fill=colors.get(color, "#2196F3"))
        
        # Aggiungi lettere "GP" (GymProject)
        dc.text((width//4 - 4, height//3), "GP", fill="white")
        
        return image
    
    def check_app_health(self):
        """Controlla se l'app frontend è raggiungibile"""
        try:
            response = requests.get(self.app_url, timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def start_app(self):
        """Avvia il frontend React"""
        if self.process and self.process.poll() is None:
            print("App già in esecuzione")
            return True
        
        try:
            # Verifica che node_modules esista
            node_modules = self.app_dir / "node_modules"
            if not node_modules.exists():
                if self.icon:
                    self.icon.notify(
                        "Installazione dipendenze in corso...\nPuò richiedere qualche minuto.",
                        "GymProject"
                    )
                
                # Installa dipendenze
                install_proc = subprocess.run(
                    ["npm", "install"],
                    cwd=self.app_dir,
                    capture_output=True,
                    text=True
                )
                
                if install_proc.returncode != 0:
                    if self.icon:
                        self.icon.notify("Errore nell'installazione dipendenze", "GymProject")
                    return False
            
            # Avvia il dev server
            self.process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=self.app_dir,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            self.running = True
            
            # Aspetta che il server sia pronto
            max_wait = 30
            for i in range(max_wait):
                if self.check_app_health():
                    if self.icon:
                        self.icon.notify("App avviata con successo!", "GymProject")
                    return True
                time.sleep(1)
            
            if self.icon:
                self.icon.notify("App avviata, ma potrebbe non essere ancora pronta", "GymProject")
            return True
            
        except Exception as e:
            if self.icon:
                self.icon.notify(f"Errore avvio app: {str(e)}", "GymProject")
            return False
    
    def stop_app(self):
        """Ferma il frontend React"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except:
                self.process.kill()
            
            self.process = None
            self.running = False
            
            if self.icon:
                self.icon.notify("App arrestata", "GymProject")
            return True
        return False
    
    def restart_app(self, icon, item):
        """Riavvia l'applicazione"""
        icon.notify("Riavvio app in corso...", "GymProject")
        self.stop_app()
        time.sleep(2)
        self.start_app()
        self.update_icon()
    
    def open_browser(self, icon, item):
        """Apre l'applicazione nel browser"""
        if not self.running:
            icon.notify("Avvio app in corso...", "GymProject")
            self.start_app()
            time.sleep(3)
        
        webbrowser.open(self.app_url)
    
    def open_scanner(self, icon, item):
        """Apre la pagina scanner direttamente"""
        if not self.running:
            icon.notify("Avvio app in corso...", "GymProject")
            self.start_app()
            time.sleep(3)
        
        webbrowser.open(f"{self.app_url}/scanner")
    
    def show_status(self, icon, item):
        """Mostra lo stato dell'applicazione"""
        if self.running and self.process and self.process.poll() is None:
            is_healthy = self.check_app_health()
            if is_healthy:
                status = "✅ In esecuzione e raggiungibile"
            else:
                status = "⚠️ In esecuzione ma non raggiungibile"
            
            pid = self.process.pid
            icon.notify(f"{status}\nPID: {pid}\nURL: {self.app_url}", "Stato GymProject")
        else:
            icon.notify("❌ App non in esecuzione", "Stato GymProject")
    
    def quit_app(self, icon, item):
        """Chiude tutto e esce"""
        icon.notify("Chiusura applicazione...", "GymProject")
        self.stop_app()
        icon.stop()
    
    def create_menu(self):
        """Crea il menu contestuale della tray"""
        return pystray.Menu(
            pystray.MenuItem("Apri App", self.open_browser, default=True),
            pystray.MenuItem("Apri Scanner", self.open_scanner),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Riavvia App", self.restart_app),
            pystray.MenuItem("Stato", self.show_status),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Esci e Chiudi App", self.quit_app)
        )
    
    def update_icon(self):
        """Aggiorna l'icona in base allo stato"""
        if not self.icon:
            return
        
        if self.running and self.process and self.process.poll() is None:
            is_healthy = self.check_app_health()
            if is_healthy:
                color = "green"
                tooltip = "GymProject - In esecuzione"
            else:
                color = "orange"
                tooltip = "GymProject - Avvio in corso..."
        else:
            color = "red"
            tooltip = "GymProject - Spento"
        
        self.icon.icon = self.create_icon_image(color)
        self.icon.title = tooltip
    
    def monitor_app(self):
        """Thread che monitora lo stato e aggiorna l'icona"""
        while self.icon and self.icon.visible:
            # Controlla se il processo è morto
            if self.running and self.process and self.process.poll() is not None:
                self.running = False
                if self.icon:
                    self.icon.notify("App arrestata inaspettatamente", "GymProject")
            
            self.update_icon()
            time.sleep(5)
    
    def run(self):
        """Avvia l'applicazione tray"""
        # Avvia automaticamente l'app
        print("Avvio GymProject frontend...")
        self.start_app()
        
        # Apri automaticamente il browser
        time.sleep(3)
        if self.check_app_health():
            webbrowser.open(self.app_url)
        
        # Crea icona tray
        image = self.create_icon_image("blue")
        
        self.icon = pystray.Icon(
            "gymproject",
            image,
            "GymProject - Caricamento...",
            menu=self.create_menu()
        )
        
        # Avvia thread di monitoraggio
        monitor_thread = threading.Thread(target=self.monitor_app, daemon=True)
        monitor_thread.start()
        
        # Aggiorna icona iniziale
        time.sleep(2)
        self.update_icon()
        
        # Avvia l'icona (blocca fino a quit)
        self.icon.run()
        
        # Cleanup quando l'app viene chiusa
        self.stop_app()


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════╗
║        GymProject Frontend Tray          ║
║  Gestione app con icona nella tray       ║
╚══════════════════════════════════════════╝
""")
    
    app = GymAppTray()
    
    try:
        app.run()
    except KeyboardInterrupt:
        print("\nChiusura in corso...")
        app.stop_app()
    except Exception as e:
        print(f"Errore: {e}")
        app.stop_app()
