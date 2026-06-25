import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://localwall.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/billing/",
        "/embed/",
        "/renew/",
        "/unsubscribe/",
        "/sentry-example-page/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
