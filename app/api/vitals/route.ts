import type { NextRequest } from "next/server";
import { log } from "@/lib/logger";

const VALID_METRICS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, value, rating, navigationType, path } = body ?? {};
    if (!VALID_METRICS.has(String(name))) {
      return new Response(null, { status: 204 });
    }
    log({
      event: "web.vitals",
      metric: String(name),
      value: Number(value),
      rating: String(rating),
      navigationType: String(navigationType ?? ""),
      path: typeof path === "string" ? path.slice(0, 200) : undefined,
    });
  } catch {
    // Silently drop malformed payloads — vitals are best-effort.
  }
  return new Response(null, { status: 204 });
}
