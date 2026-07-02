import { auth } from "@clerk/nextjs/server";
import { fetchIsAdmin } from "@/lib/server-admin";
import { Suspense } from "react";
import { AppProviders } from "@/components/app-providers";
import { ConnectedWallApp } from "./connected-wall-app";
import { WallApp } from "./wall-app";
import { getClerkPublishableKey } from "@/lib/clerk";
import type { WallCard } from "./types";

interface WallPageShellProps {
  initialLocation?: { country: string; state: string; city: string };
  initialCategory?: string;
  initialCardId?: string;
  initialKeyword?: string;
  initialCards?: WallCard[];
}

export async function WallPageShell({
  initialLocation,
  initialCategory,
  initialCardId,
  initialKeyword,
  initialCards,
  }: WallPageShellProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = getClerkPublishableKey();
  const isConnected = Boolean(convexUrl && clerkPublishableKey);
  const { userId, getToken } = await auth();
  const token = userId ? await getToken({ template: "convex" }) : null;
  const isAdmin = await fetchIsAdmin(token);

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey} isAdmin={isAdmin}>
      {isConnected ? (
        <Suspense fallback={<div className="app-loading"><strong>LocalWall</strong><span>Loading your local wall…</span></div>}>
          <ConnectedWallApp
            initialLocation={initialLocation}
            initialCategory={initialCategory}
            initialCardId={initialCardId}
            initialKeyword={initialKeyword}
            initialCards={initialCards}
            isAdmin={isAdmin}
          />
        </Suspense>
      ) : (
        <WallApp mode="demo" isSignedIn={false} notice="Posting is unavailable until Clerk sign-in is configured." />
      )}
    </AppProviders>
  );
}
