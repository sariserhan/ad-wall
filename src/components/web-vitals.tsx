"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";

export function WebVitals() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    navigator.sendBeacon(
      "/api/vitals",
      JSON.stringify({
        name: metric.name,
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        navigationType: metric.navigationType,
        path: pathname,
      }),
    );
  });

  return null;
}
