"use client";

import { useAnalyticsConsent } from "./analytics-consent-provider";

export function AnalyticsConsentToast() {
  const { consent, promptOpen, accept, decline } = useAnalyticsConsent();

  if (consent !== "unknown" && !promptOpen) return null;

  return (
    <div className="analytics-consent-toast" role="dialog" aria-live="polite" aria-label="Analytics consent">
      <div>
        <strong>Analytics and cookies</strong>
        <p>We use analytics cookies to improve the experience.</p>
        <p>You can change your preferences by opening privacy settings.</p>
      </div>
      <div className="analytics-consent-actions flex gap-2">
        <button
          type="button"
          className="secondary flex-1"
          onClick={decline}
        >
          Decline
        </button>
        <button
          type="button"
          className="primary flex-1"
          onClick={accept}
        >
          Allow Analytics
        </button>
      </div>
    </div>
  );
}
