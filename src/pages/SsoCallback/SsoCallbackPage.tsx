import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * Pagina intermediaria SSO callback.
 *
 * Flusso Electron:
 *   Clerk → https://gymprojectfe-dev.up.railway.app/sso-callback?<params>
 *   → questa pagina tenta redirect a gymproject://sso-callback?<params>
 *   → Electron intercetta il deep link e chiama handleOAuthDeepLink()
 *
 * Flusso Web (fallback, utente senza Electron):
 *   Dopo 600ms chiama handleRedirectCallback() di Clerk normalmente.
 */
export default function SsoCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const params = window.location.search;

    // Prova a redirigere verso Electron via deep link
    window.location.href = `gymproject://sso-callback${params}`;

    // Fallback web: se siamo ancora qui dopo 600ms, gestisci come callback web normale
    const timer = setTimeout(() => {
      handleRedirectCallback({
        afterSignInUrl: "/",
        afterSignUpUrl: "/",
      })
        .then(() => navigate("/", { replace: true }))
        .catch(() => navigate("/", { replace: true }));
    }, 600);

    return () => clearTimeout(timer);
  }, [handleRedirectCallback, navigate]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Completamento autenticazione...
      </Typography>
    </Box>
  );
}
