import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

    if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  // Dynamically import so this never runs in the edge runtime.
  const { log } = await import("./src/lib/logger");

  process.on("uncaughtException", (err) => {
    log({ event: "process.uncaughtException", level: "error", error: err.message, stack: err.stack?.slice(0, 500) });
  });

  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    log({ event: "process.unhandledRejection", level: "error", error: message });
  });
}

export const onRequestError = Sentry.captureRequestError;