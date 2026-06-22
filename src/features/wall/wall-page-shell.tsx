import { Suspense } from "react";
import { AppProviders } from "@/components/app-providers";
import { ConnectedWallApp } from "./connected-wall-app";
import { WallApp } from "./wall-app";
import type { WallCard } from "./types";

interface WallPageShellProps {
  initialLocation?: { country: string; state: string; city: string };
  initialCategory?: string;
  initialCardId?: string;
  initialKeyword?: string;
  initialCards?: WallCard[];
}

export function WallPageShell({
  initialLocation,
  initialCategory,
  initialCardId,
  initialKeyword,
  initialCards,
}: WallPageShellProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isConnected = Boolean(convexUrl && clerkPublishableKey);

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      {isConnected ? (
        <Suspense fallback={<div className="app-loading"><strong>WALL</strong><span>Loading your local wall…</span></div>}>
          <ConnectedWallApp
            initialLocation={initialLocation}
            initialCategory={initialCategory}
            initialCardId={initialCardId}
            initialKeyword={initialKeyword}
            initialCards={initialCards}
          />
        </Suspense>
      ) : (
        <WallApp mode="demo" isSignedIn={false} notice="Posting is unavailable until Clerk sign-in is configured." />
      )}
    </AppProviders>
  );
}
