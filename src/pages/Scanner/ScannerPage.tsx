import React, { useState, useEffect, useRef } from "react";
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
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ClienteCard from "../../features/components/clienteCard/ClienteCard";
import WebcamSelector from "./WebcamSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  fetchClienteById,
  removeSelectCliente,
} from "../../features/slice/clientiSlice";
import { processQrScanAsync } from "../../features/slice/entrancesSlice";
import { decrementPeopleCounter } from "../../features/api/AICounterService";
import { useTranslation } from "react-i18next";
import "./ScannerPage.css";

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

        // Reset del cliente precedente per mostrare il caricamento
        dispatch(removeSelectCliente());

        try {
          // Prima recupera SEMPRE i dati del cliente per mostrare la card
          await dispatch(fetchClienteById(id)).unwrap();

          // Poi chiama l'endpoint qr-scan per validare e registrare l'ingresso
          const result = await dispatch(
            processQrScanAsync({ clienteId: id, userId: userId! }),
          ).unwrap();

          if (result.success && result.entrance) {
            // Ingresso effettuato con successo
            // Decrementa il contatore persone
            setPeopleCount((prev) => Math.max(0, prev - 1));
            try {
              await decrementPeopleCounter();
            } catch (err) {
              console.error(t("scanner.errorDecrement"), err);
            }
          } else if (!result.success && result.errorMessage) {
            // Mostra l'errore (abbonamento scaduto o ingresso recente)
            // La card del cliente è già visualizzata
            setError(result.errorMessage);
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
  }, [dispatch, lastScanned, t, userId]);

  // WebSocket states
  const [peopleCount, setPeopleCount] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Stream states
  const [aiStreamUrl, setAiStreamUrl] = useState<string>("");
  const [aiStreamConnected, setAiStreamConnected] = useState<boolean>(false);
  const [aiServiceReachable, setAiServiceReachable] = useState<boolean>(true);

  // Handler per il bottone di decremento manuale
  const handleManualDecrement = async () => {
    try {
      await decrementPeopleCounter();
      setPeopleCount((prev) => Math.max(0, prev - 1));
      setDecrementFeedback({
        type: "success",
        message: t("scanner.decrementSuccess"),
      });
      // Nascondi il feedback dopo 2 secondi
      setTimeout(() => setDecrementFeedback(null), 2000);
    } catch (err) {
      console.error(t("scanner.errorDecrement"), err);
      setDecrementFeedback({
        type: "error",
        message: t("scanner.decrementError"),
      });
      // Nascondi il feedback dopo 3 secondi
      setTimeout(() => setDecrementFeedback(null), 3000);
    }
  };

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

  // Health-check for AI service. If it is offline, show installer download.
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_AI_API_URL;

    if (!apiUrl) {
      setAiServiceReachable(false);
      return;
    }

    let mounted = true;

    const checkHealth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(`${apiUrl}/health`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!mounted) return;
        setAiServiceReachable(response.ok);
      } catch (err) {
        if (!mounted) return;
        setAiServiceReachable(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkHealth();
    const intervalId = setInterval(checkHealth, 10000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
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
          {/* Selettore Webcam */}
          {aiServiceReachable && <WebcamSelector />}

          {!aiServiceReachable && (
            <Alert severity="warning" className="scanner-ai-warning">
              <Typography variant="subtitle2" gutterBottom>
                {t("scanner.aiServiceOfflineTitle")}
              </Typography>
              <Typography variant="body2" className="scanner-ai-warning-text">
                {t("scanner.aiServiceOfflineBody")}
              </Typography>
              <Button
                variant="contained"
                size="small"
                className="scanner-ai-installer-btn"
                href="/ai-installer.zip"
                download
              >
                {t("scanner.downloadInstaller")}
              </Button>
            </Alert>
          )}
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

              {/* Bottone decremento manuale */}
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Tooltip title={t("scanner.decrementButton")}>
                  <IconButton
                    onClick={handleManualDecrement}
                    disabled={!wsConnected || peopleCount === 0}
                    color="primary"
                    sx={{
                      bgcolor: "background.paper",
                      "&:hover": { bgcolor: "action.hover" },
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Tooltip>

                {/* Feedback decremento */}
                {decrementFeedback && (
                  <Alert
                    severity={decrementFeedback.type}
                    sx={{ mt: 1, py: 0, fontSize: "0.75rem" }}
                  >
                    {decrementFeedback.message}
                  </Alert>
                )}
              </Box>
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
