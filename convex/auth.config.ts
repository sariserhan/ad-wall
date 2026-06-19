import type { AuthConfig } from "convex/server";

const env = (globalThis as any).process?.env as Record<string, string> | undefined;
const issuerDomain = env?.CLERK_JWT_ISSUER_DOMAIN?.trim();
const issuerUrl = issuerDomain
  ? issuerDomain.startsWith("http://") || issuerDomain.startsWith("https://")
    ? issuerDomain.replace(/\/+$/, "")
    : `https://${issuerDomain.replace(/\/+$/, "")}`
  : undefined;

export default {
  providers: issuerUrl ? [{ domain: issuerUrl, applicationID: "convex" }] : [],
} satisfies AuthConfig;
