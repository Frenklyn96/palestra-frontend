/**
 * CUSTOM HOOK - useElectronQrScanner
 *
 * Hook React per integrare lo scanner QR globale Electron
 * Sostituisce il listener keyboard diretto nel browser
 *
 * Usage:
 * ```tsx
 * const { isElectron, scannerActive } = useElectronQrScanner((qrData) => {
 *   console.log('QR Scanned:', qrData.code);
 *   // Process QR code...
 * });
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Type definitions per Electron API
 */
interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  onQrScanned: (callback: (data: QrScanData) => void) => () => void;
  onPythonServiceStatus: (
    callback: (status: PythonServiceStatus) => void,
  ) => () => void;
  onScannerStatusChanged: (
    callback: (status: ScannerStatus) => void,
  ) => () => void;
  getAppVersion: () => Promise<string>;
  getScannerStatus: () => Promise<ScannerStatus>;
  getPythonServiceStatus: () => Promise<PythonServiceStatus>;
  toggleScanner: (enable: boolean) => Promise<boolean>;
  simulateQrScan: (code: string) => Promise<boolean>;
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => Promise<boolean>;
}

interface QrScanData {
  code: string;
  timestamp: string;
  timestampMs?: number;
  source: "scanner-device" | "manual-test" | "manual-simulation";
  platform?: string;
  raw?: string;
}

interface ScannerStatus {
  active: boolean;
  platform: string;
}

interface PythonServiceStatus {
  running: boolean;
  port: number;
  status?: string;
}

/**
 * Verifica se stiamo eseguendo in Electron
 */
function isElectronEnvironment(): boolean {
  return !!(window as any).electronAPI?.isElectron;
}

/**
 * Ottieni l'API Electron (con type safety)
 */
function getElectronAPI(): ElectronAPI | null {
  if (isElectronEnvironment()) {
    return (window as any).electronAPI as ElectronAPI;
  }
  return null;
}

/**
 * Hook per scanner QR Electron
 */
export function useElectronQrScanner(
  onQrScanned: (data: QrScanData) => void | Promise<void>,
  options: {
    enabled?: boolean; // Abilita/disabilita listener
    deduplicate?: boolean; // Previeni duplicati consecutivi
    deduplicateThreshold?: number; // Soglia deduplica (ms)
  } = {},
) {
  const {
    enabled = true,
    deduplicate = true,
    deduplicateThreshold = 2000,
  } = options;

  const isElectron = isElectronEnvironment();
  const electronAPI = getElectronAPI();

  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [pythonServiceRunning, setPythonServiceRunning] =
    useState<boolean>(false);

  // Ref per callback (evita ri-registrazione listener)
  const callbackRef = useRef(onQrScanned);
  useEffect(() => {
    callbackRef.current = onQrScanned;
  }, [onQrScanned]);

  // Ref per deduplica
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);

  /**
   * Handler QR scan con deduplica
   */
  const handleQrScan = useCallback(
    (data: QrScanData) => {
      // Deduplica
      if (deduplicate) {
        const now = Date.now();
        if (
          lastScannedRef.current &&
          lastScannedRef.current.code === data.code &&
          now - lastScannedRef.current.time < deduplicateThreshold
        ) {
          console.debug(
            "[useElectronQrScanner] Duplicate scan ignored",
            data.code,
          );
          return;
        }
        lastScannedRef.current = { code: data.code, time: now };
      }

      // Invoca callback
      try {
        const result = callbackRef.current(data);
        // Se callback è async, gestisci promise
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("[useElectronQrScanner] Callback error:", error);
          });
        }
      } catch (error) {
        console.error("[useElectronQrScanner] Callback error:", error);
      }
    },
    [deduplicate, deduplicateThreshold],
  );

  /**
   * Registra listener per QR scan events
   */
  useEffect(() => {
    if (!isElectron || !electronAPI || !enabled) {
      return;
    }

    console.log("[useElectronQrScanner] Registering QR scan listener");

    const unsubscribe = electronAPI.onQrScanned(handleQrScan);

    return () => {
      console.log("[useElectronQrScanner] Unregistering QR scan listener");
      unsubscribe();
    };
  }, [isElectron, electronAPI, enabled, handleQrScan]);

  /**
   * Registra listener per scanner status changes
   */
  useEffect(() => {
    if (!isElectron || !electronAPI) {
      return;
    }

    const unsubscribe = electronAPI.onScannerStatusChanged((status) => {
      setScannerActive(status.active);
    });

    // Fetch stato iniziale
    electronAPI.getScannerStatus().then((status) => {
      setScannerActive(status.active);
    });

    return unsubscribe;
  }, [isElectron, electronAPI]);

  /**
   * Registra listener per Python service status
   */
  useEffect(() => {
    if (!isElectron || !electronAPI) {
      return;
    }

    const unsubscribe = electronAPI.onPythonServiceStatus((status) => {
      setPythonServiceRunning(status.running);
    });

    // Fetch stato iniziale
    electronAPI.getPythonServiceStatus().then((status) => {
      setPythonServiceRunning(status.running);
    });

    return unsubscribe;
  }, [isElectron, electronAPI]);

  /**
   * Toggle scanner attivo/disattivo
   */
  const toggleScanner = useCallback(
    async (enable: boolean) => {
      if (!isElectron || !electronAPI) {
        console.warn("[useElectronQrScanner] Not running in Electron");
        return false;
      }

      try {
        const newState = await electronAPI.toggleScanner(enable);
        setScannerActive(newState);
        return newState;
      } catch (error) {
        console.error("[useElectronQrScanner] Toggle scanner error:", error);
        return false;
      }
    },
    [isElectron, electronAPI],
  );

  /**
   * Simula una scansione (per testing)
   */
  const simulateScan = useCallback(
    async (code: string) => {
      if (!isElectron || !electronAPI) {
        console.warn("[useElectronQrScanner] Not running in Electron");
        return false;
      }

      try {
        return await electronAPI.simulateQrScan(code);
      } catch (error) {
        console.error("[useElectronQrScanner] Simulate scan error:", error);
        return false;
      }
    },
    [isElectron, electronAPI],
  );

  return {
    /**
     * Indica se stiamo eseguendo in Electron
     */
    isElectron,

    /**
     * Indica se lo scanner è attivo
     */
    scannerActive,

    /**
     * Indica se il servizio Python AI è attivo
     */
    pythonServiceRunning,

    /**
     * Attiva/disattiva scanner
     */
    toggleScanner,

    /**
     * Simula una scansione (per testing)
     */
    simulateScan,

    /**
     * L'API Electron completa (se disponibile)
     */
    electronAPI,
  };
}

/**
 * Hook per ottenere info app Electron
 */
export function useElectronAppInfo() {
  const isElectron = isElectronEnvironment();
  const electronAPI = getElectronAPI();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isElectron && electronAPI) {
      electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isElectron, electronAPI]);

  return {
    isElectron,
    appVersion,
    platform: electronAPI?.platform || "web",
  };
}

/**
 * Export types per uso esterno
 */
export type { ElectronAPI, QrScanData, ScannerStatus, PythonServiceStatus };
