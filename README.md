# LocalWall

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

After an allowlisted user signs in, an **Admin** button appears in the navigation. Admins can review recent cards and users, search records, hide or restore active cards, permanently delete cards and their uploaded images, block and unblock users, and resolve reports.

## Location picker

The country, state, and city selectors are typeable comboboxes — start typing to filter the list, then click or press Enter to confirm. The dropdown stays open while scrolling through long lists. Clicking **Apply** commits the selection to the wall filter.

## Owner dashboard

The **My Board** dashboard (accessible after sign-in) lets owners manage their username and business name. Each field has a clear (×) button to reset its value, and both fields clear automatically after a successful save.

## Composer draft autosave

Unfinished card content is preserved across composer sessions:

- Text fields (name, line, phone, email, etc.) are saved to `localStorage` with a short debounce.
- Uploaded images are persisted in IndexedDB under the key `wall-draft-images-v1` so large blobs do not hit storage quotas.
- A green banner at the top of the composer indicates that a draft was restored.
- When a card is successfully created all draft data (localStorage and IndexedDB) is cleared automatically.

## Saved cards

Cards can be saved (bookmarked) by signed-in users. Saved state syncs across devices through Convex. Local-storage favorites from before sign-in migrate automatically after the first sign-in. Each card has a shareable direct URL at `/card/[id]` with Open Graph and Twitter metadata. Invalid card IDs return a 404.

## Commands

```bash
npm run dev           # Start Next.js dev server
npm run build         # Production build
npm run typecheck     # TypeScript type-check
npm run convex:dev    # Start Convex dev watcher
npm run convex:deploy # Deploy Convex functions to production

npm run test          # Run Convex unit tests (Vitest)
npm run test:watch    # Vitest in watch mode
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Open Playwright UI mode
npm run test:e2e:setup # Generate auth state for @auth E2E tests
```

## Testing

### Convex unit tests

Tests live in `tests/convex/` and run under Vitest with the `edge-runtime` environment (powered by `convex-test`). Each test gets an isolated in-memory database.

```bash
npm run test
```

Coverage includes:

- **Auth guards** — unauthenticated and blocked users cannot create cards.
- **Free card creation** — publishes immediately, appears in `listMine`, auto-creates user record.
- **Paid card creation** — creates a `pendingCard`, not yet visible, invalid amounts rejected.
- **Field validation** — name/line length, contact method, blocked text, zip code, email format, x/y bounds.
- **Card ownership** — `update`, `setVisibility`, `renew`, `remove` all reject non-owners.
- **Admin mutations** — `setCardStatus`, `removeCard`, `blockUser`, `unblockUser`, `resolveReport` all require admin identity.
- **Admin queries** — `getDashboard` returns stats, cards, users, and reports to admins only.
- **Payment idempotency** — completing the same Stripe session ID twice returns the same card ID.
- **Cron** — `markExpired` transitions published cards past their `expiresAt` to `expired`.

Admin tests inject `ADMIN_EMAILS` via `process.env` (which is what Convex's generated `env` resolves to in the test environment) using `beforeAll`/`afterAll`.

### Playwright E2E tests

Tests live in `tests/e2e/`. Install browsers once before running:

```bash
npx playwright install
npm run test:e2e
```

Three browser projects run in parallel: Desktop Chrome, Pixel 5 (mobile), iPad Gen 7 (tablet).

| File | What it covers |
| --- | --- |
| `responsive.spec.ts` | Nav, topbar, location picker, sub-location routes at 375 / 768 / 1280 px |
| `post-card.spec.ts` | Post button visibility, Clerk sign-in prompt (auth-free); full composer step flow (`@auth`) |
| `checkout.spec.ts` | Stripe API endpoint validation; `/renew/[cardId]` route; paid card redirect (`@auth`) |
| `moderation.spec.ts` | `/api/moderate` endpoint — safe content passes, blocked text rejected |

Tests tagged `@auth` require a saved browser session. Generate it once with:

```bash
npm run test:e2e:setup
```

This runs `tests/e2e/auth.setup.ts` and writes credentials to `tests/e2e/.auth/user.json`.
