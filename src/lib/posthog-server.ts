import { PostHog } from "posthog-node";
import { normalizePostHogHost } from "@/lib/posthog-host";

export function getPostHogClient() {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: normalizePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST),
    flushAt: 1,
    flushInterval: 0,
  });
}
