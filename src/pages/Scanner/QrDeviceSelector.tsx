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
  Typography,
  Chip,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";

const AI_SERVICE_URL =
  import.meta.env.VITE_AI_API_URL?.replace("/api", "") ||
  "http://localhost:8001";

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface HidDevice {
  vendorId: number;
  productId: number;
  manufacturer: string;
  product: string;
  serialNumber: string;
  path: string;
  usagePage?: number;
  usage?: number;
  label: string;
}

type ScannerMode = "disabled" | "global-hook" | "hid";

// Valori speciali nel Select
const SEL_DISABLED = "__disabled__";
const SEL_GLOBAL = "__global__";

function deviceKey(d: HidDevice): string {
  return `${d.vendorId}:${d.productId}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

const QrDeviceSelector: React.FC = () => {
  const { t } = useTranslation();

  const [devices, setDevices] = useState<HidDevice[]>([]);
  // selectedKey = SEL_DISABLED | SEL_GLOBAL | "vendorId:productId"
  const [selectedKey, setSelectedKey] = useState<string>(SEL_DISABLED);
  // stato attivo sul backend
  const [activeMode, setActiveMode] = useState<ScannerMode>("disabled");
  const [activeDevice, setActiveDevice] = useState<HidDevice | null>(null);

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ── Carica dispositivi e stato corrente ───────────────────────────────────

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devicesRes, statusRes] = await Promise.all([
        fetch(`${AI_SERVICE_URL}/api/input-devices`),
        fetch(`${AI_SERVICE_URL}/api/scanner-device`),
      ]);

      if (!devicesRes.ok) throw new Error("Errore caricamento dispositivi");
      const list: HidDevice[] = await devicesRes.json();
      setDevices(list);

      if (statusRes.ok) {
        const status: { mode: ScannerMode; device: HidDevice | null } =
          await statusRes.json();
        setActiveMode(status.mode);
        setActiveDevice(status.device ?? null);

        let latestKey = SEL_DISABLED;
        if (status.mode === "hid" && status.device) {
          latestKey = deviceKey(status.device);
        } else if (status.mode === "global-hook") {
          latestKey = SEL_GLOBAL;
        }

        // Se è disabilitato (al riavvio lo è sempre di default) guarda lo Store
        if (status.mode === "disabled" && window.electronAPI?.getStoreValue) {
          const savedMode = await window.electronAPI.getStoreValue(
            "preferred-scanner-mode",
          );
          const savedDevice = await window.electronAPI.getStoreValue(
            "preferred-scanner-device",
          );

          if (savedMode === "hid" && savedDevice) {
            const found = list.find(
              (d) =>
                d.vendorId === savedDevice.vendorId &&
                d.productId === savedDevice.productId,
            );
            if (found) {
              console.log("Applying saved scanner device:", found.label);
              latestKey = deviceKey(found);

              fetch(`${AI_SERVICE_URL}/api/scanner-device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vendorId: found.vendorId,
                  productId: found.productId,
                  label: found.label,
                }),
              })
                .then(() => {
                  setActiveMode("hid");
                  setActiveDevice(found);
                })
                .catch((e) => console.warn("Failed to apply saved scanner", e));
            }
          } else if (savedMode === "global-hook") {
            latestKey = SEL_GLOBAL;
            console.log("Applying saved scanner mode: global-hook");

            fetch(`${AI_SERVICE_URL}/api/scanner-device`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "global-hook" }),
            })
              .then(() => {
                setActiveMode("global-hook");
                setActiveDevice(null);
              })
              .catch((e) =>
                console.warn("Failed to apply saved global-hook scanner", e),
              );
          }
        }

        setSelectedKey(latestKey);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore caricamento dispositivi HID",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedKey(event.target.value);
    setSuccess(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    setSuccess(false);

    try {
      if (selectedKey === SEL_DISABLED) {
        // Disattiva scanner
        const res = await fetch(`${AI_SERVICE_URL}/api/scanner-device`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Impossibile disattivare lo scanner");
        setActiveMode("disabled");
        setActiveDevice(null);

        if (window.electronAPI?.setStoreValue) {
          window.electronAPI.setStoreValue(
            "preferred-scanner-mode",
            "disabled",
          );
          window.electronAPI.setStoreValue("preferred-scanner-device", null);
        }
      } else if (selectedKey === SEL_GLOBAL) {
        // Attiva global hook (tastiera parzialmente intercettata)
        const res = await fetch(`${AI_SERVICE_URL}/api/scanner-device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "global-hook" }),
        });
        if (!res.ok) throw new Error("Impossibile attivare il global hook");
        setActiveMode("global-hook");
        setActiveDevice(null);

        if (window.electronAPI?.setStoreValue) {
          window.electronAPI.setStoreValue(
            "preferred-scanner-mode",
            "global-hook",
          );
          window.electronAPI.setStoreValue("preferred-scanner-device", null);
        }
      } else {
        // HID specifico
        const device = devices.find((d) => deviceKey(d) === selectedKey);
        if (!device) throw new Error("Dispositivo non trovato");

        const res = await fetch(`${AI_SERVICE_URL}/api/scanner-device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId: device.vendorId,
            productId: device.productId,
            label: device.label,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Impossibile aprire il dispositivo");
        }
        setActiveMode("hid");
        setActiveDevice(device);

        if (window.electronAPI?.setStoreValue) {
          window.electronAPI.setStoreValue("preferred-scanner-mode", "hid");
          window.electronAPI.setStoreValue("preferred-scanner-device", {
            vendorId: device.vendorId,
            productId: device.productId,
          });
        }
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  const isChanged = () => {
    if (activeMode === "disabled" && selectedKey !== SEL_DISABLED) return true;
    if (activeMode === "global-hook" && selectedKey !== SEL_GLOBAL) return true;
    if (
      activeMode === "hid" &&
      activeDevice &&
      selectedKey !== deviceKey(activeDevice)
    )
      return true;
    if (activeMode === "hid" && !activeDevice && selectedKey !== SEL_DISABLED)
      return true;
    return false;
  };

  // ── Etichetta e colore stato attivo ───────────────────────────────────────

  const activeChip = () => {
    if (activeMode === "disabled")
      return (
        <Chip
          label={t("qrDevice.inactive", "Inattivo")}
          size="small"
          color="default"
        />
      );
    if (activeMode === "global-hook")
      return (
        <Chip
          label={t("qrDevice.modeGlobalHook", "Hook globale")}
          size="small"
          color="warning"
        />
      );
    return (
      <Chip
        label={activeDevice?.label ?? t("qrDevice.modeHid", "HID specifico")}
        size="small"
        color="success"
      />
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ mb: 2 }}>
      {/* Header collassabile */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          color="primary"
        >
          <SettingsIcon />
        </IconButton>
        <Box sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}>
          {t("qrDevice.settings", "Impostazioni Scanner QR")}
        </Box>
        {activeChip()}
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            backgroundColor: "background.paper",
          }}
        >
          {/* Icona + descrizione */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <QrCodeScannerIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {t(
                "qrDevice.description",
                "Seleziona il dispositivo USB del tuo scanner QR per intercettare solo quello, senza bloccare la tastiera.",
              )}
            </Typography>
          </Box>

          {/* Feedback */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 1 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {t("qrDevice.applySuccess", "Impostazione applicata")}
            </Alert>
          )}

          {/* Selettore */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <FormControl size="small" sx={{ flexGrow: 1 }}>
              <InputLabel>
                {t("qrDevice.selectLabel", "Modalità scanner")}
              </InputLabel>
              <Select<string>
                value={loading ? "" : selectedKey}
                label={t("qrDevice.selectLabel", "Modalità scanner")}
                onChange={handleChange}
                disabled={loading || applying}
              >
                {/* Opzione: disattivato */}
                <MenuItem value={SEL_DISABLED}>
                  <em>{t("qrDevice.disabled", "Disattivato")}</em>
                </MenuItem>

                {/* Opzione: global hook (con avviso) */}
                <MenuItem value={SEL_GLOBAL}>
                  ⚠️{" "}
                  {t(
                    "qrDevice.globalHookOption",
                    "Hook globale (tutti i dispositivi)",
                  )}
                </MenuItem>

                {/* Dispositivi HID */}
                {devices.length > 0 && (
                  <MenuItem disabled sx={{ fontSize: 11, opacity: 0.6 }}>
                    — {t("qrDevice.specificDevices", "Dispositivi specifici")} —
                  </MenuItem>
                )}
                {devices.map((d) => (
                  <MenuItem key={deviceKey(d)} value={deviceKey(d)}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              size="small"
              onClick={loadDevices}
              disabled={loading || applying}
              title={t("qrDevice.refresh", "Aggiorna lista")}
            >
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Box>

          {/* Avviso modalità global hook */}
          {selectedKey === SEL_GLOBAL && (
            <Alert severity="warning" sx={{ mt: 1 }} icon={false}>
              <Typography variant="caption">
                {t(
                  "qrDevice.globalHookWarning",
                  "In modalità hook globale l'input da tastiera viene intercettato da tutti i dispositivi. La digitazione manuale potrebbe essere disturbata durante una scansione rapida.",
                )}
              </Typography>
            </Alert>
          )}

          {/* Applica */}
          <Button
            variant="contained"
            size="small"
            sx={{ mt: 1.5 }}
            onClick={handleApply}
            disabled={applying || loading || !isChanged()}
            startIcon={applying ? <CircularProgress size={14} /> : undefined}
          >
            {applying
              ? t("qrDevice.applying", "Applicando...")
              : t("qrDevice.apply", "Applica")}
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
};

export default QrDeviceSelector;
