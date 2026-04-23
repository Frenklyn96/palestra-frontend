# 🎨 ASSET REQUIREMENTS - Electron Icons

Per building completo dell'app Electron, sono necessarie icone in vari formati.

## 📁 File Richiesti

```
electron/assets/
├── icon.png        # 512x512px o 1024x1024px (Linux, generico)
├── icon.ico        # Multi-size (16,32,48,64,128,256) Windows
├── icon.icns       # Multi-size macOS
└── tray-icon.png   # 16x16px o 32x32px (tray menu)
```

## 🛠️ Come Creare le Icone

### Opzione 1: Tool Online

1. Crea un'immagine PNG 1024x1024px del logo GymProject
2. Usa [iConvert Icons](https://iconverticons.com/online/)
3. Upload PNG e genera tutti i formati
4. Scarica e posiziona in `electron/assets/`

### Opzione 2: Tool Desktop

- **Windows**: [IcoFX](https://icofx.ro/)
- **macOS**: [Image2icon](https://img2icnsapp.com/)
- **Linux**: ImageMagick

  ```bash
  # ICO (Windows)
  convert icon.png -define icon:auto-resize=16,32,48,64,128,256 icon.ico

  # ICNS (macOS)
  mkdir icon.iconset
  sips -z 16 16   icon.png --out icon.iconset/icon_16x16.png
  sips -z 32 32   icon.png --out icon.iconset/icon_16x16@2x.png
  # ... (ripeti per tutte le dimensioni)
  iconutil -c icns icon.iconset
  ```

### Opzione 3: electron-icon-builder

```bash
npm install -g electron-icon-builder

# Genera tutte le icone da un PNG source
electron-icon-builder --input=./icon-source.png --output=./electron/assets/
```

## 📐 Specifiche Design

### Icon Principal (icon.png)

- **Size**: 1024x1024px
- **Formato**: PNG con trasparenza
- **Design**: Logo GymProject centrato, sfondo trasparente o solido
- **Padding**: 10% margin per evitare ritagli

### Tray Icon (tray-icon.png)

- **Size**: 32x32px (supporta 16x16 con @2x)
- **Formato**: PNG con trasparenza
- **Design**: Versione semplificata del logo, riconoscibile a piccole dimensioni
- **Colore**: Chiaro su scuro e scuro su chiaro (Windows adatta automaticamente)
- **Nota**: Evita dettagli troppo fini

## 🎨 Design Guidelines

### Colori Consigliati

Basati sul brand GymProject (adatta se necessario):

- Primario: `#1976d2` (blu Material Design)
- Secondario: `#dc004e` (rosso/rosa)
- Sfondo: Trasparente o bianco

### Elementi Visivi

Opzioni per il logo (scegli quello che rappresenta meglio GymProject):

1. **Lettera "G"** stilizzata
2. **Dumbbell icon** (bilanciere) + iniziale
3. **QR code** stilizzato (vista la funzione)
4. **Person counter** icon

### Mockup Rapido (Temporaneo)

Per testare subito, puoi usare placeholder:

```javascript
// In electron/main.js, temporaneamente:
icon: path.join(__dirname, "assets", "icon.png");
// Sostituisci con path a un'immagine PNG qualsiasi 512x512
```

## 🔄 Aggiornamento Icone

Dopo aver aggiunto/modificato icone:

1. Rebuild:

```bash
npm run electron:build
```

2. Test:

- Windows: Verifica icona in installer e .exe
- macOS: Verifica in .dmg e Applications
- Tray: Verifica tray icon in system tray

## 📦 Icone in Build

electron-builder cerca automaticamente icone in:

- `build/icon.{png,ico,icns}` (deprecated)
- `electron/assets/` (configurato in package.json)

Se mancano, usa fallback generico Electron (NON consigliato per produzione).

## ✅ Checklist

- [ ] icon.png creato (512x512 minimum)
- [ ] icon.ico generato (Windows)
- [ ] icon.icns generato (macOS)
- [ ] tray-icon.png creato (32x32)
- [ ] Testato build con tutte le icone
- [ ] Icone visualizzate correttamente in installer
- [ ] Tray icon visibile e riconoscibile

---

**Nota**: Se non hai tempo per creare icone custom ora, puoi procedere ugualmente. electron-builder userà icone default. Ricordati di aggiungerle prima della distribuzione finale!
