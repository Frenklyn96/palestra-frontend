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
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import DownloadIcon from "@mui/icons-material/Download";
import ClienteCard from "../../features/components/clienteCard/ClienteCard";
import WebcamSelector from "./WebcamSelector";
import QrDeviceSelector from "./QrDeviceSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  fetchClienteById,
  removeSelectCliente,
  selectCliente,
} from "../../features/slice/clientiSlice";
import { processQrScanAsync } from "../../features/slice/entrancesSlice";
import { decrementPeopleCounter } from "../../features/api/AICounterService";
import { useTranslation } from "react-i18next";
import "./ScannerPage.css";

const ScannerPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.userId);
  const isElectron = !!(window as any).electronAPI;

  const cliente = useSelector(
    (state: RootState) => state.clienti.selectedCliente,
  );
  const loading = useSelector(
    (state: RootState) => state.clienti.loadingSelectedCliente,
  );
  const [error, setError] = useState<string | null>(null);
  const [decrementFeedback, setDecrementFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [scannedCode, setScannedCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScannedRef = useRef<string | null>(null);

  // Listener IPC Electron: qr-processed
  // Il main process ha già registrato l'ingresso e recuperato i dati — qui aggiorniamo solo la UI
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onQrProcessed) return;

    const unsub = electronAPI.onQrProcessed((result: any) => {
      const id = String(result.code ?? "")
        .trim()
        .replace(/'/g, "-");
      if (!id) return;
      if (id === lastScannedRef.current) return; // dedup
      lastScannedRef.current = id;
      setError(null);

      if (result.cliente) {
        dispatch(selectCliente(result.cliente));
      } else {
        dispatch(removeSelectCliente());
      }

      if (!result.success && result.errorMessage) {
        setError(result.errorMessage);
      }

      if (result.success) {
        setPeopleCount((prev) => Math.max(0, prev - 1));
      }
    });

    return unsub;
  }, [dispatch]);

  // Listener DOM keydown — fallback per browser/non-Electron o quando la pagina è in focus
  // In modalità Electron le chiamate BE vengono fatte dal main process via processQrCode (sopra).
  // Qui manteniamo il fallback per garantire funzionamento in tutti gli ambienti.
  const processQrCode = useCallback(
    async (id: string) => {
      if (!id) return;
      if (id === lastScannedRef.current) return;
      lastScannedRef.current = id;
      setError(null);
      dispatch(removeSelectCliente());

      try {
        await dispatch(fetchClienteById(id)).unwrap();
        const result = await dispatch(
          processQrScanAsync({ clienteId: id, userId: userId! }),
        ).unwrap();

        if (result.success && result.entrance) {
          setPeopleCount((prev) => Math.max(0, prev - 1));
          try {
            await decrementPeopleCounter();
          } catch (err) {
            console.error(t("scanner.errorDecrement"), err);
          }
        } else if (!result.success && result.errorMessage) {
          setError(result.errorMessage);
        }
      } catch (err: any) {
        console.error(t("scanner.errorFetchCliente"), err);
        setError(t("scanner.notFound"));
      }
    },
    [dispatch, userId, t],
  );

  // Listener DOM keydown — fallback per browser o quando Electron è in focus sulla pagina
  useEffect(() => {
    inputRef.current?.focus();
    let buffer = "";
    let timeoutId: NodeJS.Timeout;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement &&
        e.target !== inputRef.current
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (!buffer) return;
        const id = buffer.trim().replace(/'/g, "-");
        buffer = "";
        setScannedCode("");
        await processQrCode(id);
      } else {
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
  }, [processQrCode]);

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

            // People count update
            if (
              data.type === "people_count" ||
              typeof data.enter === "number"
            ) {
              setPeopleCount(data.enter);
            }

            // QR processato da Python (BE già chiamato, solo aggiornamento UI)
            if (data.type === "qr_processed" && typeof data.code === "string") {
              const id = data.code.trim().replace(/'/g, "-");
              if (id && id !== lastScannedRef.current) {
                lastScannedRef.current = id;
                setError(null);

                if (data.cliente) {
                  dispatch(selectCliente(data.cliente));
                } else {
                  dispatch(removeSelectCliente());
                }

                if (!data.success && data.errorMessage) {
                  setError(data.errorMessage);
                }

                if (data.success) {
                  setPeopleCount((prev) => Math.max(0, prev - 1));
                }
              }
            }

            // Fallback legacy: qr_scan senza be_url configurato in Python
            if (data.type === "qr_scan" && typeof data.code === "string") {
              const id = data.code.trim().replace(/'/g, "-");
              processQrCode(id);
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

  if (!isElectron) {
    return (
      <Paper
        className="scanner-page-paper"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 3,
          p: 4,
          textAlign: "center",
        }}
      >
        <DesktopWindowsIcon sx={{ fontSize: 80, color: "primary.main" }} />
        <Typography variant="h4" gutterBottom>
          {t(
            "scanner.electronRequired",
            "Funzionalità Scanner non disponibile nel browser",
          )}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mb: 2 }}
        >
          {t(
            "scanner.electronDescription",
            "Per utilizzare lo scanner QR e l'intercettazione hardware della webcam, è necessario scaricare ed utilizzare l'applicazione Desktop ufficiale della Palestra.",
          )}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<DownloadIcon />}
          href="/README-INSTALLER.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("scanner.downloadApp", "Scarica l'App Desktop")}
        </Button>
      </Paper>
    );
  }

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

          {/* Selettore dispositivo scanner QR (solo Electron) */}
          <QrDeviceSelector />

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
