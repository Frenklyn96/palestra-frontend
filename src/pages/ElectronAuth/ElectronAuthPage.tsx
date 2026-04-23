import { SignIn } from "@clerk/clerk-react";
import { Box, Typography } from "@mui/material";

/**
 * Pagina usata SOLO dal flusso Electron.
 * Electron apre questa URL nel browser di sistema:
 *   https://gymprojectfe-dev.up.railway.app/electron-auth
 *
 * Clerk completa il login e reindirizza a /sso-callback,
 * che a sua volta fa window.location = "gymproject://sso-callback?..."
 * intercettato da Electron per completare l'autenticazione.
 */
export default function ElectronAuthPage() {
  const origin = window.location.origin;

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
        Dopo il login verrai reindirizzato automaticamente
        all&apos;applicazione.
      </Typography>
      <SignIn
        routing="hash"
        afterSignInUrl={`${origin}/sso-callback`}
        afterSignUpUrl={`${origin}/sso-callback`}
        redirectUrl={`${origin}/sso-callback`}
      />
    </Box>
  );
}
