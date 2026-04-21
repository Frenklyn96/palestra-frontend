/**
 * PYTHON SERVICE MANAGER
 *
 * Gestisce il ciclo di vita del servizio Python AI (FastAPI)
 *
 * Funzionalità:
 * - Avvio automatico del processo Python
 * - Health check periodico
 * - Auto-restart su crash (con limite tentativi)
 * - Graceful shutdown
 * - Logging output Python
 * - Gestione errori e stati
 */

const { spawn, spawnSync } = require("child_process");
const axios = require("axios");
const logger = require("./utils/logger");
const path = require("path");
const fs = require("fs");

class PythonServiceManager {
  constructor(options = {}) {
    this.options = {
      // Path all'eseguibile Python
      pythonExecutable: options.pythonExecutable || "python",

      // Path allo script Python (app.py)
      scriptPath: options.scriptPath,

      // Porta su cui il servizio ascolta
      port: options.port || 8001,

      // Host
      host: options.host || "localhost",

      // Callback cambio stato
      onStatusChange: options.onStatusChange || (() => {}),

      // Callback errori
      onError: options.onError || (() => {}),

      // Intervallo health check (ms)
      healthCheckInterval: options.healthCheckInterval || 15000, // 15 secondi

      // Timeout per startup (ms)
      startupTimeout: options.startupTimeout || 30000, // 30 secondi

      // Max tentativi restart
      maxRestartAttempts: options.maxRestartAttempts || 3,

      // Delay tra restart (ms)
      restartDelay: options.restartDelay || 5000, // 5 secondi
    };

    // Valida configurazione
    if (!this.options.scriptPath) {
      throw new Error("Python script path is required");
    }

    // Stato interno
    this.process = null;
    this.healthCheckTimer = null;
    this.restartAttempts = 0;
    this.status = "stopped"; // stopped | starting | running | error | stopping
    this.lastError = null;

    logger.info("PythonServiceManager initialized", {
      pythonExecutable: this.options.pythonExecutable,
      scriptPath: this.options.scriptPath,
      port: this.options.port,
    });
  }

  /**
   * Avvia il servizio Python
   */
  async start() {
    if (this.process !== null) {
      logger.warn("Python service already running");
      return;
    }

    // Verifica che lo script esista
    if (!fs.existsSync(this.options.scriptPath)) {
      const error = new Error(
        `Python script not found: ${this.options.scriptPath}`,
      );
      logger.error(error.message);
      this.updateStatus("error", error);
      throw error;
    }

    logger.info("Starting Python service...");
    this.updateStatus("starting");

    try {
      // Determina il working directory (cartella dello script)
      const workingDir = path.dirname(this.options.scriptPath);
      const scriptName = path.basename(this.options.scriptPath);

      // Prepara venv e installa dipendenze se necessario
      const pythonExecutable = this.ensureVenv(workingDir);

      // Argomenti per Python
      const args = [scriptName];

      logger.info("Spawning Python process", {
        executable: pythonExecutable,
        args,
        cwd: workingDir,
      });

      // Spawn processo Python
      this.process = spawn(pythonExecutable, args, {
        cwd: workingDir,
        env: {
          ...process.env,
          // Variabili ambiente aggiuntive per Python
          PYTHONUNBUFFERED: "1", // Output immediato
          PORT: String(this.options.port),
        },
      });

      // Gestisci output stdout
      this.process.stdout.on("data", (data) => {
        const output = data.toString().trim();
        logger.info(`[Python stdout] ${output}`);
      });

      // Gestisci output stderr
      this.process.stderr.on("data", (data) => {
        const output = data.toString().trim();

        // FastAPI/Uvicorn loggano su stderr anche info normali
        // Filtriamo per distinguere errori da log
        if (output.includes("ERROR") || output.includes("Exception")) {
          logger.error(`[Python stderr] ${output}`);
        } else {
          logger.info(`[Python stderr] ${output}`);
        }
      });

      // Gestisci chiusura processo
      this.process.on("close", (code, signal) => {
        logger.info("Python process closed", { code, signal });

        this.process = null;

        if (code !== 0 && code !== null) {
          logger.error("Python process exited with error", { code });
          this.updateStatus(
            "error",
            new Error(`Process exited with code ${code}`),
          );

          // Tenta restart automatico
          this.attemptAutoRestart();
        } else {
          this.updateStatus("stopped");
        }
      });

      // Gestisci errori processo
      this.process.on("error", (error) => {
        logger.error("Python process error:", error);
        this.updateStatus("error", error);
        this.process = null;
      });

      // Attendi che il servizio sia effettivamente pronto
      await this.waitForStartup();

      // Avvia health check periodico
      this.startHealthCheck();

      // Reset contatore restart su successo
      this.restartAttempts = 0;

      this.updateStatus("running");
      logger.info("Python service started successfully");
    } catch (error) {
      logger.error("Failed to start Python service:", error);
      this.updateStatus("error", error);

      // Cleanup
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      throw error;
    }
  }

  /**
   * Attende che il servizio risponda al health check
   */
  async waitForStartup() {
    const startTime = Date.now();
    const healthUrl = `http://${this.options.host}:${this.options.port}/health`;

    logger.info("Waiting for Python service to be ready...", { healthUrl });

    while (Date.now() - startTime < this.options.startupTimeout) {
      try {
        const response = await axios.get(healthUrl, {
          timeout: 2000,
          validateStatus: () => true, // Non lanciare errore su qualsiasi status
        });

        if (response.status === 200) {
          logger.info("Python service is ready");
          return;
        }
      } catch (error) {
        // Servizio non ancora pronto, continua ad attendere
      }

      // Attendi 1 secondo prima di riprovare
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Python service startup timeout");
  }

  /**
   * Avvia il health check periodico
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.healthCheckInterval);

    logger.info("Health check started", {
      interval: this.options.healthCheckInterval,
    });
  }

  /**
   * Esegue un health check
   */
  async performHealthCheck() {
    if (this.status !== "running") {
      return;
    }

    const healthUrl = `http://${this.options.host}:${this.options.port}/health`;

    try {
      const response = await axios.get(healthUrl, { timeout: 3000 });

      if (response.status !== 200) {
        logger.warn("Health check failed", {
          status: response.status,
        });
        // Non cambiamo stato immediatamente, potrebbe essere temporaneo
      }
    } catch (error) {
      logger.error("Health check error:", error.message);

      // Se il processo è ancora vivo ma non risponde, potrebbe esserci un problema
      if (this.process && !this.process.killed) {
        logger.warn("Process alive but not responding to health check");
      } else {
        // Processo morto, tenta restart
        this.updateStatus("error", new Error("Service not responding"));
        this.attemptAutoRestart();
      }
    }
  }

  /**
   * Ferma il servizio
   */
  async stop() {
    if (!this.process) {
      logger.warn("Python service not running");
      return;
    }

    logger.info("Stopping Python service...");
    this.updateStatus("stopping");

    // Ferma health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Graceful shutdown
    try {
      if (process.platform === "win32") {
        try {
          const { execSync } = require("child_process");
          execSync(`taskkill /pid ${this.process.pid} /T /F`, {
            stdio: "ignore",
          });
        } catch (e) {
          logger.warn(
            `Taskkill warning (process might be dead already): ${e.message}`,
          );
        }
      } else {
        // Prova prima SIGTERM
        this.process.kill("SIGTERM");
      }

      // Attendi max 5 secondi
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          // Se non si e chiuso, forza con SIGKILL
          if (this.process && !this.process.killed) {
            logger.warn("Force killing Python process");
            if (process.platform !== "win32") {
              this.process.kill("SIGKILL");
            }
          }
          resolve();
        }, 5000);

        // Se si chiude prima, cancella timeout
        if (this.process) {
          this.process.on("close", () => {
            clearTimeout(timeout);
            resolve();
          });
        }
      });

      this.process = null;
      this.updateStatus("stopped");
      logger.info("Python service stopped successfully");
    } catch (error) {
      logger.error("Error stopping Python service:", error);
      this.options.onError(error);
    }
  }

  /**
   * Riavvia il servizio
   */
  async restart() {
    logger.info("Restarting Python service...");

    await this.stop();

    // Attendi un momento prima di riavviare
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await this.start();
  }

  /**
   * Tenta auto-restart con limite tentativi
   */
  async attemptAutoRestart() {
    this.restartAttempts++;

    if (this.restartAttempts > this.options.maxRestartAttempts) {
      logger.error("Max restart attempts reached, giving up", {
        attempts: this.restartAttempts,
      });
      this.updateStatus("error", new Error("Max restart attempts exceeded"));
      return;
    }

    logger.info("Attempting auto-restart", {
      attempt: this.restartAttempts,
      maxAttempts: this.options.maxRestartAttempts,
    });

    // Attendi prima di riavviare
    await new Promise((resolve) =>
      setTimeout(resolve, this.options.restartDelay),
    );

    try {
      await this.start();
      logger.info("Auto-restart successful");
    } catch (error) {
      logger.error("Auto-restart failed:", error);
      // Il prossimo tentativo sarà attivato dal processo close event
    }
  }

  /**
   * Aggiorna lo stato e notifica
   */
  updateStatus(status, error = null) {
    const oldStatus = this.status;
    this.status = status;
    this.lastError = error;

    logger.info("Python service status changed", {
      from: oldStatus,
      to: status,
      error: error?.message,
    });

    try {
      this.options.onStatusChange({
        status,
        previousStatus: oldStatus,
        error: error?.message || null,
        timestamp: new Date().toISOString(),
      });
    } catch (callbackError) {
      logger.error("Error in status change callback:", callbackError);
    }

    if (error) {
      this.options.onError(error);
    }
  }

  /**
   * Crea (se non esiste) un venv nella workingDir,
   * installa i requirements e restituisce il path all'eseguibile Python del venv.
   */
  ensureVenv(workingDir) {
    const isWin = process.platform === "win32";
    const venvDir = path.join(workingDir, ".venv");
    const venvPython = isWin
      ? path.join(venvDir, "Scripts", "python.exe")
      : path.join(venvDir, "bin", "python");
    const requirementsPath = path.join(workingDir, "requirements.txt");

    // Crea il venv solo se non esiste ancora
    if (!fs.existsSync(venvPython)) {
      logger.info("Creating Python venv", { venvDir });
      const result = spawnSync(
        this.options.pythonExecutable,
        ["-m", "venv", ".venv"],
        {
          cwd: workingDir,
          stdio: "pipe",
          encoding: "utf8",
        },
      );
      if (result.status !== 0) {
        const msg =
          result.stderr || result.error?.message || "venv creation failed";
        logger.error("Failed to create venv", { msg });
        throw new Error(`Failed to create Python venv: ${msg}`);
      }
      logger.info("Python venv created successfully");
    } else {
      logger.info("Python venv already exists, skipping creation");
    }

    // Installa / aggiorna requirements se il file esiste
    if (fs.existsSync(requirementsPath)) {
      // Controlla se serve aggiornare: confronta mtime requirements vs sentinel
      const sentinelPath = path.join(venvDir, ".requirements_installed");
      const reqMtime = fs.statSync(requirementsPath).mtimeMs;
      const sentinelMtime = fs.existsSync(sentinelPath)
        ? fs.statSync(sentinelPath).mtimeMs
        : 0;

      if (reqMtime > sentinelMtime) {
        logger.info("Installing requirements into venv...");
        const pip = spawnSync(
          venvPython,
          ["-m", "pip", "install", "-r", requirementsPath],
          {
            cwd: workingDir,
            stdio: "pipe",
            encoding: "utf8",
          },
        );
        if (pip.status !== 0) {
          const msg = pip.stderr || pip.error?.message || "pip install failed";
          logger.error("Failed to install requirements", { msg });
          throw new Error(`Failed to install Python requirements: ${msg}`);
        }
        // Aggiorna il sentinel
        fs.writeFileSync(sentinelPath, new Date().toISOString());
        logger.info("Python requirements installed successfully");
      } else {
        logger.info("Requirements already up to date, skipping pip install");
      }
    }

    return venvPython;
  }

  /**
   * Crea (se non esiste) un venv nella workingDir,
   * installa i requirements e restituisce il path all'eseguibile Python del venv.
   */
  ensureVenv(workingDir) {
    const isWin = process.platform === "win32";
    const venvDir = path.join(workingDir, ".venv");
    const venvPython = isWin
      ? path.join(venvDir, "Scripts", "python.exe")
      : path.join(venvDir, "bin", "python");
    const requirementsPath = path.join(workingDir, "requirements.txt");

    // Crea il venv solo se non esiste ancora
    if (!fs.existsSync(venvPython)) {
      logger.info("Creating Python venv", { venvDir });
      const result = spawnSync(
        this.options.pythonExecutable,
        ["-m", "venv", ".venv"],
        {
          cwd: workingDir,
          stdio: "pipe",
          encoding: "utf8",
        },
      );
      if (result.status !== 0) {
        const msg =
          result.stderr || result.error?.message || "venv creation failed";
        logger.error("Failed to create venv", { msg });
        throw new Error(`Failed to create Python venv: ${msg}`);
      }
      logger.info("Python venv created successfully");
    } else {
      logger.info("Python venv already exists, skipping creation");
    }

    // Installa / aggiorna requirements se il file esiste
    if (fs.existsSync(requirementsPath)) {
      // Installa solo se requirements.txt è più recente del sentinel
      const sentinelPath = path.join(venvDir, ".requirements_installed");
      const reqMtime = fs.statSync(requirementsPath).mtimeMs;
      const sentinelMtime = fs.existsSync(sentinelPath)
        ? fs.statSync(sentinelPath).mtimeMs
        : 0;

      if (reqMtime > sentinelMtime) {
        logger.info("Installing requirements into venv...");
        const pip = spawnSync(
          venvPython,
          ["-m", "pip", "install", "-r", requirementsPath],
          {
            cwd: workingDir,
            stdio: "pipe",
            encoding: "utf8",
          },
        );
        if (pip.status !== 0) {
          const msg = pip.stderr || pip.error?.message || "pip install failed";
          logger.error("Failed to install requirements", { msg });
          throw new Error(`Failed to install Python requirements: ${msg}`);
        }
        // Aggiorna il sentinel
        fs.writeFileSync(sentinelPath, new Date().toISOString());
        logger.info("Python requirements installed successfully");
      } else {
        logger.info("Requirements already up to date, skipping pip install");
      }
    }

    return venvPython;
  }

  /**
   * Verifica se il servizio è in esecuzione
   */
  isRunning() {
    return this.status === "running" && this.process !== null;
  }

  /**
   * Ottieni stato corrente
   */
  getStatus() {
    return {
      status: this.status,
      isRunning: this.isRunning(),
      port: this.options.port,
      host: this.options.host,
      restartAttempts: this.restartAttempts,
      lastError: this.lastError?.message || null,
      processId: this.process?.pid || null,
    };
  }
}

module.exports = PythonServiceManager;
