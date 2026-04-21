/**
 * ELECTRON MAIN PROCESS - GymProject Desktop App
 *
 * Responsabilità:
 * - Gestione finestra principale e tray icon
 * - Avvio automatico servizio Python AI
 * - Intercettazione globale scanner QR via keyboard hooks
 * - Comunicazione IPC con Renderer
 * - Lifecycle management
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const isDev = require("electron-is-dev");
const logger = require("./utils/logger");
const KeyboardHookManager = require("./keyboardHookManager");
const PythonServiceManager = require("./pythonServiceManager");

let store;

// Carica variabili d'ambiente dal file .env (safe fallback)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (error) {
  console.warn(
    "dotenv not available or .env file not found - using process.env defaults",
  );
}

// Helper per estrarre porta da URL
function extractPortFromUrl(url, defaultPort) {
  try {
    const urlObj = new URL(url);
    return urlObj.port || defaultPort;
  } catch {
    return defaultPort;
  }
}

// Helper per estrarre host da URL
function extractHostFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "localhost";
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.warn("Another instance is already running. Quitting...");
  app.quit();
} else {
  // Global references
  let mainWindow = null;
  let tray = null;
  let keyboardHookManager = null;
  let pythonServiceManager = null;

  // Configuration from environment variables
  const APP_CONFIG = {
    window: {
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
    },
    python: {
      // In development, usa il percorso relativo al progetto
      // In production, python sara embedded nell'installer
      scriptPath: isDev
        ? path.join(__dirname, "..", "AI", "ai-service", "app.py")
        : path.join(process.resourcesPath, "ai-service", "app.py"),
      pythonExecutable:
        isDev ||
        !require("fs").existsSync(
          path.join(process.resourcesPath, "python", "python.exe"),
        )
          ? "python" // Usa python dal PATH
          : path.join(process.resourcesPath, "python", "python.exe"), // Embedded in prod
      port: extractPortFromUrl(process.env.VITE_AI_API_URL, 8001),
    },
    urls: {
      viteDevServer: process.env.VITE_DEV_SERVER_URL || "http://localhost:5173",
      backend: process.env.VITE_BE_URL_LOCAL,
      aiWebSocket: process.env.VITE_WS_PEOPLE_COUNTER_URL,
      aiApi: process.env.VITE_AI_API_URL,
      clerkDomain: process.env.VITE_CLERK_PUBLISHABLE_KEY
        ? "https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com https://*.clerkinc.com"
        : "",
    },
  };

  /**
   * Crea la finestra principale dell'applicazione
   */
  function createWindow() {
    logger.info("Creating main window...");

    mainWindow = new BrowserWindow({
      width: APP_CONFIG.window.width,
      height: APP_CONFIG.window.height,
      minWidth: APP_CONFIG.window.minWidth,
      minHeight: APP_CONFIG.window.minHeight,
      show: false, // Mostriamo dopo il 'ready-to-show'
      icon: path.join(__dirname, "assets", "icon.png"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        backgroundThrottling: false, // Consenti JS (WebSocket, fetch) anche con finestra minimizzata
      },
    });

    // Carica subito un piccolo file HTML statico di "Loading..."
    mainWindow.loadFile(path.join(__dirname, "assets", "splash.html"));

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    // Filtra errori noti irrilevanti dalla console del renderer (es. bug interni librerie)
    mainWindow.webContents.on("console-message", (event, level, message) => {
      if (message.includes("dragEvent is not defined")) return; // bug noto uiohook/MUI
      if (level >= 3) {
        // 3 = error
        logger.debug(`[Renderer console error] ${message}`);
      }
    });

    // Show window when ready
    mainWindow.once("ready-to-show", () => {
      logger.info("Main window ready to show");
      mainWindow.show();
      mainWindow.focus();
    });

    // Handle window close
    mainWindow.on("close", (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        logger.info("Window hidden to tray");
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });

    // CSP Headers per sicurezza (da configurazione .env)
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        // Costruisci connect-src dinamicamente da .env
        const aiWsUrl = APP_CONFIG.urls.aiWebSocket || "";
        const aiApiUrl = APP_CONFIG.urls.aiApi || "";
        const backendUrl = APP_CONFIG.urls.backend || "";
        const clerkDomains = APP_CONFIG.urls.clerkDomain || "";

        // Estrai protocol e host per CSP
        const wsProtocols = aiWsUrl
          ? `ws://${extractHostFromUrl(aiWsUrl)}:${extractPortFromUrl(aiWsUrl, 8001)} wss://${extractHostFromUrl(aiWsUrl)}:${extractPortFromUrl(aiWsUrl, 8001)}`
          : "";
        const httpProtocols = aiApiUrl
          ? `http://${extractHostFromUrl(aiApiUrl)}:${extractPortFromUrl(aiApiUrl, 8001)}`
          : "";

        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              `default-src 'self'; ` +
                `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkDomains}; ` +
                `style-src 'self' 'unsafe-inline' ${clerkDomains}; ` +
                `img-src 'self' data: https: ${httpProtocols}; ` +
                `font-src 'self' data: ${clerkDomains}; ` +
                `worker-src 'self' blob: ${clerkDomains}; ` +
                `connect-src 'self' ${wsProtocols} ${httpProtocols} ${backendUrl} ${clerkDomains};`,
            ],
          },
        });
      },
    );

    logger.info("Main window created successfully");
  }

  /**
   * Crea la tray icon con menu contestuale
   */
  function createTray() {
    logger.info("Creating tray icon...");

    const iconPath = path.join(__dirname, "assets", "tray-icon.png");
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Mostra GymProject",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Scanner QR",
        type: "submenu",
        submenu: [
          {
            label: "Attivo",
            type: "checkbox",
            checked: keyboardHookManager?.isActive() || false,
            click: (menuItem) => {
              if (menuItem.checked) {
                keyboardHookManager?.resume();
              } else {
                keyboardHookManager?.pause();
              }
            },
          },
          {
            label: "Test Scansione",
            click: () => {
              // Simula una scansione per testing
              if (mainWindow) {
                mainWindow.webContents.send("qr-scanned", {
                  code: "TEST-" + Date.now(),
                  timestamp: new Date().toISOString(),
                  source: "manual-test",
                });
                logger.info("Test scan triggered");
              }
            },
          },
        ],
      },
      {
        label: "Servizio AI Python",
        type: "submenu",
        submenu: [
          {
            label: "Stato",
            enabled: false,
          },
          {
            label: pythonServiceManager?.isRunning()
              ? "🟢 In Esecuzione"
              : "🔴 Arrestato",
            enabled: false,
          },
          {
            type: "separator",
          },
          {
            label: "Riavvia Servizio",
            click: async () => {
              try {
                await pythonServiceManager?.restart();
                dialog.showMessageBox(mainWindow, {
                  type: "info",
                  title: "Servizio Riavviato",
                  message:
                    "Il servizio AI Python è stato riavviato con successo.",
                });
              } catch (error) {
                logger.error("Failed to restart Python service:", error);
                dialog.showErrorBox(
                  "Errore Riavvio",
                  "Impossibile riavviare il servizio AI.",
                );
              }
            },
          },
        ],
      },
      {
        type: "separator",
      },
      {
        label: "Info",
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "GymProject Desktop",
            message: "GymProject Desktop App",
            detail:
              `Versione: ${app.getVersion()}\n` +
              `Electron: ${process.versions.electron}\n` +
              `Node: ${process.versions.node}\n` +
              `Chrome: ${process.versions.chrome}\n\n` +
              `Scanner QR: ${keyboardHookManager?.isActive() ? "Attivo" : "Disattivo"}\n` +
              `Python Service: ${pythonServiceManager?.isRunning() ? "Attivo" : "Disattivo"}`,
          });
        },
      },
      {
        type: "separator",
      },
      {
        label: "Esci",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip("GymProject - Scanner Attivo");

    // Double-click per mostrare finestra
    tray.on("double-click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    logger.info("Tray icon created successfully");
  }

  /**
   * Inizializza il keyboard hook manager per intercettare scanner QR
   */
  async function initializeKeyboardHook() {
    logger.info("Initializing keyboard hook manager...");

    keyboardHookManager = new KeyboardHookManager({
      onQrScanned: async (qrData) => {
        const code = qrData.code.trim().replace(/'/g, "-");
        logger.info("QR Code scanned (keyboard hook):", code);
        // Delega a Python che gestisce BE + decrement + broadcast WS
        const port = APP_CONFIG.python.port;
        try {
          await axios.post(
            `http://localhost:${port}/api/qr-trigger`,
            { code },
            { headers: { "Content-Type": "application/json" }, timeout: 3000 },
          );
        } catch (e) {
          logger.warn("[QR] Could not reach Python qr-trigger:", e.message);
        }
        // Porta la finestra in primo piano
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true);
          mainWindow.setAlwaysOnTop(false);
        }
      },
      onError: (error) => {
        logger.error("Keyboard hook error:", error);
      },
    });

    try {
      await keyboardHookManager.start();
      logger.info("Keyboard hook started successfully");
    } catch (error) {
      logger.error("Failed to start keyboard hook:", error);

      // Mostra dialogo di errore su macOS (permessi Accessibilità)
      if (process.platform === "darwin") {
        dialog.showErrorBox(
          "Permessi Richiesti",
          "GymProject necessita dei permessi di Accessibilità per intercettare lo scanner QR.\n\n" +
            "Vai in Preferenze di Sistema > Sicurezza e Privacy > Privacy > Accessibilità\n" +
            "e abilita GymProject.",
        );
      }
    }
  }

  /**
   * Inizializza il Python service manager
   */
  async function initializePythonService() {
    logger.info("Initializing Python service manager...");

    pythonServiceManager = new PythonServiceManager({
      pythonExecutable: APP_CONFIG.python.pythonExecutable,
      scriptPath: APP_CONFIG.python.scriptPath,
      port: APP_CONFIG.python.port,        startupTimeout: 120000, // 2 minuti di timeout per il boot (spesso lento a caricare PyTorch in RAM)      onStatusChange: (status) => {
        logger.info("Python service status changed:", status);

        // Aggiorna tray menu
        if (tray) {
          createTray(); // Ricrea menu con nuovo stato
        }

        // Notifica renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("python-service-status", status);
        }
      },
      onError: (error) => {
        logger.error("Python service error:", error);
      },
    });

    try {
      await pythonServiceManager.start();
      logger.info("Python service started successfully");
    } catch (error) {
      logger.error("Failed to start Python service:", error);

      // Mostra notifica all'utente
      dialog.showErrorBox(
        "Servizio AI Non Disponibile",
        "Il servizio AI per il riconoscimento persone non è disponibile.\n\n" +
          "Alcune funzionalità potrebbero non funzionare correttamente.\n\n" +
          `Dettagli: ${error.message}`,
      );
    }
  }

  /**
   * Setup IPC handlers
   */
  function setupIpcHandlers() {
    // Handler per richieste dal renderer
    ipcMain.handle("get-app-version", () => {
      return app.getVersion();
    });

    ipcMain.handle("get-scanner-status", () => {
      return {
        active: keyboardHookManager?.isActive() || false,
        platform: process.platform,
      };
    });

    ipcMain.handle("get-python-service-status", () => {
      return {
        running: pythonServiceManager?.isRunning() || false,
        port: APP_CONFIG.python.port,
      };
    });

    ipcMain.handle("toggle-scanner", (event, enable) => {
      if (enable) {
        keyboardHookManager?.resume();
      } else {
        keyboardHookManager?.pause();
      }
      return keyboardHookManager?.isActive() || false;
    });

    ipcMain.handle("simulate-qr-scan", async (event, code) => {
      // Delega a Python — stesso flusso del vero scanner
      const port = APP_CONFIG.python.port;
      try {
        await axios.post(
          `http://localhost:${port}/api/qr-trigger`,
          { code },
          { headers: { "Content-Type": "application/json" }, timeout: 3000 },
        );
        return true;
      } catch (e) {
        logger.warn("[QR] simulate-qr-scan: Python not reachable:", e.message);
        return false;
      }
    });

    ipcMain.handle("get-store-value", async (event, key) => {
      if (!store) {
        const electronStoreModule = await import("electron-store");
        const StoreClass = electronStoreModule.default;
        store = new StoreClass();
      }
      return store.get(key);
    });

    ipcMain.handle("set-store-value", async (event, key, value) => {
      if (!store) {
        const electronStoreModule = await import("electron-store");
        const StoreClass = electronStoreModule.default;
        store = new StoreClass();
      }
      store.set(key, value);
      return true;
    });

    logger.info("IPC handlers registered");
  }

  /**
   * App ready event
   */
  app.whenReady().then(async () => {
    logger.info("Electron app ready");

    // Setup IPC
    setupIpcHandlers();
    // Configura e controlla gli aggiornamenti (se non in dev)
    if (!isDev) {
      autoUpdater.logger = logger;
      autoUpdater.autoDownload = true; // Scarica automaticamente l'aggiornamento quando trovato

      autoUpdater.on("update-available", (info) => {
        logger.info(`Update available: ${info.version}`);
        if (mainWindow)
          mainWindow.webContents.send(
            "update-status",
            "available",
            info.version,
          );
      });

      autoUpdater.on("update-downloaded", (info) => {
        logger.info("Update downloaded. Ready to install.");
        if (mainWindow)
          mainWindow.webContents.send(
            "update-status",
            "downloaded",
            info.version,
          );

        dialog
          .showMessageBox({
            type: "info",
            title: "Aggiornamento Pronto",
            message: `La versione ${info.version} e' stata scaricata ed e' pronta per l'installazione.`,
            buttons: ["Installa e Riavvia", "PiÃ¹ Tardi"],
          })
          .then((buttonIndex) => {
            if (buttonIndex.response === 0) {
              app.isQuitting = true;
              autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
            }
          });
      });

      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (err) {
        logger.error("Error checking for updates:", err);
      }
    }
    
    // 0. Crea finestra e mostra subito lo splash screen
    createWindow();
    createTray();

    // 1. Avvia servizio Python (può richiedere tempo)
    await initializePythonService();

    // 2. Inizializza keyboard hook
    await initializeKeyboardHook();

    // 3. Sposta la navigazione all'app Web React (solo dopo che Python ha finito di svegliarsi)
    const startUrl = isDev
      ? APP_CONFIG.urls.viteDevServer // Da .env o default
      : `file://${path.join(__dirname, "..", "dist", "index.html")}`;

    mainWindow.loadURL(startUrl);

    logger.info("App initialization complete");
  });

  /**
   * Handle second instance (single instance lock)
   */
  app.on("second-instance", () => {
    logger.warn("Second instance detected, focusing main window");

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  /**
   * All windows closed (non-macOS)
   */
  app.on("window-all-closed", () => {
    // Su macOS, le app restano attive fino a Cmd+Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  /**
   * Activate (macOS)
   */
  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });

  let isShuttingDown = false;

  /**
   * Before quit - cleanup
   */
  app.on("before-quit", async (event) => {
    if (isShuttingDown) return;

    logger.info("App quitting, cleaning up...");
    event.preventDefault();
    isShuttingDown = true;
    app.isQuitting = true;

    try {
      // Stop keyboard hook
      if (keyboardHookManager) {
        await keyboardHookManager.stop();
        logger.info("Keyboard hook stopped");
      }

      // Stop Python service
      if (pythonServiceManager) {
        await pythonServiceManager.stop();
        logger.info("Python service stopped");
      }
    } catch (e) {
      logger.error("Error during cleanup:", e);
    }

    logger.info("Cleanup complete");
    app.quit();
  });

  /**
   * Unhandled errors
   */
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error);
    dialog.showErrorBox(
      "Errore Critico",
      `Si è verificato un errore:\n\n${error.message}`,
    );
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection at:", promise, "reason:", reason);
  });
}
