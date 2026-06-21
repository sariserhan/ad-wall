"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";

interface AppProvidersProps {
  children: React.ReactNode;
  clerkPublishableKey?: string;
  convexUrl?: string;
}

export function AppProviders({ children, clerkPublishableKey, convexUrl }: AppProvidersProps) {
  if (!clerkPublishableKey || !convexUrl) return children;

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      localization={{
        signIn: {
          start: {
            title: "Sign in to WALL",
            subtitle: "Sign in to post and manage your local card",
          },
        },
        signUp: {
          start: {
            title: "Create your WALL account",
            subtitle: "Create an account to post cards and access your authorized tools",
          },
        },
      }}
    >
      <ConnectedProviders convexUrl={convexUrl}>{children}</ConnectedProviders>
    </ClerkProvider>
  );
}

function ConnectedProviders({ children, convexUrl }: { children: React.ReactNode; convexUrl: string }) {
  const [convex] = useState(() => new ConvexReactClient(convexUrl));
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
