import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { Scanner } from "@yudiel/react-qr-scanner";
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

  // WebSocket states
  const [peopleCount, setPeopleCount] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Stream states
  const [aiStreamUrl, setAiStreamUrl] = useState<string>("");
  const [aiStreamConnected, setAiStreamConnected] = useState<boolean>(false);

  const handleError = (err: any) => {
    console.error(t("scanner.qrError"), err);
    setError(String(err));
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

  return (
    <Paper className="scanner-page-paper">
      <h1>{t("scanner.title")}</h1>

      <Box className="scanner-main-layout">
        {/* Scanner QR a sinistra */}
        <Box className="scanner-left-panel">
          <Box className="scanner-qr-box">
            <Scanner
              onScan={(result: any) => {
                if (!result || result.length === 0) return;

                const id = result[0]?.rawValue;
                console.log(t("scanner.extractedId"), id);

                if (!id) return;

                // Se scansioni lo stesso QR, ignora
                if (id === lastScanned) return;

                // Nuovo QR: resetta e fattispone la nuova ricerca
                setLastScanned(id);
                setError(null);
                dispatch(fetchClienteById(id))
                  .unwrap()
                  .then(async (res: any) => {
                    // Controlla la validità dell'abbonamento valutando la data 'scadenza'
                    const isAbbonamentoValido =
                      res.scadenza && new Date(res.scadenza) >= new Date();

                    if (isAbbonamentoValido) {
                      // 1. Decrementa l'interfaccia istantaneamente limitando a 0 il minimo
                      setPeopleCount((prev) => Math.max(0, prev - 1));

                      // 2. Manda la chiamata POST all'AI-backend per togliere 1 dal contatore fisico generale
                      try {
                        await decrementPeopleCounter();
                      } catch (err) {
                        console.error(t("scanner.errorDecrement"), err);
                      }
                    }
                  })
                  .catch((err: any) => {
                    console.error(t("scanner.errorFetchCliente"), err);
                    setError(t("scanner.notFound"));
                  });
              }}
              onError={handleError}
              constraints={{ facingMode: "environment" }}
            />
          </Box>
        </Box>

        {/* Video Stream AI nel centro */}
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
