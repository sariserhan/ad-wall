import { AppProviders } from "@/components/app-providers";
import { ConnectedWallApp } from "@/features/wall/connected-wall-app";
import { WallApp } from "@/features/wall/wall-app";
import { Suspense } from "react";

export default function HomePage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isConnected = Boolean(convexUrl && clerkPublishableKey);

  return (
    <AppProviders convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      <Suspense fallback={<div className="app-loading"><strong>WALL</strong><span>Finding your local wall…</span></div>}>
        {isConnected ? <ConnectedWallApp /> : <WallApp mode="demo" />}
      </Suspense>
    </AppProviders>
  );
}
