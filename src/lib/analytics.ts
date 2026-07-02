"use client";

type AnalyticsConsent = "unknown" | "accepted" | "declined";
type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>;
type PostHogClient = typeof import("posthog-js").default;

const CONSENT_KEY = "localwall-analytics-consent-v1";
const CONSENT_COOKIE = "localwall_analytics_consent_v1";

let consentState: AnalyticsConsent = "unknown";
let clientPromise: Promise<{ default: PostHogClient }> | null = null;
let client: PostHogClient | null = null;
let initPromise: Promise<void> | null = null;
let pendingDistinctId: string | null = null;
const isProduction = process.env.NODE_ENV === "production";

function readStoredConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unknown";
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(CONSENT_KEY);
  } catch {
    stored = null;
  }
  if (stored === "accepted" || stored === "declined") return stored;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`));
  const cookieValue = match ? decodeURIComponent(match[1]) : "unknown";
  return cookieValue === "accepted" || cookieValue === "declined" ? cookieValue : "unknown";
}

function persistConsent(next: AnalyticsConsent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, next);
  } catch {
    // If storage is blocked, keep the UI working and fall back to in-memory consent.
  }
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function getPostHogConfig() {
  return {
    token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    // PostHog JS should talk to the local reverse proxy path, not the proxy host itself.
    host: "/ingest",
    // Keep UI/config links on the real PostHog host so the proxy path is only used for API traffic.
    uiHost: "https://us.posthog.com",
  };
}

async function loadPostHog() {
  if (!clientPromise) {
    clientPromise = import("posthog-js");
  }
  const module = await clientPromise;
  return module.default;
}

export function getAnalyticsConsent() {
  if (consentState === "unknown" && typeof window !== "undefined") {
    consentState = readStoredConsent();
  }
  return consentState;
}

export function setAnalyticsConsent(next: Exclude<AnalyticsConsent, "unknown">) {
  consentState = next;
  persistConsent(next);
  if (next === "accepted") {
    void initAnalytics();
  } else if (client) {
    client.reset();
  }
}

export async function initAnalytics() {
  if (typeof window === "undefined" || getAnalyticsConsent() !== "accepted") return;
  if (client) return;
  if (!initPromise) {
    initPromise = (async () => {
      const { token, host, uiHost } = getPostHogConfig();
      if (!token) return;
      const posthog = await loadPostHog();
      client = posthog;
      posthog.init(token, {
        api_host: host,
        ui_host: uiHost,
        capture_pageview: false,
        autocapture: true,
        capture_performance: isProduction,
        capture_dead_clicks: isProduction,
        capture_exceptions: isProduction,
        advanced_disable_feature_flags_on_first_load: true,
        advanced_disable_feature_flags: true,
        disable_surveys: !isProduction,
        disable_surveys_automatic_display: !isProduction,
        disable_session_recording: !isProduction,
        disable_external_dependency_loading: true,
      });
      if (getAnalyticsConsent() !== "accepted") return;
      if (pendingDistinctId) {
        posthog.identify(pendingDistinctId);
      }
      posthog.capture("page_viewed", {
        path: window.location.pathname,
        search: window.location.search || "",
        title: document.title || undefined,
      });
    })().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

export function captureAnalytics(event: string, properties?: AnalyticsEventProps) {
  if (getAnalyticsConsent() !== "accepted") return;
  void initAnalytics().then(() => {
    if (getAnalyticsConsent() !== "accepted") return;
    client?.capture(event, properties);
  });
}

export function identifyAnalytics(distinctId: string) {
  pendingDistinctId = distinctId;
  if (getAnalyticsConsent() !== "accepted") return;
  void initAnalytics().then(() => {
    if (getAnalyticsConsent() !== "accepted") return;
    client?.identify(distinctId);
  });
}

export function resetAnalytics() {
  pendingDistinctId = null;
  if (client) client.reset();
}
