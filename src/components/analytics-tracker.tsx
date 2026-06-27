"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAnalytics, initAnalytics } from "@/lib/analytics";
import { useAnalyticsConsent } from "./analytics-consent-provider";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const { consent } = useAnalyticsConsent();

  useEffect(() => {
    if (consent === "accepted") void initAnalytics();
  }, [consent]);

  useEffect(() => {
    if (consent !== "accepted") return;
    captureAnalytics("page_viewed", {
      path: pathname,
      search: query || "",
    });
  }, [consent, pathname, query]);

  return null;
}
