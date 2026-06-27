"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

type AnalyticsConsent = "unknown" | "accepted" | "declined";
const OPEN_CONSENT_EVENT = "localwall:open-analytics-consent";

interface AnalyticsConsentContextValue {
  consent: AnalyticsConsent;
  promptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
  accept: () => void;
  decline: () => void;
}

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({
  children,
  initialConsent,
}: {
  children: React.ReactNode;
  initialConsent?: AnalyticsConsent;
}) {
  const [consent, setConsentState] = useState<AnalyticsConsent>(() => initialConsent ?? getAnalyticsConsent());
  const [promptOpen, setPromptOpen] = useState(consent === "unknown");

  useEffect(() => {
    const syncConsent = () => {
      const next = getAnalyticsConsent();
      setConsentState((current) => (current === next ? current : next));
    };
    const openConsentPrompt = () => setPromptOpen(true);

    syncConsent();
    window.addEventListener("storage", syncConsent);
    window.addEventListener(OPEN_CONSENT_EVENT, openConsentPrompt);

    return () => {
      window.removeEventListener("storage", syncConsent);
      window.removeEventListener(OPEN_CONSENT_EVENT, openConsentPrompt);
    };
  }, []);

  const openPrompt = () => {
    setPromptOpen(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
    }
  };

  const value = useMemo<AnalyticsConsentContextValue>(() => ({
    consent,
    promptOpen,
    openPrompt,
    closePrompt: () => setPromptOpen(false),
    accept: () => {
      setAnalyticsConsent("accepted");
      setConsentState("accepted");
      setPromptOpen(false);
    },
    decline: () => {
      setAnalyticsConsent("declined");
      setConsentState("declined");
      setPromptOpen(false);
    },
  }), [consent, promptOpen]);

  return <AnalyticsConsentContext.Provider value={value}>{children}</AnalyticsConsentContext.Provider>;
}

export function useAnalyticsConsent() {
  const context = useContext(AnalyticsConsentContext);
  if (!context) {
    return {
      consent: "unknown" as const,
      promptOpen: false,
      openPrompt: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
        }
      },
      closePrompt: () => {},
      accept: () => {},
      decline: () => {},
    };
  }
  return context;
}
