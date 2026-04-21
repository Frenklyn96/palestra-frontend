// components/PrivateRoute.tsx
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { PropsWithChildren } from "react";
import { Box } from "@mui/material";

export const PrivateRoute = ({ children }: PropsWithChildren) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SignIn routing="virtual" />
      </Box>
    </SignedOut>
  </>
);
