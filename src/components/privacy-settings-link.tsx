"use client";

import { ShieldCheck } from "lucide-react";
import { useAnalyticsConsent } from "./analytics-consent-provider";

export function PrivacySettingsLink({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "text";
}) {
  const { openPrompt } = useAnalyticsConsent();

  return (
    <button
      type="button"
      className={className ? `privacy-settings-link ${className}` : "privacy-settings-link"}
      aria-label="Privacy settings"
      title="Privacy settings"
      onClick={openPrompt}
    >
      {variant === "icon" ? (
        <>
          <ShieldCheck size={16} aria-hidden="true" />
          <span className="sr-only">Privacy settings</span>
        </>
      ) : (
        "Privacy Settings"
      )}
    </button>
  );
}
