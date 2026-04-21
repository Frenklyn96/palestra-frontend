/**
 * SCANNER PAGE - ELECTRON INTEGRATION PATCH
 *
 * Questo file mostra le modifiche necessarie a ScannerPage.tsx
 * per integrare lo scanner QR globale Electron mantenendo
 * la compatibilità con l'esecuzione web.
 *
 * STRATEGIA:
 * 1. Importa useElectronQrScanner hook
 * 2. Estrai logica processamento QR in funzione separata
 * 3. Usa hook Electron se disponibile, altrimenti fallback a keyboard listener browser
 * 4. Minime modifiche al codice esistente
 */

// ========================================
// IMPORT COMPLETI (tutti necessari)
// ========================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ClienteCard from "./src/features/components/clienteCard/ClienteCard";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "./src/store/store";
import {
  fetchClienteById,
  removeSelectCliente,
} from "./src/features/slice/clientiSlice";
import { processQrScanAsync } from "./src/features/slice/entrancesSlice";
import { decrementPeopleCounter } from "./src/features/api/AICounterService";
import { useTranslation } from "react-i18next";

// ========================================
// IMPORT AGGIUNTO PER ELECTRON
// ========================================
import { useElectronQrScanner } from "./src/hooks/useElectronQrScanner";

// ========================================
// DENTRO IL COMPONENTE ScannerPage
// ========================================

const ScannerPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.userId);
  const cliente = useSelector(
    (state: RootState) => state.clienti.selectedCliente,
  );
  const loading = useSelector(
    (state: RootState) => state.clienti.loadingSelectedCliente,
  );
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [decrementFeedback, setDecrementFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [peopleCount, setPeopleCount] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [aiStreamUrl, setAiStreamUrl] = useState<string>("");
  const [aiStreamConnected, setAiStreamConnected] = useState<boolean>(false);
  const [aiServiceReachable, setAiServiceReachable] = useState<boolean>(true);

  // ========================================
  // NUOVA SEZIONE: ELECTRON QR SCANNER HOOK
  // ========================================

  /**
   * Hook Electron per scanner QR globale
   * Se non in Electron, isElectron sarà false e useremo il fallback
   */
  const { isElectron, scannerActive, pythonServiceRunning } =
    useElectronQrScanner(
      // Callback quando QR viene scansionato (da Electron Main Process)
      async (qrData) => {
        console.log("[Electron] QR Scanned:", qrData);
        await handleQrCodeScanned(qrData.code);
      },
      {
        enabled: true, // Sempre abilitato
        deduplicate: true, // Hook già deduplica, ma attiviamo per sicurezza
        deduplicateThreshold: 2000, // 2 secondi
      },
    );

  // ========================================
  // LOGICA PROCESSAMENTO QR ESTRATTA
  // (usata sia da Electron che da keyboard listener)
  // ========================================

  /**
   * Processa un codice QR scansionato
   * QUESTA FUNZIONE CENTRALIZZA LA LOGICA DI BUSINESS
   */
  const handleQrCodeScanned = useCallback(
    async (code: string) => {
      // Normalizza codice (rimuovi apici, trim)
      const normalizedCode = code.trim().replace(/'/g, "-");

      if (!normalizedCode) {
        console.warn("[Scanner] Empty code, ignoring");
        return;
      }

      // Previeni duplicati consecutivi
      if (normalizedCode === lastScanned) {
        console.debug("[Scanner] Duplicate scan, ignoring");
        return;
      }

      console.log("[Scanner] Processing QR code:", normalizedCode);
      setLastScanned(normalizedCode);
      setError(null);

      // Reset del cliente precedente per mostrare il caricamento
      dispatch(removeSelectCliente());

      try {
        // Prima recupera SEMPRE i dati del cliente per mostrare la card
        await dispatch(fetchClienteById(normalizedCode)).unwrap();

        // Poi chiama l'endpoint qr-scan per validare e registrare l'ingresso
        const result = await dispatch(
          processQrScanAsync({
            clienteId: normalizedCode,
            userId: userId!,
          }),
        ).unwrap();

        if (result.success && result.entrance) {
          // Ingresso effettuato con successo
          console.log("[Scanner] Entrance registered successfully");

          // Decrementa il contatore persone
          setPeopleCount((prev) => Math.max(0, prev - 1));

          try {
            await decrementPeopleCounter();
          } catch (err) {
            console.error(t("scanner.errorDecrement"), err);
          }
        } else if (!result.success && result.errorMessage) {
          // Mostra l'errore (abbonamento scaduto o ingresso recente)
          console.warn(
            "[Scanner] Entrance validation failed:",
            result.errorMessage,
          );
          setError(result.errorMessage);
        }
      } catch (err: any) {
        console.error(t("scanner.errorFetchCliente"), err);
        setError(t("scanner.notFound"));
      }
    },
    [dispatch, lastScanned, t, userId],
  );

  // ========================================
  // KEYBOARD LISTENER (SOLO SE NON IN ELECTRON)
  // Fallback per esecuzione web browser
  // ========================================

  useEffect(() => {
    // Se in Electron, lo scanner globale è gestito dal Main Process
    // NON avviare il listener keyboard browser
    if (isElectron) {
      console.log("[Scanner] Running in Electron, using global keyboard hook");
      return;
    }

    console.log(
      "[Scanner] Running in browser, using keyboard listener fallback",
    );

    // Mantieni focus sull'input nascosto
    inputRef.current?.focus();

    let buffer = "";
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignora l'input se l'utente sta digitando in altri campi
      if (
        e.target instanceof HTMLInputElement &&
        e.target !== inputRef.current
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (!buffer) return;

        const code = buffer.trim();
        buffer = "";
        setScannedCode("");

        // Usa la funzione centralizzata
        await handleQrCodeScanned(code);
      } else {
        // Accumula caratteri
        if (e.key.length === 1) {
          buffer += e.key;

          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            buffer = "";
          }, 500);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      clearTimeout(timeoutId);
    };
  }, [isElectron, handleQrCodeScanned]);

  // ========================================
  // RESTO DEL CODICE ESISTENTE INVARIATO
  // (WebSocket, AI stream, render, etc.)
  // ========================================

  // ... tutto il resto del componente rimane identico ...

  return (
    <Paper className="scanner-page-paper">
      {/* UI ESISTENTE */}

      {/* OPZIONALE: Badge per indicare se in Electron */}
      {isElectron && (
        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <Typography
            variant="caption"
            sx={{
              bgcolor: scannerActive ? "success.main" : "warning.main",
              color: "white",
              px: 2,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            🖥️ Desktop Mode{" "}
            {scannerActive ? "• Scanner Active" : "• Scanner Paused"}
          </Typography>
        </Box>
      )}

      {/* ... resto JSX esistente ... */}
    </Paper>
  );
};

export default ScannerPage;
