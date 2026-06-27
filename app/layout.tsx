import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WebVitals } from "@/components/web-vitals";
import { GlobalClientShell } from "@/components/global-client-shell";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-900.css";
import "@fontsource/caveat/latin-600.css";
import "@fontsource/caveat/latin-700.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://localwall.app";
const CONSENT_COOKIE = "localwall_analytics_consent_v1";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "LocalWall — Your Local Bulletin Board",
  description: "Find and post local ads for services, jobs, real estate, and more in your city.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialAnalyticsConsent = cookieStore.get(CONSENT_COOKIE)?.value;
  const normalizedAnalyticsConsent =
    initialAnalyticsConsent === "accepted" || initialAnalyticsConsent === "declined"
      ? initialAnalyticsConsent
      : "unknown";

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <WebVitals />
        <GlobalClientShell initialAnalyticsConsent={normalizedAnalyticsConsent}>{children}</GlobalClientShell>
      </body>
    </html>
  );
}
