// components/PrivateRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { PropsWithChildren } from 'react';

export const PrivateRoute = ({ children }: PropsWithChildren) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  </>
);
