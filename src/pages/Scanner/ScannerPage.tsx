import React, { useState, useEffect } from "react";
import { Box, Paper, CircularProgress } from "@mui/material";
import { Scanner } from "@yudiel/react-qr-scanner";
import ClienteCard from "../../features/components/clienteCard/ClienteCard";
import { Cliente } from "../../features/class/Cliente";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  fetchClienteById,
  removeSelectCliente,
} from "../../features/slice/clientiSlice";
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

  const handleError = (err: any) => {
    console.error("QR error", err);
    setError(String(err));
  };

  return (
    <Paper sx={{ padding: 2 }}>
      <h1>{t("scanner.title")}</h1>

      <Box sx={{ display: "flex", gap: 2, height: "600px" }}>
        {/* Scanner a sinistra, sempre attivo */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ width: "100%", height: "100%", overflow: "hidden" }}>
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

        {/* Card a destra, formato mobile */}
        <Box
          sx={{
            width: "320px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
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
    </Paper>
  );
};

export default ScannerPage;
