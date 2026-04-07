# 🤖 GymProject - Servizio AI People Counter

## ⚡ AVVIO RAPIDO

### Una sola cosa da fare:

**Doppio click su:** `AI/Setup-GymProject.bat`

Questo script fa TUTTO automaticamente:

- ✅ Verifica Python 3.11
- ✅ Prepara script servizio AI
- ✅ Crea icona "GymProject AI" sul desktop
- ✅ Avvia tray manager che gestisce il servizio AI

**Il tray manager controlla e avvia automaticamente il servizio AI se necessario.**

---

## 📱 Gestione Servizio

### Menu Icona Tray

Click destro sull'icona "AI" nella tray:

| Comando                      | Descrizione                           |
| ---------------------------- | ------------------------------------- |
| **Avvia Servizio AI**        | Avvia il servizio                     |
| **Ferma Servizio AI**        | Ferma il servizio                     |
| **Stato Servizio**           | Mostra stato e PID                    |
| **Apri Video Stream**        | Apre http://localhost:8001/video_feed |
| **Apri Pagina Scanner**      | Apre scanner nel frontend             |
| **Esci (servizio continua)** | Chiude solo icona tray                |
| **Esci e Ferma Servizio**    | Ferma servizio e chiude icona         |

### Colori Icona

- 🟢 **Verde** = Servizio attivo e funzionante
- 🟠 **Arancio** = In avvio o errore
- 🔴 **Rosso** = Spento

---

## 🖥️ Frontend React (Interfaccia Web)

Il servizio AI è il backend. Per l'interfaccia web:

```powershell
cd palestra-frontend
npm run dev
```

Apri: **http://localhost:5173**

---

## ⚙️ Configurazioni

### Cambia Telecamera

Modifica `AI/Setup-GymProject.ps1`, cambia il parametro VideoSource:

- `"0"` = Webcam integrata (default)
- `"1"` = Seconda webcam
- `"rtsp://192.168.1.100:554/stream"` = IP camera

### Avvio Automatico Windows

```
Doppio click: AI/installer/installa-avvio-automatico.bat
```

Il servizio si avvierà automaticamente all'accesso Windows.

---

## 🔗 Endpoint Servizio AI

Quando il servizio è attivo (icona verde):

- **Health:** http://localhost:8001/api/health
- **Video Stream:** http://localhost:8001/video_feed
- **WebSocket:** ws://localhost:8001/ws
- **API Docs:** http://localhost:8001/docs

### API REST

```
GET  /api/count      - Ottieni conteggio persone
POST /api/decrement  - Decrementa contatore (persona uscita)
POST /api/reset      - Reset contatore
```

---

## 🐛 Risoluzione Problemi

### ⚠️ Webcam si accende e spegne subito

Se vedi il messaggio **"webcam in use or disconnected"**:

**1. Testa la webcam:**

```powershell
cd AI
python test-webcam.py
```

Questo script testa tutti i backend OpenCV e identifica quale funziona.

**2. Chiudi app che usano la webcam:**

- Microsoft Teams / Zoom / Skype / Discord
- OBS Studio o software di streaming
- Browser con tab aperte su videochiamate
- Altre app di videoconferenza

**3. Verifica Gestione Dispositivi:**

- Apri `devmgmt.msc`
- Vai su **Fotocamere** (o **Imaging Devices**)
- Verifica che la webcam sia presente senza errori (⚠️ o ❗)

**4. Prova seconda camera:**

Modifica `AI/Setup-GymProject.ps1`, cambia VideoSource da `"0"` a `"1"`:

```powershell
param(
    [string]$VideoSource = "1"  # Seconda webcam
)
```

**5. Riavvia il servizio:**

Click destro icona tray → **Ferma Servizio AI** → **Avvia Servizio AI**

---

### Servizio non si avvia

Controlla i log:

```
%USERPROFILE%\Pictures\GymProject AI\runtime\ai-service.log
%USERPROFILE%\Pictures\GymProject AI\runtime\ai-service.error.log
```

Oppure avvia manualmente:

```powershell
cd AI/installer
.\install-ai-service.ps1 -Action start
```

### Icona tray non appare

1. Controlla area icone nascoste (freccia su nella tray)
2. Verifica Python 3.11: `py -3.11 --version`
3. Installa dipendenze: `pip install pystray pillow requests`

### Python mancante

Lo script installerà Python 3.11 automaticamente.
Oppure scarica: https://www.python.org/downloads/

---

## 📁 Struttura Cartella AI

```
AI/
├── Setup-GymProject.bat        ⭐ DOPPIO CLICK QUI
├── Setup-GymProject.ps1
├── README-SETUP.md             📚 Questa guida
│
├── installer/
│   ├── install-ai-service.ps1  # Gestione servizio
│   ├── installa-avvio-automatico.bat
│   └── ai-service/             # Codice servizio Python
│
└── launcher/
    └── gym-app-tray.py         # Tray manager
```

---

## 💡 Comandi Manuali (Opzionali)

```powershell
cd AI/installer

# Controlla stato
.\install-ai-service.ps1 -Action status

# Ferma servizio
.\install-ai-service.ps1 -Action stop

# Avvia servizio
.\install-ai-service.ps1 -Action start

# Installa avvio automatico
.\install-ai-service.ps1 -Action install-autostart

# Rimuovi avvio automatico
.\install-ai-service.ps1 -Action uninstall-autostart
```

---

## 📋 Requisiti

- **Windows 10/11**
- **Python 3.11+** (installato automaticamente)
- **Webcam o IP Camera**
- **Node.js 18+** (solo per frontend)

Questo script fa TUTTO automaticamente:

1. ✅ Verifica Python 3.11
2. ✅ Avvia servizio AI (porta 8001)
3. ✅ Crea icona "GymProject AI Service" sul desktop
4. ✅ Avvia tray manager (icona "AI" nella tray)

---

## 📱 Gestione Quotidiana

### Avvio Servizio AI

**Metodo 1 (Raccomandato):**

- Doppio click su `Setup-GymProject.bat`

**Metodo 2:**

- Doppio click sull'icona "GymProject AI Service" sul desktop

### Menu Icona Tray

Click destro sull'icona "AI" nella tray:

- **Avvia Servizio AI** - Start servizio
- **Ferma Servizio AI** - Stop servizio
- **Stato Servizio** - Info su stato/PID
- **Apri Video Stream** - Apre http://localhost:8001/video_feed
- **Apri Pagina Scanner** - Apre scanner nel frontend
- **Esci (servizio continua)** - Chiude solo icona
- **Esci e Ferma Servizio** - Chiude tutto

### Colori Icona Tray

- 🟢 **Verde** = Servizio attivo
- 🟠 **Arancio** = In avvio/errore
- 🔴 **Rosso** = Spento

---

## 🖥️ Avvio Frontend React

Il servizio AI è solo il backend. Per l'interfaccia web:

```powershell
cd palestra-frontend
npm run dev
```

Poi apri: http://localhost:5173

---

## 🔄 Avvio Automatico Windows (Opzionale)

Per avviare il servizio AI automaticamente all'accesso:

```
Doppio click: AI/installer/installa-avvio-automatico.bat
```

---

## 📁 Struttura Progetto

```
palestra-frontend/
├── Setup-GymProject.bat         ⭐ SCRIPT PRINCIPALE
├── Setup-GymProject.ps1
│
├── AI/
│   ├── installer/               # File installazione servizio
│   └── launcher/                # Script tray manager
│
├── src/                         # Codice frontend React
├── public/
└── package.json
```

---

## ⚙️ Configurazioni

### Cambia Telecamera

Modifica `Setup-GymProject.ps1` alla riga del parametro `VideoSource`:

- `"0"` = Webcam integrata (default)
- `"1"` = Seconda webcam
- `"rtsp://192.168.1.100:554/stream"` = IP camera

Oppure avvia manualmente:

```powershell
cd AI/installer
.\install-ai-service.ps1 -VideoSource "1"
```

---

## 🐛 Risoluzione Problemi

### Servizio AI non si avvia

1. Controlla i log:
   - `%USERPROFILE%\Pictures\GymProject AI\runtime\ai-service.log`
   - `%USERPROFILE%\Pictures\GymProject AI\runtime\ai-service.error.log`

2. Avvia manualmente:
   ```powershell
   cd AI/installer
   .\install-ai-service.ps1 -Action start
   ```

### Icona tray non appare

1. Controlla area icone nascoste (freccia su nella tray)
2. Verifica Python: `py -3.11 --version`
3. Installa dipendenze: `pip install pystray pillow requests`

### Python 3.11 mancante

Lo script installerà Python 3.11 automaticamente al primo avvio.
Oppure scarica manualmente: https://www.python.org/downloads/

---

## 📊 Endpoint Servizio AI

Dopo l'avvio:

- Health: http://localhost:8001/api/health
- Video: http://localhost:8001/video_feed
- WebSocket: ws://localhost:8001/ws
- API Docs: http://localhost:8001/docs

---

## 💡 Tips

- Il servizio AI può rimanere attivo 24/7
- L'icona tray può essere chiusa lasciando il servizio attivo
- Il frontend deve essere avviato separatamente
- Usa l'avvio automatico per non doverlo riavviare ogni volta

---

## 📞 Comandi Utili

```powershell
# Controlla stato servizio
cd AI/installer
.\install-ai-service.ps1 -Action status

# Ferma servizio
.\install-ai-service.ps1 -Action stop

# Riavvia servizio
.\install-ai-service.ps1 -Action start

# Installa avvio automatico
.\install-ai-service.ps1 -Action install-autostart

# Rimuovi avvio automatico
.\install-ai-service.ps1 -Action uninstall-autostart
```
