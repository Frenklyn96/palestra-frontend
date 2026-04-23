/**
 * PRELOAD SCRIPT
 *
 * Bridge sicuro tra Main Process e Renderer Process
 * Espone solo le API necessarie tramite contextBridge
 *
 * Context Isolation: ENABLED
 * Node Integration: DISABLED
 * Sandbox: ENABLED
 */

const { contextBridge, ipcRenderer } = require("electron");

/**
 * Valida che il canale IPC sia nella whitelist
 */
const validChannels = {
  // Canali dal Main al Renderer (receive)
  receive: [
    "qr-scanned",
    "qr-processed",
    "python-service-status",
    "scanner-status-changed",
    "oauth-callback",
    "electron-auth-success",
  ],

  // Canali dal Renderer al Main (invoke)
  invoke: [
    "get-app-version",
    "get-scanner-status",
    "get-python-service-status",
    "toggle-scanner",
    "simulate-qr-scan",
    "get-store-value",
    "set-store-value",
    "open-auth-browser",
  ],
};

/**
 * Verifica che un canale sia valido
 */
function isValidChannel(channel, direction) {
  return validChannels[direction].includes(channel);
}

/**
 * API Electron esposte al Renderer
 */
const electronAPI = {
  /**
   * Informazioni sull'ambiente Electron
   */
  isElectron: true,
  platform: process.platform,

  /**
   * Ascolta eventi QR scansionati
   * @param {Function} callback - Callback da invocare quando un QR viene scansionato
   * @returns {Function} - Funzione per rimuovere il listener
   */
  onQrScanned: (callback) => {
    const channel = "qr-scanned";

    if (!isValidChannel(channel, "receive")) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    const subscription = (event, data) => {
      // Valida i dati prima di passarli al callback
      if (data && typeof data === "object" && data.code) {
        callback(data);
      } else {
        console.error("Invalid QR scan data received:", data);
      }
    };

    ipcRenderer.on(channel, subscription);

    // Ritorna funzione di cleanup
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * Ascolta cambio stato servizio Python
   * @param {Function} callback
   * @returns {Function} - Cleanup function
   */
  onPythonServiceStatus: (callback) => {
    const channel = "python-service-status";

    if (!isValidChannel(channel, "receive")) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    const subscription = (event, data) => {
      if (data && typeof data === "object") {
        callback(data);
      }
    };

    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * Ascolta cambio stato scanner
   * @param {Function} callback
   * @returns {Function} - Cleanup function
   */
  onScannerStatusChanged: (callback) => {
    const channel = "scanner-status-changed";

    if (!isValidChannel(channel, "receive")) {
      throw new Error(`Invalid channel: ${channel}`);
    }

    const subscription = (event, data) => {
      if (data && typeof data === "object") {
        callback(data);
      }
    };

    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  /**
   * Ottieni versione app
   * @returns {Promise<string>}
   */
  getAppVersion: () => {
    return ipcRenderer.invoke("get-app-version");
  },

  /**
   * Ottieni un valore dallo storage locale (recupera preferenze)
   * @param {string} key
   * @returns {Promise<any>}
   */
  getStoreValue: (key) => {
    return ipcRenderer.invoke("get-store-value", key);
  },

  /**
   * Salva un valore nello storage locale (salva preferenze)
   * @param {string} key
   * @param {any} value
   * @returns {Promise<boolean>}
   */
  setStoreValue: (key, value) => {
    return ipcRenderer.invoke("set-store-value", key, value);
  },

  /**
   * Ottieni stato scanner
   * @returns {Promise<{active: boolean, platform: string}>}
   */
  getScannerStatus: () => {
    return ipcRenderer.invoke("get-scanner-status");
  },

  /**
   * Ottieni stato servizio Python
   * @returns {Promise<{running: boolean, port: number}>}
   */
  getPythonServiceStatus: () => {
    return ipcRenderer.invoke("get-python-service-status");
  },

  /**
   * Attiva/disattiva scanner
   * @param {boolean} enable - true per attivare, false per disattivare
   * @returns {Promise<boolean>} - Nuovo stato
   */
  toggleScanner: (enable) => {
    if (typeof enable !== "boolean") {
      throw new Error("enable must be a boolean");
    }
    return ipcRenderer.invoke("toggle-scanner", enable);
  },

  /**
   * Simula una scansione QR (per testing)
   * @param {string} code - Codice da simulare
   * @returns {Promise<boolean>} - true se successo
   */
  simulateQrScan: (code) => {
    if (typeof code !== "string" || code.length === 0) {
      throw new Error("code must be a non-empty string");
    }
    return ipcRenderer.invoke("simulate-qr-scan", code);
  },

  /**
   * Ascolta risultati QR processing (chiamate BE già eseguite nel main process)
   * @param {Function} callback - Riceve { code, success, entrance, errorMessage, errorDetails, cliente, timestamp }
   * @returns {Function} - Cleanup function
   */
  onQrProcessed: (callback) => {
    const channel = "qr-processed";
    const subscription = (event, data) => {
      if (data && typeof data === "object") {
        callback(data);
      }
    };
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  /**
   * Apre il browser di sistema per autenticazione OAuth
   * @param {string} url - URL di autenticazione Clerk
   */
  openAuthBrowser: (url) => {
    return ipcRenderer.invoke("open-auth-browser", url);
  },

  /**
   * Ascolta OAuth callback (deep link gymproject://)
   * @param {Function} callback - Riceve l'URL del deep link
   * @returns {Function} - Cleanup function
   */
  onOAuthCallback: (callback) => {
    const channel = "oauth-callback";
    const subscription = (event, url) => {
      if (typeof url === "string") {
        callback(url);
      }
    };
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  /**
   * Ascolta il risultato dell'autenticazione via HTTP callback locale.
   * Riceve { userId, email, token } dopo che l'utente si è autenticato
   * sulla pagina web electron-auth.
   * @param {Function} callback
   * @returns {Function} - Cleanup function
   */
  onElectronAuthSuccess: (callback) => {
    const channel = "electron-auth-success";
    const subscription = (event, data) => {
      if (data && typeof data === "object" && data.userId) {
        callback(data);
      }
    };
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
};

/**
 * Esponi API al window object nel Renderer
 */
try {
  contextBridge.exposeInMainWorld("electronAPI", electronAPI);
  console.log("Electron API exposed successfully");
} catch (error) {
  console.error("Failed to expose Electron API:", error);
}

/**
 * Log di debug (solo in development)
 */
if (process.env.NODE_ENV === "development") {
  console.log("Preload script loaded", {
    platform: process.platform,
    versions: process.versions,
    contextIsolated: process.contextIsolated,
  });
}
