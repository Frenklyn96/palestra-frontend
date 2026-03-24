import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import ClienteCard from "../../features/components/clienteCard/ClienteCard";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { fetchClienteById } from "../../features/slice/clientiSlice";
import { decrementPeopleCounter } from "../../features/api/AICounterService";
import { useTranslation } from "react-i18next";
import "./ScannerPage.css";

const ScannerPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const cliente = useSelector(
    (state: RootState) => state.clienti.selectedCliente,
  );
  const loading = useSelector(
    (state: RootState) => state.clienti.loadingSelectedCliente,
  );
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const [scannedCode, setScannedCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Maintain focus on the input to ensure the scanner works
  useEffect(() => {
    inputRef.current?.focus();

    // Gestione globale dell'ascolto della tastiera per far funzionare lo scanner ovunque
    let buffer = "";
    let timeoutId: NodeJS.Timeout;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignora l'input se l'utente sta digitando dentro un vero campo di input (es. un campo di ricerca da un'altra parte)
      // ma consentiamo al nostro input nascosto di funzionare
      if (
        e.target instanceof HTMLInputElement &&
        e.target !== inputRef.current
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        // Se il buffer è vuoto, ignoriamo (potrebbe essere un enter casuale)
        if (!buffer) return;

        // Rimuovi gli apici singoli scansionati accidentalmente a causa del layout tastiera dello scanner
        const rawId = buffer.trim();
        const id = rawId.replace(/'/g, "-");

        // Pulizia dello stato per la prossima scansione
        buffer = "";
        setScannedCode("");

        if (!id) return;
        if (id === lastScanned) return;

        console.log(t("=====> scanner.extractedId"), id);
        setLastScanned(id);
        setError(null);

        try {
          // Assicurati che l'ID sia stato convertito correttamente
          const res = await dispatch(fetchClienteById(id)).unwrap();

          const isAbbonamentoValido =
            res.scadenza && new Date(res.scadenza) >= new Date();

          if (isAbbonamentoValido) {
            setPeopleCount((prev) => Math.max(0, prev - 1));
            try {
              await decrementPeopleCounter();
            } catch (err) {
              console.error(t("scanner.errorDecrement"), err);
            }
          }
        } catch (err: any) {
          console.error(t("scanner.errorFetchCliente"), err);
          setError(t("scanner.notFound"));
        }
      } else {
        // Accumula i caratteri solo se non sono tasti speciali
        if (e.key.length === 1) {
          buffer += e.key;

          // Imposta un timeout per svuotare il buffer se passano più di 500ms fra i tasti.
          // Lo scanner è molto veloce (<20ms per carattere), gli umani sono lenti.
          // Questo previene che digitazioni accidentali si sovrappongano alla scansione.
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
  }, [dispatch, lastScanned, t]);

  // WebSocket states
  const [peopleCount, setPeopleCount] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Stream states
  const [aiStreamUrl, setAiStreamUrl] = useState<string>("");
  const [aiStreamConnected, setAiStreamConnected] = useState<boolean>(false);

  // WebSocket connection logic
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_PEOPLE_COUNTER_URL;
        console.log(t("scanner.wsConnecting"), wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(t("scanner.wsConnected"));
          setWsConnected(true);
          // Clear reconnect timeout on successful connection
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(t("scanner.wsReceived"), data);

            // Update people count from the 'enter' field
            if (typeof data.enter === "number") {
              setPeopleCount(data.enter);
            }
          } catch (err) {
            console.error(t("scanner.wsParseError"), err);
          }
        };

        ws.onerror = (error) => {
          console.error(t("scanner.wsError"), error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log(t("scanner.wsDisconnectedReconnect"));
          setWsConnected(false);

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error(t("scanner.wsConnectError"), err);
        setWsConnected(false);

        // Retry connection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initialize AI stream URL
  useEffect(() => {
    const streamUrl = import.meta.env.VITE_AI_STREAM_URL;
    setAiStreamUrl(streamUrl);
    setAiStreamConnected(true);
  }, []);

  return (
    <Paper
      className="scanner-page-paper"
      onClick={() => inputRef.current?.focus()}
      // Rimuoviamo gli eventi tastiera locali che si basavano sull'input singolo, stiamo gestendo tutto globally
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <h1>{t("scanner.title")}</h1>

      <input
        ref={inputRef}
        type="text"
        value={scannedCode}
        onChange={(e) => setScannedCode(e.target.value)}
        // non serve più onKeyDown qui!
        style={{
          opacity: 0,
          position: "absolute",
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
        autoFocus
      />

      <Box className="scanner-main-layout">
        {/* Video Stream AI nel centro (ora a sinistra per occupare il posto) */}
        <Box className="scanner-center-panel">
          <Card className="scanner-ai-card">
            <CardContent className="scanner-ai-content">
              {aiStreamConnected && aiStreamUrl ? (
                <>
                  <img
                    src={aiStreamUrl}
                    alt="AI Video Stream"
                    className="scanner-ai-img"
                    onError={() => {
                      setTimeout(() => {
                        setAiStreamUrl((prevUrl) => {
                          const base = prevUrl.split("?")[0];
                          return `${base}?retry=${Date.now()}`;
                        });
                      }, 3000);
                    }}
                    onLoad={() => setAiStreamConnected(true)}
                  />
                  <Box className="scanner-ai-badge">
                    {t("scanner.aiVideoInfo")}
                  </Box>
                </>
              ) : (
                <Box className="scanner-ai-loader-container">
                  <CircularProgress className="scanner-ai-spinner" />
                  <Typography variant="body2">
                    {t("scanner.connectingAi")}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Info a destra: conteggio persone + cliente */}
        <Box className="scanner-right-panel">
          {/* People Counter Card */}
          <Card
            className={`scanner-counter-card ${
              wsConnected ? "connected" : "disconnected"
            }`}
          >
            <CardContent>
              <Typography variant="subtitle2" className="scanner-counter-title">
                {wsConnected
                  ? t("scanner.peopleCounter")
                  : t("scanner.connecting")}
              </Typography>
              <Typography variant="h2" className="scanner-counter-number">
                {peopleCount}
              </Typography>
              <Typography variant="caption" className="scanner-counter-status">
                {wsConnected ? t("scanner.live") : t("scanner.disconnected")}
              </Typography>
            </CardContent>
          </Card>

          {/* Cliente Card Section */}
          <Box className="scanner-info-container">
            {loading && <CircularProgress />}
            {error && <div className="scanner-error-message">{error}</div>}
            {cliente && (
              <div className="scanner-cliente-wrapper">
                <ClienteCard cliente={cliente} />
                <div className="scanner-instructions-small">
                  {t("scanner.instructions")}
                </div>
              </div>
            )}
            {!cliente && !loading && !error && (
              <div className="scanner-instructions-normal">
                {t("scanner.instructions")}
              </div>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ScannerPage;
