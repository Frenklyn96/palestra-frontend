/**
 * TEST SCRIPT - useElectronQrScanner Hook
 *
 * Testa il custom hook in isolamento per verificare
 * il funzionamento corretto prima di integrare in ScannerPage
 */

import React from "react";
import { useElectronQrScanner } from "../hooks/useElectronQrScanner";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
} from "@mui/material";

const ElectronScannerTestPage: React.FC = () => {
  const [scans, setScans] = React.useState<any[]>([]);

  // Hook con callback
  const {
    isElectron,
    scannerActive,
    pythonServiceRunning,
    toggleScanner,
    simulateScan,
  } = useElectronQrScanner(
    (qrData) => {
      console.log("QR Scanned in test:", qrData);

      // Aggiungi a lista scansioni
      setScans((prev) => [
        {
          ...qrData,
          id: Date.now(),
        },
        ...prev.slice(0, 9), // Max 10 scansioni
      ]);
    },
    {
      enabled: true,
      deduplicate: true,
      deduplicateThreshold: 2000,
    },
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🧪 Electron Scanner Test Page
      </Typography>

      {/* Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>

          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            <Chip
              label={isElectron ? "🖥️ Electron Mode" : "🌐 Web Mode"}
              color={isElectron ? "success" : "default"}
            />
            <Chip
              label={
                scannerActive ? "✅ Scanner Active" : "❌ Scanner Inactive"
              }
              color={scannerActive ? "success" : "error"}
            />
            <Chip
              label={
                pythonServiceRunning ? "🐍 Python Running" : "🐍 Python Stopped"
              }
              color={pythonServiceRunning ? "success" : "warning"}
            />
          </Box>

          {isElectron && (
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={() => toggleScanner(!scannerActive)}
              >
                {scannerActive ? "Pause Scanner" : "Resume Scanner"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => simulateScan("TEST-" + Date.now())}
              >
                Simulate Scan
              </Button>
            </Box>
          )}

          {!isElectron && (
            <Typography color="warning.main">
              ⚠️ Not running in Electron. Global scanner hook is not available.
              <br />
              Run with: <code>npm run electron:dev</code>
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Scans History */}
      <Typography variant="h6" gutterBottom>
        Recent Scans (Latest First)
      </Typography>

      {scans.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No scans yet.{" "}
              {isElectron
                ? "Scan a QR code or use the 'Simulate Scan' button above."
                : "Enable Electron mode to test."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        scans.map((scan) => (
          <Card key={scan.id} sx={{ mb: 1 }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography variant="h6" component="div">
                    {scan.code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(scan.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Chip
                  label={scan.source}
                  size="small"
                  color={
                    scan.source === "scanner-device" ? "primary" : "default"
                  }
                />
              </Box>
              {scan.raw && scan.raw !== scan.code && (
                <Typography
                  variant="caption"
                  display="block"
                  mt={1}
                  color="text.secondary"
                >
                  Raw: {scan.raw}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default ElectronScannerTestPage;
