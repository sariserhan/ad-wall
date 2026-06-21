# WALL

A tactile community advertising wall built with Next.js, TypeScript, Tailwind CSS, Convex, and Clerk.

## Local development

```bash
npm install
npm run dev
```

The app runs in a complete demo mode when no service credentials are present.

## Connect Convex

1. Run `npx convex dev` and create or select a Convex project.
2. Keep the generated `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` values in `.env.local`.
3. Convex will regenerate the temporary files in `convex/_generated` with fully typed API references.

The schema stores users, cards, up to two image storage IDs, normalized wall placement, stacking order, moderation status, and an immutable `positionLockedAt` timestamp. Card positions are accepted only by the creation mutation; there is intentionally no position-update mutation.

## Connect Clerk

1. Create a Clerk application and copy its publishable and secret keys into `.env.local`.
2. Activate Clerk's Convex integration/JWT template.
3. Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex deployment environment.
4. Run `npx convex dev` again to deploy the auth configuration.

Without both public Convex and Clerk values, the application stays in demo mode. With both configured, browsing remains public while posting requires authentication and persists cards and images through Convex.

## Enable the admin panel

Admin access is enforced by Convex using verified Clerk email addresses. Add one or more comma-separated emails to the Convex deployment environment:

```bash
npx convex env set ADMIN_EMAILS "owner@example.com,moderator@example.com"
```

After an allowlisted user signs in, an **Admin** button appears in the navigation. Admins can review recent cards and users, search records, hide or restore active cards, and permanently delete cards and their uploaded images.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run convex:dev
npm run convex:deploy
```
