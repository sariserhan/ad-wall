# Graph Report - local-wall  (2026-06-25)

## Corpus Check
- 193 files · ~422,480 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 842 nodes · 1363 edges · 75 communities (56 shown, 19 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `713d4157`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Rate Limiting & API Utilities|Rate Limiting & API Utilities]]
- [[_COMMUNITY_Billing, Admin & Test Infrastructure|Billing, Admin & Test Infrastructure]]
- [[_COMMUNITY_Geo-Routed Pages & RSS Feeds|Geo-Routed Pages & RSS Feeds]]
- [[_COMMUNITY_Auth Providers & Analytics Integration|Auth Providers & Analytics Integration]]
- [[_COMMUNITY_Card Data Layer (Convex)|Card Data Layer (Convex)]]
- [[_COMMUNITY_Card Display & Embed Pages|Card Display & Embed Pages]]
- [[_COMMUNITY_Convex Agent Skills & Concepts|Convex Agent Skills & Concepts]]
- [[_COMMUNITY_Admin Panel & Moderation UI|Admin Panel & Moderation UI]]
- [[_COMMUNITY_UI Shared Components & Detail Panel|UI Shared Components & Detail Panel]]
- [[_COMMUNITY_Owner Dashboard & Card Editing|Owner Dashboard & Card Editing]]
- [[_COMMUNITY_Admin Backend (Convex)|Admin Backend (Convex)]]
- [[_COMMUNITY_Dependencies & Package Config|Dependencies & Package Config]]
- [[_COMMUNITY_Trending Feed UI|Trending Feed UI]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Card Composer Form|Card Composer Form]]
- [[_COMMUNITY_Home Page & Root Routes|Home Page & Root Routes]]
- [[_COMMUNITY_Location Combobox & Seed Data|Location Combobox & Seed Data]]
- [[_COMMUNITY_Convex TypeScript Config|Convex TypeScript Config]]
- [[_COMMUNITY_Cron Jobs, HTTP & Users|Cron Jobs, HTTP & Users]]
- [[_COMMUNITY_Card Types & Wall Card Component|Card Types & Wall Card Component]]
- [[_COMMUNITY_Playwright CLI Testing Skill|Playwright CLI Testing Skill]]
- [[_COMMUNITY_Dashboard Signal & Wall App|Dashboard Signal & Wall App]]
- [[_COMMUNITY_Build & Dev Scripts|Build & Dev Scripts]]
- [[_COMMUNITY_Digest Email System|Digest Email System]]
- [[_COMMUNITY_Payments Internal Logic|Payments Internal Logic]]
- [[_COMMUNITY_Rate Limits & Reviews|Rate Limits & Reviews]]
- [[_COMMUNITY_Stripe Payments Actions|Stripe Payments Actions]]
- [[_COMMUNITY_Renewal Reminder Emails|Renewal Reminder Emails]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Composer Props & Placement Mode|Composer Props & Placement Mode]]
- [[_COMMUNITY_Package Metadata & Overrides|Package Metadata & Overrides]]
- [[_COMMUNITY_GDPR Data Export & Delete|GDPR Data Export & Delete]]
- [[_COMMUNITY_Saved Cards|Saved Cards]]
- [[_COMMUNITY_Generated Convex Server Types|Generated Convex Server Types]]
- [[_COMMUNITY_Saved Walls|Saved Walls]]
- [[_COMMUNITY_Schema & Data Model|Schema & Data Model]]
- [[_COMMUNITY_Convex AI Guidelines|Convex AI Guidelines]]
- [[_COMMUNITY_App Layout & Web Vitals|App Layout & Web Vitals]]
- [[_COMMUNITY_Convex Skill Icons|Convex Skill Icons]]
- [[_COMMUNITY_Brand Assets & UI Mockups|Brand Assets & UI Mockups]]
- [[_COMMUNITY_E2E Wall Load Tests|E2E Wall Load Tests]]
- [[_COMMUNITY_Sentry API Error Example|Sentry API Error Example]]
- [[_COMMUNITY_Sentry Frontend Error Example|Sentry Frontend Error Example]]
- [[_COMMUNITY_Global Error Boundary|Global Error Boundary]]
- [[_COMMUNITY_Convex Auth Config|Convex Auth Config]]
- [[_COMMUNITY_MCP Dev Tools Config|MCP Dev Tools Config]]
- [[_COMMUNITY_Next.js Config & CSP|Next.js Config & CSP]]
- [[_COMMUNITY_Privacy Policy Page|Privacy Policy Page]]
- [[_COMMUNITY_Proxy Config|Proxy Config]]
- [[_COMMUNITY_Location Resolve Route|Location Resolve Route]]
- [[_COMMUNITY_Terms & Conditions Page|Terms & Conditions Page]]
- [[_COMMUNITY_Convex App Config|Convex App Config]]
- [[_COMMUNITY_E2E Responsive Tests|E2E Responsive Tests]]
- [[_COMMUNITY_OpenAI Agent Config (Create Component)|OpenAI Agent Config (Create Component)]]
- [[_COMMUNITY_OpenAI Agent Config (Migration Helper)|OpenAI Agent Config (Migration Helper)]]
- [[_COMMUNITY_OpenAI Agent Config (Performance Audit)|OpenAI Agent Config (Performance Audit)]]
- [[_COMMUNITY_OpenAI Agent Config (Quickstart)|OpenAI Agent Config (Quickstart)]]
- [[_COMMUNITY_OpenAI Agent Config (Setup Auth)|OpenAI Agent Config (Setup Auth)]]

## God Nodes (most connected - your core abstractions)
1. `api` - 23 edges
2. `WallCard` - 20 edges
3. `parseCountrySlug()` - 19 edges
4. `fetchInitialCards()` - 17 edges
5. `compilerOptions` - 16 edges
6. `parseStateSlug()` - 14 edges
7. `parseCategorySlug()` - 14 edges
8. `compilerOptions` - 13 edges
9. `Playwright CLI Browser Automation Skill` - 13 edges
10. `scripts` - 12 edges

## Surprising Connections (you probably didn't know these)
- `LocalWall Playwright E2E Test Suite` --conceptually_related_to--> `Playwright CLI Browser Automation Skill`  [INFERRED]
  README.md → .claude/skills/playwright-cli/SKILL.md
- `generateMetadata()` --calls--> `getPublicCard`  [INFERRED]
  app/card/[id]/page.tsx → src/server/public-card.ts
- `WallLocationCategoryPage()` --calls--> `parseCategorySlug()`  [INFERRED]
  app/wall/[location]/[category]/page.tsx → src/lib/wall-slug.ts
- `Playwright CLI Page Snapshot (TodoMVC 1)` --references--> `Playwright CLI Browser Automation Skill`  [INFERRED]
  .playwright-cli/page-2026-06-25T00-39-04-264Z.yml → .claude/skills/playwright-cli/SKILL.md
- `Playwright CLI Page Snapshot (TodoMVC 2)` --references--> `Playwright CLI Browser Automation Skill`  [INFERRED]
  .playwright-cli/page-2026-06-25T00-39-50-434Z.yml → .claude/skills/playwright-cli/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Performance Audit Signal-to-Reference Routing** — convex_performance_audit_skill_md, hot_path_rules_md, occ_conflicts_md, subscription_cost_md, function_budget_md [EXTRACTED 1.00]
- **Component Shape Decision Tree** — convex_create_component_skill_md, local_components_md, packaged_components_md, hybrid_components_md [EXTRACTED 1.00]
- **Widen-Migrate-Narrow Multi-Deploy Flow** — concept_widen_migrate_narrow, concept_dual_write, concept_dual_read, concept_migrations_component [INFERRED 0.85]
- **Convex Third-Party Auth Provider Options (Auth0/Clerk/WorkOS)** — auth0_ref_auth0_provider, clerk_ref_clerk_provider, workos_authkit_ref_workos_authkit, convex_auth_ref_convex_auth_provider [INFERRED 0.95]
- **PostHog Integration Workflow (Plan/Edit/Revise/Conclude)** — 1_begin_posthog_event_plan, 2_edit_posthog_event_impl, 3_revise_posthog_event_revise, 4_conclude_posthog_conclude [EXTRACTED 1.00]
- **Playwright CLI Test Lifecycle (Generate/Debug/Heal)** — spec_driven_testing_plan_generate_heal, playwright_tests_debug_attach, test_generation_playwright_codegen [EXTRACTED 1.00]

## Communities (75 total, 19 thin omitted)

### Community 0 - "Rate Limiting & API Utilities"
Cohesion: 0.08
Nodes (32): DurableRateLimitScope, durableUserRateLimit(), observe(), buckets, isSameOriginRequest(), pruneBuckets(), rateLimit(), handleCheckout() (+24 more)

### Community 1 - "Billing, Admin & Test Infrastructure"
Cohesion: 0.12
Nodes (21): metadata, bundleCard, bundleCities, adminEnv, adminIdentity, applyEnv(), makeT(), modules (+13 more)

### Community 2 - "Geo-Routed Pages & RSS Feeds"
Cohesion: 0.16
Nodes (30): GET(), Props, GET(), GET(), NotFound(), CategoryPage(), generateMetadata(), CityPage() (+22 more)

### Community 3 - "Auth Providers & Analytics Integration"
Cohesion: 0.07
Nodes (40): PostHog Event Planning Phase, PostHog Event Implementation Phase, PostHog Integration Revision Phase, PostHog Integration Conclusion Phase, Auth0 CLI Setup Path, Auth0 Provider Integration Guide, convex/auth.config.ts for Auth0, ConvexProviderWithAuth0 Wrapper (+32 more)

### Community 4 - "Card Data Layer (Convex)"
Cohesion: 0.06
Nodes (34): category, create, generateUploadUrl, getCardForEmbed, getLikedCards, getLiveViewCounts, getMyCardDailyStats, getMyCardForRenewal (+26 more)

### Community 5 - "Card Display & Embed Pages"
Cohesion: 0.08
Nodes (23): generateMetadata(), generateMetadata(), metadata, Props, AppProviders(), AppProvidersProps, GlobalOwnerDashboard(), Image() (+15 more)

### Community 6 - "Convex Agent Skills & Concepts"
Cohesion: 0.09
Nodes (30): Advanced Component Patterns Reference, Convex Component Boundary, Convex Auth Provider, ConvexProvider React Client Setup, Digest/Summary Table Pattern, Dual Read Strategy, Dual Write Strategy, Function Handle for Callbacks (+22 more)

### Community 7 - "Admin Panel & Moderation UI"
Cohesion: 0.08
Nodes (17): AdminDashboardData, AdminPanelProps, AdminPlayground(), BULK_CATEGORIES, BULK_COUNTS, BULK_LINES, BULK_NAMES, BULK_THEMES (+9 more)

### Community 8 - "UI Shared Components & Detail Panel"
Cohesion: 0.08
Nodes (16): _handler(), toast(), Toaster(), ToastFn, ToastType, CardEvent, DetailPanel(), REPORT_REASONS (+8 more)

### Community 9 - "Owner Dashboard & Card Editing"
Cohesion: 0.17
Nodes (18): OwnerDashboard, ComposerForm, EditCardModal(), themeLabels, OwnerDashboardProps, renewalOptions, CardCategory, CardImageMode (+10 more)

### Community 10 - "Admin Backend (Convex)"
Cohesion: 0.08
Nodes (25): approveVerification, blockUser, configuredAdminEmails(), getAccess, getAdminIdentity(), getAuditLog, getDashboard, PG_DURATIONS (+17 more)

### Community 11 - "Dependencies & Package Config"
Cohesion: 0.09
Nodes (23): dependencies, @clerk/nextjs, convex, country-state-city, @fontsource/barlow-condensed, @fontsource/caveat, @fontsource/inter, lucide-react (+15 more)

### Community 12 - "Trending Feed UI"
Cohesion: 0.06
Nodes (34): ClerkThemePortal(), HomeHowItWorksModal(), STEPS, HomeNav(), HomePage(), HomePostButton(), Loc, HomeSearch() (+26 more)

### Community 13 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Card Composer Form"
Cohesion: 0.12
Nodes (15): BundleCity, clearImagesFromIDB(), countries, defaultStates, DetailField, detailFieldLabels, featuredTierOptions, initialForm (+7 more)

### Community 15 - "Home Page & Root Routes"
Cohesion: 0.07
Nodes (31): metadata, Props, RootPage(), BASE_URL, CITY_PATHS, sitemap(), STATIC_ROUTES, US_STATE_CODES (+23 more)

### Community 16 - "Location Combobox & Seed Data"
Cohesion: 0.14
Nodes (12): LocationCombobox(), Option, Props, seedCards, Composer, defaultSeedLocation, DetailPanel, OwnerDashboard (+4 more)

### Community 17 - "Convex TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+7 more)

### Community 19 - "Cron Jobs, HTTP & Users"
Cohesion: 0.16
Nodes (9): crons, http, getMyCustomerId, getTopWalls, getVisitors, getWall, recordVisit, httpAction (+1 more)

### Community 20 - "Card Types & Wall Card Component"
Cohesion: 0.16
Nodes (11): cardFormats, WallCard, CardStyle, hashString(), WallCard(), WallCardProps, Dims, Props (+3 more)

### Community 21 - "Playwright CLI Testing Skill"
Cohesion: 0.24
Nodes (13): Playwright CLI Element Attribute Inspection, Playwright CLI Page Snapshot (TodoMVC 1), Playwright CLI Page Snapshot (TodoMVC 2), Playwright CLI Browser Automation Skill, Playwright Test Debugging with --debug=cli, Playwright CLI Request Mocking, Playwright CLI run-code Custom Code Execution, Playwright CLI Browser Session Management (+5 more)

### Community 22 - "Dashboard Signal & Wall App"
Cohesion: 0.21
Nodes (10): openDashboard(), pushDashboardHandler(), stack, AdminPanel, allowedImageTypes, ConnectedWallApp(), createImageVariants(), encodeWebpVariant() (+2 more)

### Community 24 - "Build & Dev Scripts"
Cohesion: 0.17
Nodes (12): scripts, build, convex:deploy, convex:dev, dev, start, test, test:e2e (+4 more)

### Community 25 - "Digest Email System"
Cohesion: 0.22
Nodes (10): buildCardRow(), buildDigestEmail(), DigestCard, escapeHtml(), findCitiesWithSubscribers, findNewCardsForLocation, markDigestSent, sendWeeklyDigests (+2 more)

### Community 26 - "Payments Internal Logic"
Cohesion: 0.18
Nodes (10): cancelAutoRenewOnCard, clearAutoRenew, completeBundlePosting, completePaidCard, completePaidRenewal, completeSubscriptionRenewal, completeVerificationRequest, handleStripeWebhook (+2 more)

### Community 27 - "Rate Limits & Reviews"
Cohesion: 0.20
Nodes (8): quotas, scopeValidator, take, getMyReview, listForCard, remove, upsert, mutation

### Community 28 - "Stripe Payments Actions"
Cohesion: 0.22
Nodes (8): cancelAutoRenew, finalizeBundlePosting, finalizePaidCard, finalizePaidRenewal, finalizeSubscriptionPosting, finalizeSubscriptionRenewal, finalizeVerification, action

### Community 29 - "Renewal Reminder Emails"
Cohesion: 0.25
Nodes (8): buildReminderEmail(), escapeHtml(), findCardsNeedingReminders, markReminderSent, RENEWAL_TIERS, sendExpirationReminders, internalAction, internalMutation

### Community 30 - "Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, convex-test, @edge-runtime/vm, @playwright/test, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 31 - "Composer Props & Placement Mode"
Cohesion: 0.31
Nodes (8): ComposerProps, LiveCardPreview(), PlacementMode(), PlacementModeProps, CardDraft, getCardFormat(), Placement, makeDemoCard()

### Community 33 - "Package Metadata & Overrides"
Cohesion: 0.25
Nodes (7): name, overrides, postcss, ws, private, type, version

### Community 36 - "GDPR Data Export & Delete"
Cohesion: 0.29
Nodes (6): deleteAccount, _deleteMyData, exportMyData, _gatherMyData, GdprExport, internalQuery

### Community 37 - "Saved Cards"
Cohesion: 0.29
Nodes (3): list, mergeLocal, setSaved

### Community 38 - "Generated Convex Server Types"
Cohesion: 0.29
Nodes (6): ActionCtx, DatabaseReader, DatabaseWriter, Env, MutationCtx, QueryCtx

### Community 39 - "Saved Walls"
Cohesion: 0.33
Nodes (3): isSaved, list, setSaved

### Community 40 - "Schema & Data Model"
Cohesion: 0.33
Nodes (4): DataModel, Doc, Id, TableNames

### Community 41 - "Convex AI Guidelines"
Cohesion: 0.40
Nodes (5): AGENTS.md Convex AI Guidelines Directive, npx convex ai-files install, Convex AI Guidelines (generated), Convex HTTP Endpoint Pattern (httpAction), Convex Validator Types

### Community 43 - "Convex Skill Icons"
Cohesion: 1.00
Nodes (5): Convex Create Component Icon (3D Cube / Package), Convex Migration Helper Icon (Circular Arrows / Refresh), Convex Performance Audit Icon (CPU / Processor Chip), Convex Quickstart Icon (Play Button Circle), Convex Setup Auth Icon (Padlock / Security)

### Community 44 - "Brand Assets & UI Mockups"
Cohesion: 0.67
Nodes (4): LocalWall Logo Big (Full Branding with Tagline and Category Icons), LocalWall Logo Small (Compact Horizontal Logo), Wall Concept Mockup (Bulletin Board UI with Cards and Detail Panel), Wall Texture (Weathered Urban Bulletin Board Background Texture)

## Knowledge Gaps
- **349 isolated node(s):** `getAccess`, `getDashboard`, `sendTestReminderEmail`, `setUserVerified`, `approveVerification` (+344 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api` connect `Billing, Admin & Test Infrastructure` to `Rate Limiting & API Utilities`, `Geo-Routed Pages & RSS Feeds`, `Card Display & Embed Pages`, `Admin Panel & Moderation UI`, `UI Shared Components & Detail Panel`, `Owner Dashboard & Card Editing`, `Admin Backend (Convex)`, `Trending Feed UI`, `Home Page & Root Routes`, `Dashboard Signal & Wall App`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `WallCard` connect `Card Types & Wall Card Component` to `Geo-Routed Pages & RSS Feeds`, `UI Shared Components & Detail Panel`, `Owner Dashboard & Card Editing`, `Trending Feed UI`, `Location Combobox & Seed Data`, `Dashboard Signal & Wall App`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `mutation` connect `Rate Limits & Reviews` to `Card Data Layer (Convex)`, `Saved Cards`, `Saved Walls`, `Admin Backend (Convex)`, `Cron Jobs, HTTP & Users`, `Digest Email System`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `parseCountrySlug()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`parseCountrySlug()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `fetchInitialCards()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`fetchInitialCards()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `getAccess`, `getDashboard`, `sendTestReminderEmail` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rate Limiting & API Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.07678075855689177 - nodes in this community are weakly interconnected._