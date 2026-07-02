"use client";

import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Toaster } from "@/lib/toast";
import { CheckoutSuccessHandler } from "./checkout-success-handler";
import { GlobalAdminPanel } from "./global-admin-panel";
import { GlobalOwnerDashboard } from "./global-owner-dashboard";
import { GlobalBugReportModal } from "./global-bug-report-modal";
import { GlobalContactModal } from "./global-contact-modal";

interface AppProvidersProps {
  children: React.ReactNode;
  clerkPublishableKey?: string;
  convexUrl?: string;
  withClerk?: boolean;
}

export function AppProviders({ children, clerkPublishableKey, convexUrl, withClerk = true }: AppProvidersProps) {
  const [convex] = useState(() => (convexUrl ? new ConvexReactClient(convexUrl) : null));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const afterSignOutUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  if (!clerkPublishableKey) {
    return (
      <>
        {convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : children}
        <GlobalBugReportModal />
        <GlobalContactModal />
        <Toaster />
      </>
    );
  }

  if (!withClerk) {
    return (
      <>
        {convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : children}
        <GlobalBugReportModal />
        <GlobalContactModal />
        <Toaster />
      </>
    );
  }

  if (!convex) {
    return (
      <ClerkProvider
        ui={ui}
        publishableKey={clerkPublishableKey}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignOutUrl={afterSignOutUrl}
        localization={{
          signIn: {
            start: {
              title: "Sign in to LocalWall",
              subtitle: "Sign in to post and manage your local listings",
            },
          },
          signUp: {
            start: {
              title: "Join LocalWall",
              subtitle: "Create an account to post listings and track your reach",
            },
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      ui={ui}
      publishableKey={clerkPublishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl={afterSignOutUrl}
      localization={{
        signIn: {
          start: {
            title: "Sign in to LocalWall",
            subtitle: "Sign in to post and manage your local listings",
          },
        },
        signUp: {
          start: {
            title: "Join LocalWall",
            subtitle: "Create an account to post listings and track your reach",
          },
        },
      }}
    >
      <ConnectedProviders convex={convex}>{children}</ConnectedProviders>
    </ClerkProvider>
  );
}

function ConnectedProviders({ children, convex }: { children: React.ReactNode; convex: ConvexReactClient }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ClerkUsernameSync />
      <CheckoutSuccessHandler />
      {children}
      <GlobalAdminPanel />
      <GlobalBugReportModal />
      <GlobalContactModal />
      <GlobalOwnerDashboard />
      <Toaster />
    </ConvexProviderWithClerk>
  );
}

function ClerkUsernameSync() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded, user } = useUser();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const syncClerkUsername = useMutation(api.cards.syncClerkUsername);
  const lastEnsured = useRef<string | null>(null);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || !isLoaded || !user) return;
    const tokenIdentifier = user.id;
    if (lastEnsured.current !== tokenIdentifier) {
      void ensureCurrentUser().then(() => {
        lastEnsured.current = tokenIdentifier;
      });
    }
    const username = user.username?.trim() || null;
    if (lastSynced.current === username) return;
    lastSynced.current = username;
    void syncClerkUsername({ username: username ?? undefined });
  }, [ensureCurrentUser, isAuthLoaded, isLoaded, isSignedIn, syncClerkUsername, user]);

  return null;
}
