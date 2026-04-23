import { useEffect, useState } from "react";
import { useUser, useSession } from "@clerk/clerk-react";
import { SignIn } from "@clerk/clerk-react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";

const ELECTRON_CALLBACK_URL = "http://127.0.0.1:7654/auth-callback";

/**
 * Pagina usata SOLO dal flusso Electron.
 * Electron apre questa URL nel browser di sistema:
 *   https://gymprojectfe-dev.up.railway.app/electron-auth
 *
 * Dopo il login Clerk, questa pagina chiama POST http://127.0.0.1:7654/auth-callback
 * con userId, email e sessionToken.
 * Electron riceve i dati via IPC e sblocca l'app.
 */
export default function ElectronAuthPage() {
  const { isSignedIn, user } = useUser();
  const { session } = useSession();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!isSignedIn || !user || !session) return;
    if (status !== "idle") return;

    setStatus("sending");

    session
      .getToken()
      .then((token) => {
        return fetch(ELECTRON_CALLBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            token: token ?? "",
          }),
        });
      })
      .then((res) => {
        if (res.ok) {
          setStatus("done");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [isSignedIn, user, session, status]);

  if (isSignedIn) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {status === "sending" && (
          <>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Connessione all&apos;applicazione desktop...
            </Typography>
          </>
        )}
        {status === "done" && (
          <Alert severity="success" sx={{ maxWidth: 400 }}>
            Autenticazione completata! Puoi chiudere questa finestra e tornare
            all&apos;applicazione.
          </Alert>
        )}
        {status === "error" && (
          <Alert severity="error" sx={{ maxWidth: 400 }}>
            Impossibile contattare l&apos;applicazione desktop. Assicurati che
            GymProject sia aperto e riprova.
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        bgcolor: "background.default",
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        GymProject — Accesso Desktop
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Accedi con il tuo account per sbloccare l&apos;applicazione.
      </Typography>
      <SignIn routing="path" path="/electron-auth" />
    </Box>
  );
}
