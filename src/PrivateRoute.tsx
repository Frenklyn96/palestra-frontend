// components/PrivateRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { Box, Button, Typography } from "@mui/material";

// URL dell'app web deployata: questa pagina mostra il componente <SignIn> di Clerk
// con redirectUrl puntato a /sso-callback che fa il deep link verso gymproject://
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

export const PrivateRoute = ({ children }: PropsWithChildren) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      {isElectron ? <ElectronLoginScreen /> : <RedirectToSignIn />}
    </SignedOut>
  </>
);
