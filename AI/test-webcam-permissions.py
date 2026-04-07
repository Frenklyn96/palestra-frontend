"""
Test Permessi Webcam - Diagnostica Privacy Windows
Verifica se Python ha i permessi per accedere alla webcam
"""
import cv2
import sys
import platform

print("=" * 70)
print("  TEST PERMESSI WEBCAM - Windows Privacy Check")
print("=" * 70)
print()
print(f"Sistema Operativo: {platform.system()} {platform.release()}")
print(f"Python: {sys.version}")
print()

# Test accesso webcam 0
print("Test 1: Tentativo apertura Webcam 0...")
print("-" * 70)

try:
    print("  Apertura con cv2.VideoCapture(0)...")
    cap = cv2.VideoCapture(0)
    
    if cap.isOpened():
        print("  ✅ VideoCapture.isOpened() = True")
        
        # Prova a leggere un frame
        print("  Tentativo lettura frame...")
        ret, frame = cap.read()
        
        if ret:
            height, width, channels = frame.shape
            print(f"  ✅ Frame letto con successo!")
            print(f"     Risoluzione: {width}x{height}")
            print(f"     Canali: {channels}")
            print()
            print("  🎉 SUCCESSO - Python HA accesso alla webcam!")
            print()
            print("  La webcam funziona. Il problema potrebbe essere:")
            print("  - Conflitto con altra istanza Python già in esecuzione")
            print("  - Webcam già aperta in background")
        else:
            print("  ❌ Frame NON letto (ret=False)")
            print()
            print("  DIAGNOSI: VideoCapture si apre ma non legge frame")
            print()
            print("  Possibili cause:")
            print("  1. Webcam hardware disconnessa")
            print("  2. Driver webcam danneggiato")
            print("  3. Windows Privacy blocca l'accesso")
            print()
            print("  SOLUZIONE:")
            print("  - Apri Impostazioni Windows")
            print("  - Vai su Privacy e sicurezza > Fotocamera")
            print("  - Abilita 'Consenti alle app desktop di accedere alla fotocamera'")
        
        cap.release()
    else:
        print("  ❌ VideoCapture.isOpened() = False")
        print()
        print("  DIAGNOSI: Impossibile aprire la webcam")
        print()
        print("  Possibili cause:")
        print("  1. Webcam non rilevata dal sistema")
        print("  2. Driver webcam non installati")
        print("  3. Windows Privacy BLOCCA l'accesso")
        print()
        print("  SOLUZIONE:")
        print("  1. Verifica Gestione Dispositivi (devmgmt.msc)")
        print("     - Cerca 'Fotocamere' o 'Imaging devices'")
        print("     - Controlla se la webcam è presente senza errori")
        print()
        print("  2. Abilita accesso webcam in Windows:")
        print("     - Apri Impostazioni Windows (Win + I)")
        print("     - Vai su: Privacy e sicurezza > Fotocamera")
        print("     - Abilita: 'Accesso alla fotocamera'")
        print("     - Abilita: 'Consenti alle app di accedere alla fotocamera'")
        print("     - Abilita: 'Consenti alle app desktop di accedere alla fotocamera'")
        print()
        print("  3. Riavvia il PC dopo aver modificato le impostazioni")

except Exception as e:
    print(f"  ❌ ERRORE: {e}")
    print()
    print(f"  Tipo errore: {type(e).__name__}")
    print()
    print("  Possibile problema di permessi o driver mancanti")

print()
print("=" * 70)

# Test anche con altri backend
print()
print("Test 2: Prova con DirectShow (Windows)...")
print("-" * 70)

try:
    cap_dshow = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if cap_dshow.isOpened():
        ret, frame = cap_dshow.read()
        if ret:
            print("  ✅ DirectShow: FUNZIONA")
        else:
            print("  ⚠️ DirectShow: Si apre ma non legge frame")
        cap_dshow.release()
    else:
        print("  ❌ DirectShow: Non si apre")
except Exception as e:
    print(f"  ❌ DirectShow: Errore - {e}")

print()
print("=" * 70)
print()
input("Premi INVIO per chiudere...")
