"use client";

import { AnalyticsConsentProvider } from "./analytics-consent-provider";
import { AnalyticsConsentToast } from "./analytics-consent-toast";
import { AnalyticsTracker } from "./analytics-tracker";

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
    </AnalyticsConsentProvider>
  );
}
