/**
 * LOGGER UTILITY
 *
 * Logging centralizzato per l'applicazione Electron
 * Usa Winston per logging strutturato
 */

const winston = require("winston");
const path = require("path");
const { app } = require("electron");

// Determina la directory dei log
// In development: progetto/logs
// In production: userData/logs
const isDev = process.env.NODE_ENV === "development";
const logDir = isDev
  ? path.join(__dirname, "..", "..", "logs")
  : path.join(app?.getPath("userData") || ".", "logs");

/**
 * Formato custom per i log
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      // Rimuovi stack trace dai meta se presente (già gestito da errors())
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        metaStr = ` ${JSON.stringify(cleanMeta)}`;
      }
      if (stack) {
        metaStr += `\n${stack}`;
      }
    }

    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }),
);

/**
 * Configurazione trasporti
 */
const transports = [
  // Console (sempre attivo)
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), customFormat),
    level: isDev ? "debug" : "info",
  }),

  // File per errori
  new winston.transports.File({
    filename: path.join(logDir, "error.log"),
    level: "error",
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: customFormat,
  }),

  // File per tutti i log
  new winston.transports.File({
    filename: path.join(logDir, "combined.log"),
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    format: customFormat,
  }),
];

/**
 * Crea logger Winston
 */
const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: customFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
    }),
  ],
});

/**
 * Log di avvio
 */
logger.info("Logger initialized", {
  logDir,
  isDevelopment: isDev,
  level: logger.level,
});

module.exports = logger;
