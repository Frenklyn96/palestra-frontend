/**
 * KEYBOARD HOOK MANAGER
 *
 * Gestisce l'intercettazione globale degli input da tastiera per rilevare
 * le scansioni QR provenienti da scanner fisici (HID devices).
 *
 * Funzionalità:
 * - Hook OS-level con iohook-napi
 * - Buffer intelligente per accumulo caratteri
 * - Riconoscimento pattern scanner vs input umano
 * - Gestione multi-platform (Windows, macOS, Linux)
 * - Deduplica scansioni consecutive
 */

const { fork } = require("child_process");
const path = require("path");
const logger = require("./utils/logger");

class KeyboardHookManager {
  constructor(options = {}) {
    this.options = {
      // Callback quando un QR viene scansionato
      onQrScanned: options.onQrScanned || (() => {}),

      // Callback per errori
      onError: options.onError || (() => {}),

      // Timeout massimo tra caratteri per considerarlo scanner (ms)
      // Scanner tipicamente < 20ms, umani > 100ms
      charTimeout: options.charTimeout || 100,

      // Lunghezza minima codice QR
      minLength: options.minLength || 3,

      // Lunghezza massima codice QR
      maxLength: options.maxLength || 1000,

      // Previeni scansioni duplicate entro questo intervallo (ms)
      duplicateThreshold: options.duplicateThreshold || 2000,
    };

    // Stato interno
    this.buffer = "";
    this.lastKeyTime = 0;
    this.lastScannedCode = null;
    this.lastScannedTime = 0;
    this.isRunning = false;
    this.isPaused = false;

    // Timer per reset buffer
    this.bufferResetTimer = null;

    // Child process che ospita uiohook-napi in isolamento
    this.workerProcess = null;

    // Platform detection
    this.platform = process.platform;

    logger.info("KeyboardHookManager initialized", { platform: this.platform });
  }

  /**
   * Avvia l'intercettazione globale degli input.
   * uiohook-napi gira in un child process separato: se crasha nativamente
   * (access violation, SIGSEGV) muore solo il worker, non Electron.
   */
  async start() {
    if (this.isRunning) {
      logger.warn("Keyboard hook already running");
      return;
    }

    logger.info("Starting keyboard hook worker...");

    await new Promise((resolve) => {
      const workerPath = path.join(__dirname, "keyboardHookWorker.js");

      try {
        this.workerProcess = fork(workerPath, [], {
          stdio: ["ignore", "ignore", "ignore", "ipc"],
        });
      } catch (err) {
        logger.error("Failed to fork keyboard hook worker:", err.message);
        resolve();
        return;
      }

      const startupTimeout = setTimeout(() => {
        logger.warn("Keyboard hook worker startup timeout — scanner disabilitato.");
        resolve();
      }, 5000);

      this.workerProcess.on("message", (msg) => {
        if (!msg) return;

        if (msg.type === "ready") {
          clearTimeout(startupTimeout);
          this.isRunning = true;
          logger.info("Keyboard hook worker ready");
          resolve();
        } else if (msg.type === "unavailable" || msg.type === "error") {
          clearTimeout(startupTimeout);
          logger.warn("Keyboard hook worker non disponibile:", msg.message || "");
          resolve();
        } else if (msg.type === "keydown") {
          this.handleKeyDown({
            keycode: msg.keycode,
            rawcode: msg.rawcode,
            shiftKey: msg.shiftKey,
          });
        }
      });

      this.workerProcess.on("exit", (code, signal) => {
        logger.warn(`Keyboard hook worker uscito (code=${code}, signal=${signal})`);
        this.isRunning = false;
        this.workerProcess = null;
        clearTimeout(startupTimeout);
        resolve();
      });

      this.workerProcess.on("error", (err) => {
        logger.error("Keyboard hook worker error:", err.message);
        clearTimeout(startupTimeout);
        resolve();
      });
    });
  }

  /**
   * Ferma l'intercettazione
   */
  async stop() {
    if (!this.isRunning && !this.workerProcess) {
      logger.warn("Keyboard hook not running");
      return;
    }

    logger.info("Stopping keyboard hook worker...");

    try {
      if (this.workerProcess) {
        // Manda comando stop al worker
        try { this.workerProcess.send({ type: "stop" }); } catch (_) {}

        // Attendi max 3 secondi per uscita pulita, poi forza kill
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            try { if (this.workerProcess) this.workerProcess.kill("SIGKILL"); } catch (_) {}
            this.workerProcess = null;
            resolve();
          }, 3000);
          if (this.workerProcess) {
            this.workerProcess.once("exit", () => {
              clearTimeout(timeout);
              this.workerProcess = null;
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      this.isRunning = false;
      this.buffer = "";

      if (this.bufferResetTimer) {
        clearTimeout(this.bufferResetTimer);
        this.bufferResetTimer = null;
      }

      logger.info("Keyboard hook stopped successfully");
    } catch (error) {
      logger.error("Error stopping keyboard hook:", error);
      this.options.onError(error);
    }
  }

  /**
   * Mette in pausa il riconoscimento (hook resta attivo ma ignora input)
   */
  pause() {
    logger.info("Pausing keyboard hook");
    this.isPaused = true;
    this.buffer = "";
  }

  /**
   * Riprende il riconoscimento
   */
  resume() {
    logger.info("Resuming keyboard hook");
    this.isPaused = false;
  }

  /**
   * Verifica se l'hook è attivo
   */
  isActive() {
    return this.isRunning && !this.isPaused;
  }

  /**
   * Handler per eventi keypress (caratteri stampabili)
   */
  handleKeyPress(event) {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    try {
      const now = Date.now();
      const timeDelta = now - this.lastKeyTime;

      // Se passa troppo tempo tra i caratteri, resetta il buffer
      // Scanner è veloce (<20ms/char), umano è lento (>100ms/char)
      if (timeDelta > this.options.charTimeout && this.buffer.length > 0) {
        logger.debug("Buffer timeout, resetting", {
          timeDelta,
          bufferLength: this.buffer.length,
        });
        this.buffer = "";
      }

      // Estrai carattere
      const char = String.fromCharCode(event.keychar);

      // Aggiungi al buffer
      this.buffer += char;
      this.lastKeyTime = now;

      // Debug logging (solo in dev)
      if (process.env.NODE_ENV === "development") {
        logger.debug("Key pressed", {
          char,
          bufferLength: this.buffer.length,
          timeDelta,
        });
      }

      // Previeni buffer overflow
      if (this.buffer.length > this.options.maxLength) {
        logger.warn("Buffer overflow, resetting", {
          bufferLength: this.buffer.length,
        });
        this.buffer = "";
      }

      // Imposta auto-reset del buffer
      if (this.bufferResetTimer) {
        clearTimeout(this.bufferResetTimer);
      }

      this.bufferResetTimer = setTimeout(() => {
        if (this.buffer.length > 0) {
          logger.debug("Auto-reset buffer after timeout");
          this.buffer = "";
        }
      }, this.options.charTimeout * 2);
    } catch (error) {
      logger.error("Error in keypress handler:", error);
      this.options.onError(error);
    }
  }

  /**
   * Converte Windows Virtual Key code in carattere stampabile.
   * Restituisce null per tasti non stampabili.
   */
  vkToChar(rawcode, shiftKey) {
    // Digits 0-9 (VK 0x30-0x39)
    if (rawcode >= 48 && rawcode <= 57) return String.fromCharCode(rawcode);
    // Letters A-Z (VK 0x41-0x5A)
    if (rawcode >= 65 && rawcode <= 90) {
      return shiftKey
        ? String.fromCharCode(rawcode)
        : String.fromCharCode(rawcode + 32);
    }
    // Hyphen/minus (VK_OEM_MINUS = 189)
    if (rawcode === 189) return shiftKey ? "_" : "-";
    // Apostrophe (VK_OEM_7 = 222) — scanner lo emette al posto di "-" su layout italiano
    if (rawcode === 222) return shiftKey ? '"' : "'";
    // Period (VK_OEM_PERIOD = 190)
    if (rawcode === 190) return shiftKey ? ">" : ".";
    // Forward slash (VK_OEM_2 = 191)
    if (rawcode === 191) return shiftKey ? "?" : "/";
    // Space
    if (rawcode === 32) return " ";
    return null;
  }

  /**
   * Handler per eventi keydown — gestisce sia i caratteri stampabili
   * che i tasti speciali (ENTER).
   * uiohook-napi NON emette 'keypress', quindi tutto passa da qui.
   */
  handleKeyDown(event) {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    try {
      // ENTER key: keycode 28 (uiohook scan code) o rawcode 13 (VK_RETURN)
      if (event.keycode === 28 || event.rawcode === 13) {
        this.onEnterPressed();
        return;
      }

      // Estrai carattere stampabile dal rawcode (Windows VK)
      const char = this.vkToChar(event.rawcode, event.shiftKey);
      if (char !== null) {
        // Delega al handler keypress esistente passando un evento sintetico
        this.handleKeyPress({ keychar: char.charCodeAt(0) });
      }
    } catch (error) {
      logger.error("Error in keydown handler:", error);
      this.options.onError(error);
    }
  }

  /**
   * Gestisce la pressione del tasto ENTER (fine scansione)
   */
  onEnterPressed() {
    // Ignora ENTER se buffer vuoto
    if (!this.buffer || this.buffer.trim().length === 0) {
      logger.debug("Enter pressed but buffer empty, ignoring");
      return;
    }

    const rawCode = this.buffer.trim();

    // Valida lunghezza
    if (rawCode.length < this.options.minLength) {
      logger.debug("Code too short, ignoring", {
        length: rawCode.length,
        minLength: this.options.minLength,
      });
      this.buffer = "";
      return;
    }

    // Normalizza il codice
    // Gli scanner QR a volte inseriscono apici per via del layout tastiera
    const normalizedCode = this.normalizeQrCode(rawCode);

    logger.info("QR Code detected", {
      raw: rawCode,
      normalized: normalizedCode,
      length: normalizedCode.length,
    });

    // Previeni duplicati
    const now = Date.now();
    if (
      this.lastScannedCode === normalizedCode &&
      now - this.lastScannedTime < this.options.duplicateThreshold
    ) {
      logger.debug("Duplicate scan detected, ignoring", {
        code: normalizedCode,
        timeSinceLastScan: now - this.lastScannedTime,
      });
      this.buffer = "";
      return;
    }

    // Aggiorna tracking duplicati
    this.lastScannedCode = normalizedCode;
    this.lastScannedTime = now;

    // Pulisci buffer
    this.buffer = "";
    if (this.bufferResetTimer) {
      clearTimeout(this.bufferResetTimer);
      this.bufferResetTimer = null;
    }

    // Callback con dati QR
    const qrData = {
      code: normalizedCode,
      timestamp: new Date().toISOString(),
      timestampMs: now,
      source: "scanner-device",
      platform: this.platform,
      raw: rawCode !== normalizedCode ? rawCode : undefined,
    };

    try {
      this.options.onQrScanned(qrData);
    } catch (error) {
      logger.error("Error in onQrScanned callback:", error);
      this.options.onError(error);
    }
  }

  /**
   * Normalizza il codice QR rimuovendo caratteri indesiderati
   */
  normalizeQrCode(code) {
    // Rimuovi apici singoli (problema layout tastiera scanner)
    let normalized = code.replace(/'/g, "-");

    // Rimuovi spazi
    normalized = normalized.trim();

    // Altri caratteri speciali da normalizzare se necessario
    // Aggiungi qui altre trasformazioni specifiche dei tuoi scanner

    return normalized;
  }

  /**
   * Ottieni statistiche correnti
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      platform: this.platform,
      currentBufferLength: this.buffer.length,
      lastScannedCode: this.lastScannedCode,
      lastScannedTime: this.lastScannedTime
        ? new Date(this.lastScannedTime).toISOString()
        : null,
      config: {
        charTimeout: this.options.charTimeout,
        minLength: this.options.minLength,
        maxLength: this.options.maxLength,
        duplicateThreshold: this.options.duplicateThreshold,
      },
    };
  }
}

module.exports = KeyboardHookManager;
