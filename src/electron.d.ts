/**
 * ELECTRON TYPES DEFINITIONS
 *
 * Aggiunge type definitions per window.electronAPI
 * in ambiente TypeScript React
 */

import { ElectronAPI } from "./hooks/useElectronQrScanner";

declare global {
  interface Window {
    /**
     * API Electron esposte tramite preload.js
     * Disponibile solo quando app è eseguita in Electron
     */
    electronAPI?: ElectronAPI;
  }
}

export {};
