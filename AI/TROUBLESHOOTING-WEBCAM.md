# 🔒 Risoluzione Permessi Webcam - Windows Privacy

## ❌ Problema: "Webcam in use or disconnected"

Se vedi sempre questo messaggio anche dopo riavvio, il problema è probabilmente **Windows Privacy** che blocca l'accesso alla webcam per le applicazioni desktop.

---

## ✅ SOLUZIONE: Abilita Accesso Webcam

### Metodo 1: Impostazioni Windows (Consigliato)

1. **Apri Impostazioni Windows**
   - Premi `Win + I`
   - Oppure: Start → ⚙️ Impostazioni

2. **Vai su Privacy e Sicurezza**
   - Nel menu a sinistra, clicca su **"Privacy e sicurezza"**

3. **Apri Fotocamera**
   - Scorri fino a "Autorizzazioni app"
   - Clicca su **"Fotocamera"**

4. **Abilita tutte le opzioni:**
   - ✅ **"Accesso alla fotocamera"** → ON
   - ✅ **"Consenti alle app di accedere alla fotocamera"** → ON
   - ✅ **"Consenti alle app desktop di accedere alla fotocamera"** → ON ⚠️ IMPORTANTE!

5. **Riavvia il servizio AI**
   - Ferma il servizio dal tray icon
   - Riavvia con Setup-GymProject.bat

---

### Metodo 2: Prompt dei Comandi (Veloce)

Apri **PowerShell come Amministratore** e esegui:

```powershell
# Abilita accesso fotocamera per app desktop
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" /v Value /t REG_SZ /d Allow /f

# Riavvia il servizio di acquisizione immagini
Restart-Service -Name "FrameServer" -Force
```

Poi riavvia il PC.

---

## 🔍 Test Diagnostico

**Esegui questo test PRIMA di modificare le impostazioni:**

```
Doppio click: AI/test-permissions.bat
```

Lo script ti dirà **esattamente qual è il problema**:

- ✅ Permessi OK → problema diverso
- ❌ Permessi bloccati → segui la guida sopra
- ⚠️ Driver mancanti → reinstalla driver webcam

---

## 🔧 Altre Verifiche

### 1. Verifica Gestione Dispositivi

1. Premi `Win + X` → **Gestione dispositivi**
2. Espandi **"Fotocamere"** (o "Imaging devices")
3. Verifica che la webcam sia presente senza icone di errore (⚠️ ❗)
4. Se vedi errori:
   - Click destro → **"Disinstalla dispositivo"**
   - Riavvia PC → Windows reinstallerà driver automaticamente

### 2. Verifica App in Background

Anche dopo riavvio, alcune app potrebbero autoavviarsi e usare la webcam:

- **Microsoft Teams** - Verifica impostazioni → Disabilita "Avvia automaticamente"
- **Zoom** - Preferenze → Generale → Deseleziona "Avvia Zoom all'accesso"
- **Skype** - Impostazioni → Generali → Disabilita avvio automatico
- **Discord** - Impostazioni → Comportamento → Disabilita "Apri Discord"

### 3. Task Manager - Webcam in Uso

1. Apri Task Manager (`Ctrl + Shift + Esc`)
2. Vai su **"Prestazioni"**
3. Cerca indicatori webcam attiva (dipende da Windows 11)
4. Oppure vai su **"Dettagli"** → ordina per CPU → cerca processi sospetti

---

## 📋 Checklist Completa

Prima di contattare supporto, verifica:

- [ ] Riavviato PC
- [ ] Nessuna app usa webcam (Teams, Zoom, Discord chiusi)
- [ ] Eseguito `test-permissions.bat` e letto risultati
- [ ] Impostazioni Privacy → Fotocamera → Tutte le opzioni ON
- [ ] Gestione Dispositivi → Fotocamera presente senza errori
- [ ] Provato sia webcam 0 che webcam 1
- [ ] Servizio AI fermato e riavviato

---

## 🎯 Dopo Aver Sistemato i Permessi

1. **Riavvia il PC** (importante!)
2. **Esegui di nuovo**: `AI/test-permissions.bat`
3. **Dovresti vedere**: "✅ SUCCESSO - Python HA accesso alla webcam!"
4. **Avvia servizio AI**: `AI/Setup-GymProject.bat`
5. **Controlla video stream**: `http://localhost:8001/video_feed`

---

## ❓ FAQ

**Q: Ho abilitato tutto ma ancora non funziona**  
A: Riavvia il PC - Windows cache le impostazioni privacy

**Q: Funziona con app Microsoft Camera ma non con Python**  
A: Windows Store apps hanno permessi separati dalle desktop apps

**Q: "Consenti alle app desktop..." è disattivato e non posso abilitarlo**  
A: Abilita prima "Accesso alla fotocamera" principale, poi riprova

**Q: La webcam si accende (LED) ma non vedo video**  
A: Driver webcam danneggiato - reinstalla da Gestione Dispositivi

---

**Ultima modifica:** 7 Aprile 2026
