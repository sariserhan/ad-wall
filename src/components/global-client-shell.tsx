"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsConsentProvider } from "./analytics-consent-provider";
import { AnalyticsConsentToast } from "./analytics-consent-toast";
import { AnalyticsTracker } from "./analytics-tracker";
import { useAnalyticsConsent } from "./analytics-consent-provider";

type AnalyticsConsent = "unknown" | "accepted" | "declined";

export function GlobalClientShell({
  children,
  initialAnalyticsConsent,
}: {
  children: React.ReactNode;
  initialAnalyticsConsent?: AnalyticsConsent;
}) {
  return (
    <AnalyticsConsentProvider initialConsent={initialAnalyticsConsent}>
      {children}
      <AnalyticsTracker />
      <AnalyticsConsentToast />
      <VercelAnalyticsGate />
    </AnalyticsConsentProvider>
  );
}

function VercelAnalyticsGate() {
  const { consent } = useAnalyticsConsent();
  return consent === "accepted" ? (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  ) : null;
}
