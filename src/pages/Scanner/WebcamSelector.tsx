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

      // Carica sorgente corrente dal backend
      try {
        const response = await fetch(`${AI_SERVICE_URL}/api/video-source`);
        if (response.ok) {
          const data = await response.json();
          setCurrentSource(data.source);
          setSelectedSource(data.source);
        }
      } catch (err) {
        console.warn("Could not fetch current source from AI service:", err);
        // Usa default
        setCurrentSource("0");
        setSelectedSource("0");
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
    if (selectedSource === currentSource) {
      return; // Nessun cambio
    }

    setChanging(true);
    setError(null);
    setSuccess(false);

    try {
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
      setSuccess(true);

      // Nascondi success message dopo 3 secondi
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error changing video source:", err);
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
                  disabled={changing || selectedSource === currentSource}
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
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default WebcamSelector;
