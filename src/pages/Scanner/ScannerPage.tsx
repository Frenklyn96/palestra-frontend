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
import { useTranslation } from "react-i18next";

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
    console.error("QR error", err);
    setError(String(err));
  };

  // WebSocket connection logic
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_PEOPLE_COUNTER_URL;
        console.log("Connecting to WebSocket:", wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket connected to People Counter");
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
            console.log("Received from WebSocket:", data);

            // Update people count from the 'enter' field
            if (typeof data.enter === "number") {
              setPeopleCount(data.enter);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected, attempting to reconnect...");
          setWsConnected(false);

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("Error connecting to WebSocket:", err);
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
    const streamUrl =
      import.meta.env.VITE_AI_STREAM_URL || "http://localhost:8000/video_feed";
    setAiStreamUrl(streamUrl);
    setAiStreamConnected(true);
  }, []);

  return (
    <Paper sx={{ padding: 2 }}>
      <h1>{t("scanner.title")}</h1>

      <Box sx={{ display: "flex", gap: 2, height: "600px" }}>
        {/* Scanner QR a sinistra */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
              borderRadius: 1,
            }}
          >
            <Scanner
              onScan={(result: any) => {
                if (!result || result.length === 0) return;

                const id = result[0]?.rawValue;
                console.log("Extracted ID:", id);

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
                        const counterUrl = import.meta.env
                          .VITE_WS_PEOPLE_COUNTER_URL
                          ? import.meta.env.VITE_WS_PEOPLE_COUNTER_URL.replace(
                              "ws://",
                              "http://",
                            ).replace("/ws", "/api/decrement")
                          : "http://localhost:8000/api/decrement";

                        await fetch(counterUrl, { method: "POST" });
                      } catch (err) {
                        console.error(
                          "Errore nel decremento del contatore",
                          err,
                        );
                      }
                    }
                  })
                  .catch((err: any) => {
                    console.error("Errore fetchClienteById", err);
                    setError(t("scanner.notFound"));
                  });
              }}
              onError={handleError}
              constraints={{ facingMode: "environment" }}
            />
          </Box>
        </Box>

        {/* Video Stream AI nel centro */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Card
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent
              sx={{
                padding: 1,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
                background: "#000",
              }}
            >
              {aiStreamConnected && aiStreamUrl ? (
                <>
                  <img
                    src={aiStreamUrl}
                    alt="AI Video Stream"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: "4px",
                    }}
                    onError={(e) => {
                      setTimeout(() => {
                        setAiStreamUrl((prevUrl) => {
                          const base = prevUrl.split("?")[0];
                          return `${base}?retry=${Date.now()}`;
                        });
                      }, 3000);
                    }}
                    onLoad={() => setAiStreamConnected(true)}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(0, 255, 0, 0.7)",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    🎥 AI Stream
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: "center", color: "white" }}>
                  <CircularProgress sx={{ marginBottom: 2 }} />
                  <Typography variant="body2">
                    Connecting to AI stream...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Info a destra: conteggio persone + cliente */}
        <Box
          sx={{
            width: "320px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
            gap: 2,
          }}
        >
          {/* People Counter Card */}
          <Card
            sx={{
              background: wsConnected
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "#f5f5f5",
              color: wsConnected ? "white" : "#666",
              textAlign: "center",
              transition: "all 0.3s ease",
              boxShadow: wsConnected
                ? "0 4px 20px rgba(102, 126, 234, 0.4)"
                : "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ opacity: 0.9, marginBottom: 1 }}
              >
                {wsConnected ? "People Counter 👥" : "Connecting..."}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontSize: "64px",
                  fontWeight: "bold",
                  margin: 0,
                  transition: "transform 0.2s ease",
                }}
              >
                {peopleCount}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {wsConnected ? "Live" : "Disconnected"}
              </Typography>
            </CardContent>
          </Card>

          {/* Cliente Card Section */}
          <Box sx={{ overflowY: "auto", flex: 1 }}>
            {loading && <CircularProgress />}
            {error && (
              <div
                style={{ color: "red", textAlign: "center", fontSize: "14px" }}
              >
                {error}
              </div>
            )}
            {cliente && (
              <div style={{ width: "100%" }}>
                <ClienteCard cliente={cliente} />
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#999",
                    marginTop: "8px",
                  }}
                >
                  {t("scanner.instructions")}
                </div>
              </div>
            )}
            {!cliente && !loading && !error && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
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
