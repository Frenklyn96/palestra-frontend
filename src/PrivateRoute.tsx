// components/PrivateRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useAppSelector } from "./store/hooks";

// URL dell'app web deployata: mostra il login Clerk e poi chiama localhost:7654
const ELECTRON_AUTH_URL =
  "https://gymprojectfe-dev.up.railway.app/electron-auth";
const isElectron = !!(window as any).electronAPI;

function ElectronLoginScreen() {
  const handleLogin = () => {
    (window as any).electronAPI.openAuthBrowser(ELECTRON_AUTH_URL);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
      }}
    >
      <Typography variant="h4" fontWeight={700}>
        GymProject
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Accedi per continuare
      </Typography>
      <Button variant="contained" size="large" onClick={handleLogin}>
        Accedi con il browser
      </Button>
    </Box>
  );
}

/**
 * In Electron l'autenticazione avviene via HTTP callback locale (localhost:7654).
 * Clerk non gestisce la sessione dentro Electron, quindi usiamo userId in Redux
 * come segnale di autenticazione completata.
 * In web browser usiamo normalmente <SignedIn> di Clerk.
 */
export const PrivateRoute = ({ children }: PropsWithChildren) => {
  const userId = useAppSelector((state) => state.user.userId);

  if (isElectron) {
    // Autenticato via callback locale → userId presente in Redux
    if (userId) return <>{children}</>;
    return <ElectronLoginScreen />;
  }

  // Web browser: usa Clerk normalmente
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
