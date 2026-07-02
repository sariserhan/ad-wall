import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    ADMIN_EMAILS: v.optional(v.string()),
    CLERK_WEBHOOK_SIGNING_SECRET: v.optional(v.string()),
    STRIPE_SECRET_KEY: v.optional(v.string()),
  },
});

export default app;
