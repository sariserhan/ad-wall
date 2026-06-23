import "server-only";

export interface LogFields {
  event: string;
  level?: "info" | "warn" | "error";
  [key: string]: unknown;
}

/**
 * Emit a structured JSON log line to stdout. If LOG_ENDPOINT is set, the same
 * payload is forwarded there (fire-and-forget) so any log sink (Datadog,
 * Axiom, Logtail, etc.) can ingest it without code changes.
 */
export function log(fields: LogFields): void {
  const { level = "info", ...rest } = fields;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...rest });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  const endpoint = process.env.LOG_ENDPOINT;
  if (!endpoint) return;
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.LOG_TOKEN ? { Authorization: `Bearer ${process.env.LOG_TOKEN}` } : {}),
    },
    body: line,
  }).catch(() => {});
}
