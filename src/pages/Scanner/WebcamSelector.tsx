import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  IconButton,
  Collapse,
  Slider,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useTranslation } from "react-i18next";

const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8001";

interface BrowserCamera {
  deviceId: string;
  label: string;
  index: number;
}

const WebcamSelector: React.FC = () => {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState<BrowserCamera[]>([]);
  const [currentSource, setCurrentSource] = useState<string>("0");
  const [selectedSource, setSelectedSource] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentLineRatio, setCurrentLineRatio] = useState<number>(0.5);
  const [selectedLineRatio, setSelectedLineRatio] = useState<number>(0.5);

  // Carica lista webcam dal BROWSER (più affidabile!)
  const loadCamerasFromBrowser = async () => {
    setLoading(true);
    setError(null);

    try {
      // Richiedi permesso e rileva webcam tramite browser API
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      const browserCameras: BrowserCamera[] = videoDevices.map(
        (device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index}`,
          index: index,
        }),
      );

      setCameras(browserCameras);

      // Carica sorgente corrente dal backend e applica la preferenza salvata
      try {
        const response = await fetch(`${AI_SERVICE_URL}/api/video-source`);
        if (response.ok) {
          const data = await response.json();
          setCurrentSource(data.source);
          setSelectedSource(data.source);

          // Controlla Electron Store per vedere se avevamo un'altra preferenza
          if (window.electronAPI?.getStoreValue) {
            const savedSource =
              await window.electronAPI.getStoreValue("preferred-webcam");

            // Se c'è una preferenza salvata diversa, ed è disponibile
            if (
              savedSource &&
              savedSource !== data.source &&
              browserCameras.some((c) => String(c.index) === savedSource)
            ) {
              setSelectedSource(savedSource);
              console.log("Applying saved webcam preference:", savedSource);

              // Applica la preferenza in background
              fetch(`${AI_SERVICE_URL}/api/video-source`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: savedSource }),
              })
                .then((res) => res.json())
                .then((resData) => {
                  if (resData.source) {
                    setCurrentSource(resData.source);
                  }
                })
                .catch((err) =>
                  console.warn("Failed to apply saved webcam:", err),
                );
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch current source from AI service:", err);
        // Usa default
        setCurrentSource("0");
        setSelectedSource("0");
      }

      // Load line ratio
      try {
        const lineResponse = await fetch(`${AI_SERVICE_URL}/api/line-ratio`);
        if (lineResponse.ok) {
          const lineData = await lineResponse.json();
          let ratio = lineData.line_y_ratio;

          if (window.electronAPI?.getStoreValue) {
            const savedRatioStr = await window.electronAPI.getStoreValue(
              "preferred-line-ratio",
            );
            if (savedRatioStr !== undefined && savedRatioStr !== null) {
              const savedRatio = parseFloat(savedRatioStr);
              if (
                !isNaN(savedRatio) &&
                savedRatio >= 0 &&
                savedRatio <= 1 &&
                savedRatio !== ratio
              ) {
                ratio = savedRatio;
                console.log(
                  "Applying saved line ratio preference:",
                  savedRatio,
                );
                fetch(`${AI_SERVICE_URL}/api/line-ratio`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ line_y_ratio: savedRatio }),
                }).catch((err) =>
                  console.warn("Failed to apply saved line ratio:", err),
                );
              }
            }
          }
          setCurrentLineRatio(ratio);
          setSelectedLineRatio(ratio);
        }
      } catch (err) {
        console.warn("Could not fetch line ratio from AI service:", err);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore accesso alle webcam del browser",
      );
      console.error("Error loading cameras from browser:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamerasFromBrowser();
  }, []);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedSource(event.target.value);
    setSuccess(false);
  };

  const handleApply = async () => {
    if (
      selectedSource === currentSource &&
      selectedLineRatio === currentLineRatio
    ) {
      return; // Nessun cambio
    }

    setChanging(true);
    setError(null);
    setSuccess(false);

    try {
      if (selectedSource !== currentSource) {
        const response = await fetch(`${AI_SERVICE_URL}/api/video-source`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: selectedSource }),
        });

        if (!response.ok) {
          throw new Error("Failed to change video source");
        }

        const data = await response.json();
        setCurrentSource(data.source);

        // Salva preferenza in Electron Store
        if (window.electronAPI?.setStoreValue) {
          await window.electronAPI.setStoreValue(
            "preferred-webcam",
            selectedSource,
          );
        }
      }

      if (selectedLineRatio !== currentLineRatio) {
        const lineResponse = await fetch(`${AI_SERVICE_URL}/api/line-ratio`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ line_y_ratio: selectedLineRatio }),
        });

        if (!lineResponse.ok) {
          throw new Error("Failed to change line ratio");
        }

        const lineData = await lineResponse.json();
        setCurrentLineRatio(lineData.line_y_ratio);

        // Salva preferenza in Electron Store
        if (window.electronAPI?.setStoreValue) {
          await window.electronAPI.setStoreValue(
            "preferred-line-ratio",
            selectedLineRatio.toString(),
          );
        }
      }

      setSuccess(true);
      // Nascondi success message dopo 3 secondi
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error applying settings:", err);
    } finally {
      setChanging(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          color="primary"
        >
          <SettingsIcon />
        </IconButton>
        <Box sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}>
          {t("webcam.settings", "Impostazioni Webcam")}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={20} />
              <Box sx={{ fontSize: 14 }}>
                {t("webcam.loading", "Caricamento webcam...")}
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel id="webcam-select-label">
                    <VideocamIcon
                      sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                    />
                    {t("webcam.selectCamera", "Seleziona Webcam")}
                  </InputLabel>
                  <Select
                    labelId="webcam-select-label"
                    value={selectedSource}
                    onChange={handleChange}
                    label={t("webcam.selectCamera", "Seleziona Webcam")}
                  >
                    {cameras.map((camera) => (
                      <MenuItem key={camera.index} value={String(camera.index)}>
                        {camera.label}
                        {String(camera.index) === currentSource && " ✓ Attiva"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApply}
                  disabled={
                    changing ||
                    (selectedSource === currentSource &&
                      selectedLineRatio === currentLineRatio)
                  }
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {changing ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      {t("webcam.applying", "Applicando...")}
                    </>
                  ) : (
                    t("webcam.apply", "Applica")
                  )}
                </Button>

                <IconButton
                  size="small"
                  onClick={loadCamerasFromBrowser}
                  disabled={loading}
                  title={t("webcam.refresh", "Aggiorna lista")}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>

              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {t(
                    "webcam.successMessage",
                    "Webcam cambiata con successo! Il video verrà aggiornato tra pochi secondi.",
                  )}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {t("webcam.errorMessage", "Errore")}: {error}
                </Alert>
              )}

              {cameras.length === 0 && !loading && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {t(
                    "webcam.noCameras",
                    "Nessuna webcam rilevata. Assicurati che sia collegata e non in uso da altre applicazioni.",
                  )}
                </Alert>
              )}

              {cameras.length > 0 &&
                cameras.some((c) => c.label.startsWith("Camera ")) && (
                  <Alert severity="info" sx={{ mt: 2, fontSize: 12 }}>
                    💡{" "}
                    {t(
                      "webcam.permissionHint",
                      "Per vedere i nomi reali delle webcam, concedi i permessi quando richiesto dal browser.",
                    )}
                  </Alert>
                )}

              <Box sx={{ mt: 3 }}>
                <Typography gutterBottom>
                  {t("webcam.lineRatio", "Altezza Linea di Rilevamento")} (
                  {Math.round(selectedLineRatio * 100)}%)
                </Typography>
                <Slider
                  value={selectedLineRatio}
                  onChange={(_, val) => setSelectedLineRatio(val as number)}
                  step={0.05}
                  marks
                  min={0.1}
                  max={0.9}
                  sx={{ width: "100%", maxWidth: 300 }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                />
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default WebcamSelector;
