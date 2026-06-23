import type { NextRequest } from "next/server";
import { log } from "@/lib/logger";

/**
 * Wraps a route handler with structured request logging and error capture.
 * Logs one `api.request` event per call with route, method, HTTP status, and
 * wall-clock duration. Unhandled throws are caught, logged as `api.error`, and
 * returned as a 500 so the process stays alive.
 */
export function observe(
  route: string,
  handler: (req: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest): Promise<Response> => {
    const start = performance.now();
    let status = 500;
    try {
      const res = await handler(req);
      status = res.status;
      return res;
    } catch (err) {
      log({
        event: "api.error",
        level: "error",
        route,
        method: req.method,
        error: err instanceof Error ? err.message : String(err),
      });
      return Response.json({ error: "Internal server error." }, { status: 500 });
    } finally {
      log({
        event: "api.request",
        route,
        method: req.method,
        status,
        durationMs: Math.round(performance.now() - start),
      });
    }
  };
}
