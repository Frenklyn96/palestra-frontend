import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { RoutesEnum } from "../../enum/RoutesEnum";

/**
 * Pagina di callback OAuth.
 * Viene caricata quando Electron intercetta il deep link gymproject://sso-callback?...
 * e naviga l'app su /#/oauth-callback?<params>
 */
export default function OAuthCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    handleRedirectCallback({
      afterSignInUrl: RoutesEnum.HOME,
      afterSignUpUrl: RoutesEnum.HOME,
    })
      .then(() => {
        navigate(RoutesEnum.HOME, { replace: true });
      })
      .catch((err) => {
        console.error("OAuth callback error:", err);
        navigate(RoutesEnum.HOME, { replace: true });
      });
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
