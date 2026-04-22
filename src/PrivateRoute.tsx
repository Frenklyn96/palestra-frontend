// components/PrivateRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { Box, Button, Typography } from "@mui/material";

const CLERK_SIGN_IN_URL = "https://dynamic-glider-17.accounts.dev/sign-in";
const CALLBACK_URL = "https://gymprojectfe-dev.up.railway.app/sso-callback";
const isElectron = !!(window as any).electronAPI;

function ElectronLoginScreen() {
  const handleLogin = () => {
    const url = `${CLERK_SIGN_IN_URL}?redirect_url=${encodeURIComponent(CALLBACK_URL)}`;
    (window as any).electronAPI.openAuthBrowser(url);
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
