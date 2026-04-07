"""
Script di diagnostica per testare la webcam
Testa diversi backend OpenCV e verifica quale funziona
"""
import cv2
import sys

print("=" * 60)
print("  Test Webcam - Diagnostica OpenCV")
print("=" * 60)
print()

# Testa webcam 0
camera_index = 0
backends = [
    ("Auto-detect", None),
    ("MSMF (Media Foundation)", cv2.CAP_MSMF),
    ("DirectShow (DSHOW)", cv2.CAP_DSHOW),
]

print(f"Testing webcam index: {camera_index}")
print()

working_backend = None

for name, backend in backends:
    print(f"Tentativo: {name}...")
    
    try:
        if backend is None:
            cap = cv2.VideoCapture(camera_index)
        else:
            cap = cv2.VideoCapture(camera_index, backend)
        
        if cap.isOpened():
            # Prova a leggere un frame
            success, frame = cap.read()
            
            if success:
                height, width = frame.shape[:2]
                print(f"  ✅ SUCCESSO! Risoluzione: {width}x{height}")
                working_backend = name
                cap.release()
                break
            else:
                print(f"  ❌ Camera si apre ma non legge frame")
                cap.release()
        else:
            print(f"  ❌ Impossibile aprire camera")
    
    except Exception as e:
        print(f"  ❌ Errore: {e}")

print()
print("=" * 60)

if working_backend:
    print(f"✅ Webcam funzionante con: {working_backend}")
    print()
    print("Il servizio AI dovrebbe funzionare correttamente.")
else:
    print("❌ Nessun backend funzionante trovato!")
    print()
    print("Possibili cause:")
    print("  1. Webcam già in uso da altra app (Teams, Zoom, Skype, ecc.)")
    print("  2. Driver webcam non installati correttamente")
    print("  3. Webcam hardware disconnessa o difettosa")
    print()
    print("Soluzioni:")
    print("  1. Chiudi TUTTE le app che potrebbero usare la webcam")
    print("  2. Apri Gestione Dispositivi > Fotocamere e verifica")
    print("  3. Riavvia il PC")
    print("  4. Prova con webcam index 1: cambia VIDEO_SOURCE=1")

print("=" * 60)
print()
input("Premi INVIO per chiudere...")
