import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  Chip,
} from "@mui/material";
import { Tariffa, TemplateField } from "../../class/Tariffa";

interface Props {
  open: boolean;
  tariffa: Tariffa;
  onClose: () => void;
  onSave: (fields: TemplateField[]) => void;
}

const FIELD_COLORS: Record<string, string> = {
  NOME: "#1565C0",
  COGNOME: "#1565C0",
  NUMERO_TESSERA: "#2E7D32",
  SCADENZA: "#E65100",
  INGRESSI: "#6A1B9A",
  QR: "#C62828",
};

const FIELD_LABELS: Record<string, string> = {
  NOME: "NOME",
  COGNOME: "COGNOME",
  NUMERO_TESSERA: "N.TESSERA",
  SCADENZA: "SCADENZA",
  INGRESSI: "INGRESSI",
  QR: "QR CODE",
};

const MAX_DISPLAY_WIDTH = 680;

const getDefaultFields = (
  w: number,
  h: number,
  toCount: boolean,
): TemplateField[] => {
  const fields: TemplateField[] = [
    {
      key: "NOME",
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.38),
      fontSize: Math.round(h * 0.08),
      color: "#FFFFFF",
      bold: true,
      width: 0,
      height: 0,
    },
    {
      key: "COGNOME",
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.52),
      fontSize: Math.round(h * 0.08),
      color: "#FFFFFF",
      bold: true,
      width: 0,
      height: 0,
    },
    {
      key: "NUMERO_TESSERA",
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.66),
      fontSize: Math.round(h * 0.06),
      color: "#FFFFFF",
      bold: false,
      width: 0,
      height: 0,
    },
    {
      key: "SCADENZA",
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.78),
      fontSize: Math.round(h * 0.055),
      color: "#FFFFFF",
      bold: false,
      width: 0,
      height: 0,
    },
    {
      key: "QR",
      x: Math.round(w * 0.7),
      y: Math.round(h * 0.12),
      fontSize: 0,
      color: "#000000",
      bold: false,
      width: Math.round(h * 0.6),
      height: Math.round(h * 0.6),
    },
  ];
  if (toCount) {
    fields.push({
      key: "INGRESSI",
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.91),
      fontSize: Math.round(h * 0.055),
      color: "#FFFFFF",
      bold: false,
      width: 0,
      height: 0,
    });
  }
  return fields;
};

const TemplateFieldEditor: React.FC<Props> = ({
  open,
  tariffa,
  onClose,
  onSave,
}) => {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef<{
    key: string;
    startMx: number;
    startMy: number;
    startFx: number;
    startFy: number;
  } | null>(null);
  const scaleRef = useRef(1);

  const imageUrl = `${import.meta.env.VITE_BE_URL_LOCAL}/api/Tariffe/${tariffa.id}/template-image`;

  // Always keep scaleRef up-to-date
  scaleRef.current = naturalSize.w > 0 ? displaySize.w / naturalSize.w : 1;

  const handleImageLoad = () => {
    const img = imageRef.current!;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const dw = Math.min(nw, MAX_DISPLAY_WIDTH);
    const dh = Math.round(nh * (dw / nw));
    setNaturalSize({ w: nw, h: nh });
    setDisplaySize({ w: dw, h: dh });
    setImageLoaded(true);

    if (tariffa.templateFieldsJson) {
      try {
        const parsed = JSON.parse(
          tariffa.templateFieldsJson,
        ) as TemplateField[];
        const hasIngressi = parsed.some((f) => f.key === "INGRESSI");
        if (tariffa.toCount && !hasIngressi) {
          parsed.push({
            key: "INGRESSI",
            x: Math.round(nw * 0.05),
            y: Math.round(nh * 0.91),
            fontSize: Math.round(nh * 0.055),
            color: "#FFFFFF",
            bold: false,
            width: 0,
            height: 0,
          });
        }
        setFields(parsed);
        return;
      } catch {}
    }
    setFields(getDefaultFields(nw, nh, tariffa.toCount ?? false));
  };

  const handleMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedKey(key);
    const field = fields.find((f) => f.key === key)!;
    const s = scaleRef.current;
    draggingRef.current = {
      key,
      startMx: e.clientX,
      startMy: e.clientY,
      startFx: field.x * s,
      startFy: field.y * s,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    const d = draggingRef.current;
    const s = scaleRef.current;
    const newDispX = d.startFx + (e.clientX - d.startMx);
    const newDispY = d.startFy + (e.clientY - d.startMy);
    setFields((prev) =>
      prev.map((f) =>
        f.key === d.key
          ? { ...f, x: Math.round(newDispX / s), y: Math.round(newDispY / s) }
          : f,
      ),
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (open) {
      setImageLoaded(false);
      setSelectedKey(null);
      setFields([]);
      setNaturalSize({ w: 1, h: 1 });
      setDisplaySize({ w: 1, h: 1 });
    }
  }, [open]);

  const updateField = (key: string, updates: Partial<TemplateField>) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...updates } : f)),
    );
  };

  const selectedField = fields.find((f) => f.key === selectedKey);
  const s = scaleRef.current;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Configura Campi Tessera — {tariffa.nome}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Trascina i campi per posizionarli. Clicca un campo per modificarne le
          proprietà.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
            alignItems: "flex-start",
          }}
        >
          {/* Template image + draggable overlays */}
          <Box
            sx={{
              position: "relative",
              width: displaySize.w,
              height: displaySize.h,
              flexShrink: 0,
              border: "1px solid #ccc",
              userSelect: "none",
              bgcolor: "#f5f5f5",
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="template"
              onLoad={handleImageLoad}
              style={{
                width: displaySize.w,
                height: displaySize.h,
                display: "block",
              }}
            />

            {imageLoaded &&
              fields.map((field) => {
                const dispX = field.x * s;
                const dispY = field.y * s;
                const color = FIELD_COLORS[field.key] ?? "#555";
                const isSelected = selectedKey === field.key;

                if (field.key === "QR") {
                  const dw = field.width * s;
                  const dh = field.height * s;
                  return (
                    <Box
                      key={field.key}
                      onMouseDown={(e) => handleMouseDown(e, field.key)}
                      sx={{
                        position: "absolute",
                        left: dispX,
                        top: dispY,
                        width: dw,
                        height: dh,
                        border: `2px dashed ${color}`,
                        boxSizing: "border-box",
                        cursor: "move",
                        outline: isSelected ? `3px solid ${color}` : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(198,40,40,0.08)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color, fontWeight: "bold", fontSize: 11 }}
                      >
                        QR
                      </Typography>
                    </Box>
                  );
                }

                return (
                  <Chip
                    key={field.key}
                    label={FIELD_LABELS[field.key]}
                    size="small"
                    onMouseDown={(e) => handleMouseDown(e as any, field.key)}
                    sx={{
                      position: "absolute",
                      left: dispX,
                      top: dispY - 14,
                      cursor: "move",
                      backgroundColor: color,
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 10,
                      height: 20,
                      outline: isSelected ? "2px solid #000" : "none",
                      zIndex: isSelected ? 10 : 5,
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                );
              })}
          </Box>

          {/* Properties panel */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" gutterBottom>
              Proprietà campo
            </Typography>
            {!selectedField ? (
              <Typography variant="body2" color="text.secondary">
                Clicca su un campo per modificarne le proprietà.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="body1" fontWeight="bold">
                  {FIELD_LABELS[selectedField.key]}
                </Typography>

                {selectedField.key !== "QR" ? (
                  <>
                    <TextField
                      label="Font size (px)"
                      type="number"
                      size="small"
                      value={selectedField.fontSize}
                      onChange={(e) =>
                        updateField(selectedField.key, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      inputProps={{ min: 8, max: 500 }}
                    />
                    <TextField
                      label="Colore"
                      size="small"
                      type="color"
                      value={selectedField.color}
                      onChange={(e) =>
                        updateField(selectedField.key, {
                          color: e.target.value,
                        })
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedField.bold}
                          onChange={(e) =>
                            updateField(selectedField.key, {
                              bold: e.target.checked,
                            })
                          }
                          size="small"
                        />
                      }
                      label="Grassetto"
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="Larghezza QR (px)"
                      type="number"
                      size="small"
                      value={selectedField.width}
                      onChange={(e) =>
                        updateField(selectedField.key, {
                          width: Number(e.target.value),
                        })
                      }
                      inputProps={{ min: 10 }}
                    />
                    <TextField
                      label="Altezza QR (px)"
                      type="number"
                      size="small"
                      value={selectedField.height}
                      onChange={(e) =>
                        updateField(selectedField.key, {
                          height: Number(e.target.value),
                        })
                      }
                      inputProps={{ min: 10 }}
                    />
                  </>
                )}

                <TextField
                  label="X (px immagine)"
                  type="number"
                  size="small"
                  value={selectedField.x}
                  onChange={(e) =>
                    updateField(selectedField.key, {
                      x: Number(e.target.value),
                    })
                  }
                />
                <TextField
                  label="Y (px immagine)"
                  type="number"
                  size="small"
                  value={selectedField.y}
                  onChange={(e) =>
                    updateField(selectedField.key, {
                      y: Number(e.target.value),
                    })
                  }
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button variant="contained" onClick={() => onSave(fields)}>
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFieldEditor;
