# 🎯 GymProject - Installer AI Service

Questo pacchetto contiene tutto il necessario per installare e configurare il servizio AI di conteggio persone.

## 📦 Contenuto

- **Setup-GymProject.bat** - Script di installazione principale (CLICCA QUI!)
- **installer/** - File del servizio AI (Python, YOLO, dipendenze)
- **launcher/** - Gestore system tray per controllo servizio
- **test-webcam.bat** - Test rapido della webcam
- **README-SETUP.md** - Documentazione completa
- **TROUBLESHOOTING-WEBCAM.md** - Risoluzione problemi webcam

## 🚀 Installazione Rapida

1. **Estrai lo zip** in una cartella a tua scelta
2. **Fai doppio click** su `Setup-GymProject.bat`
3. Segui le istruzioni a schermo
4. Al termine, troverai l'icona "GymProject AI" sul desktop

## ⚙️ Requisiti

- **Windows** 10/11
- **Python 3.11** (verrà installato automaticamente se mancante)
- **Webcam** (integrata o USB)
- **5 GB** di spazio libero su disco

## 🎥 Funzionalità

Il servizio AI:

- ✅ Conta automaticamente le persone tramite webcam
- ✅ Si avvia automaticamente all'accesso Windows (opzionale)
- ✅ Gestione tramite icona nella system tray
- ✅ Visualizzazione stream video in tempo reale
- ✅ Selezione webcam multipla dal frontend

## 📞 Supporto

In caso di problemi:

1. Leggi **TROUBLESHOOTING-WEBCAM.md**
2. Esegui **test-webcam.bat** per verificare la webcam
3. Controlla i log in: `%USERPROFILE%\OneDrive - EY\Pictures\GymProject AI\runtime\`

## 🔧 Configurazione Avanzata

Per configurazioni avanzate, modifica il file:

```
installer\install-ai-service.ps1
```

Parametri disponibili:

- `VideoSource` - Indice webcam (0, 1, 2...)
- `DataDir` - Cartella dati personalizzata

## 🌐 Connessione al Frontend

Dopo l'installazione, il servizio sarà disponibile su:

- **API**: http://localhost:8001
- **Video Stream**: http://localhost:8001/video_feed
- **WebSocket**: ws://localhost:8001/ws

Il frontend GymProject si connette automaticamente a questi endpoint.

---

**Versione**: 1.0.0  
**Data**: Aprile 2026  
**Prerequisiti**: Python 3.11, Windows 10/11
