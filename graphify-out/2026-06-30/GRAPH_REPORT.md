# Graph Report - local-wall  (2026-06-30)

## Corpus Check
- 225 files · ~442,103 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1511 nodes · 2180 edges · 112 communities (100 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aaf45f77`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Rate Limiting & API Utilities|Rate Limiting & API Utilities]]
- [[_COMMUNITY_Billing, Admin & Test Infrastructure|Billing, Admin & Test Infrastructure]]
- [[_COMMUNITY_Geo-Routed Pages & RSS Feeds|Geo-Routed Pages & RSS Feeds]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 113|Community 113]]

## God Nodes (most connected - your core abstractions)
1. `api` - 31 edges
2. `WallCard` - 20 edges
3. `parseCountrySlug()` - 19 edges
4. `PostHog Next.js app router example` - 19 edges
5. `getClerkPublishableKey()` - 18 edges
6. `fetchInitialCards()` - 17 edges
7. `compilerOptions` - 16 edges
8. `Browser Automation with playwright-cli` - 15 edges
9. `scripts` - 14 edges
10. `getCardFormat()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `generateMetadata()` --calls--> `getPublicCard`  [INFERRED]
  app/card/[id]/page.tsx → src/server/public-card.ts
- `CardPage()` --calls--> `getClerkPublishableKey()`  [INFERRED]
  app/card/[id]/page.tsx → src/lib/clerk.ts
- `RenewCardPage()` --calls--> `getClerkPublishableKey()`  [EXTRACTED]
  app/renew/[cardId]/page.tsx → src/lib/clerk.ts
- `WallLocationCategoryPage()` --calls--> `parseCategorySlug()`  [INFERRED]
  app/wall/[location]/[category]/page.tsx → src/lib/wall-slug.ts
- `generateMetadata()` --calls--> `parseCategorySlug()`  [INFERRED]
  app/[country]/[state]/[city]/[category]/page.tsx → src/lib/wall-slug.ts

## Import Cycles
- None detected.

## Communities (112 total, 12 thin omitted)

### Community 0 - "Rate Limiting & API Utilities"
Cohesion: 0.08
Nodes (27): BundleCity, businessCardShapeOptions, clearImagesFromIDB(), Composer(), ComposerForm, countries, defaultStates, DetailField (+19 more)

### Community 1 - "Billing, Admin & Test Infrastructure"
Cohesion: 0.08
Nodes (17): _handler(), toast(), Toaster(), ToastFn, ToastType, CardEvent, cardShapeLabels, DetailPanel() (+9 more)

### Community 2 - "Geo-Routed Pages & RSS Feeds"
Cohesion: 0.09
Nodes (25): metadata, bundleCard, bundleCities, adminEnv, adminIdentity, applyEnv(), makeT(), modules (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (11): GlobalOwnerDashboard(), OwnerDashboard, pushDashboardHandler(), OwnerDashboardProps, renewalOptions, CardUpdate, CreateCard, OwnerCard (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (36): metadata, Props, RootPage(), Props, WallLocationCategoryPage(), ICONS, Props, HomeHowItWorksModal() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (9): AppProviders(), getClerkPublishableKey(), config, signInAppearance, SignInPage(), signUpAppearance, SignUpPage(), UnsubscribePage() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (32): DurableRateLimitScope, durableUserRateLimit(), observe(), buckets, isSameOriginRequest(), pruneBuckets(), rateLimit(), handleCheckout() (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (30): GET(), Props, GET(), GET(), NotFound(), CategoryPage(), generateMetadata(), CityPage() (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (40): approveVerification, blockUser, configuredAdminEmails(), deleteAllCardsByOwner, deleteCardsByOwnerBatch, getAccess, getAdminIdentity(), getAuditLog (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (25): metadata, AnalyticsConsent, AnalyticsConsentContext, AnalyticsConsentContextValue, AnalyticsConsentProvider(), useAnalyticsConsent(), AnalyticsConsentToast(), AnalyticsTracker() (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (37): backfillDerivedProfileFields, cardShape, category, create, generateUploadUrl, getCardForEmbed, getLikedCards, getLiveViewCounts (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (20): BULK_CATEGORIES, BULK_COUNTS, BULK_LINES, BULK_NAMES, BULK_THEMES, CreateCardSection(), CSV_ALLOWED_HEADERS, CSV_REQUIRED_HEADERS (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (35): Advanced: Multiple Cookies or Custom Options, Advanced: Multiple Operations, Authentication State Reuse, Clear All Cookies, Clear All localStorage, Clear sessionStorage, Common Patterns, Cookies (+27 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (18): recordLogin, reportBug, sendContactMessage, crons, getMyReview, listForCard, remove, upsert (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (29): 1. Install dependencies, 2. Configure environment variables, 3. Run the development server, App router differences from pages router, Client-side initialization (instrumentation-client.ts), Deploy on Vercel, .env.example, Error tracking (profile/page.tsx) (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (28): Accessing PostHog, App router, Beta: integration via LLM, Bun, Bun, Client-side setup, Community questions, Configuring a reverse proxy to PostHog (+20 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (17): catalog, buildPlaygroundCsvTemplate(), COUNTRY_ALIASES, CSV_ALLOWED_HEADERS, CSV_OPTIONAL_HEADERS, CSV_REQUIRED_HEADERS, csvMaybeInteger(), csvMaybeNumber() (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (12): generateMetadata(), generateMetadata(), Image(), loadFont(), size, THEMES, CardPage(), CardPageProps (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (24): Agent Mode, Checklist, Convex Quickstart, Development vs Production, Environment variables, Install, Next.js (App Router), Next Steps (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (24): dependencies, @clerk/nextjs, convex, country-state-city, exceljs, @fontsource/barlow-condensed, @fontsource/caveat, @fontsource/inter (+16 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (14): Browser Automation with playwright-cli, Browser Sessions, Example: Debugging with DevTools, Example: Form submission, Example: Interactive session, Example: Multi-tab workflow, Installation, Open parameters (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (23): 1. Push Filters To Storage, 2. Minimize Data Sources, 3. Minimize Row Size, 4. Isolate Frequently-Updated Fields, 5. Match Consistency To Read Patterns, Aggregates, Backfills, Check for redundant indexes (+15 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (23): 1\. Call `identify` as soon as you're able to, 2\. Use unique strings for distinct IDs, 3\. Reset after logout, 4\. Person profiles and properties, 5\. Use deep links between platforms, Android, Android, Android (+15 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (11): seedCards, CreateCardRateLimit, Composer, defaultSeedLocation, DetailPanel, OwnerDashboard, PlacementMode, WallApp() (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (20): Action guidelines, Authentication guidelines, Convex guidelines, Cron guidelines, File storage guidelines, Full text search guidelines, Function calling, Function guidelines (+12 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (20): 1. Use point-in-time reads when live updates are not valuable, 2. Batch related data into fewer queries, 3. Use skip to avoid unnecessary subscriptions, 4. Isolate frequently-updated fields into separate documents, 5. Use the aggregate component for counts and sums, 6. Narrow query read sets, 7. Remove `Date.now()` from queries, 8. Consider pagination strategy (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (15): 1. Name Browser Sessions Semantically, 2. Always Clean Up, 3. Delete Stale Browser Data, A/B Testing Sessions, Best Practices, Browser Session Commands, Browser Session Configuration, Browser Session Isolation Properties (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (18): 1. Bound your reads, 2. Read smaller shapes, 3. Break large mutations into batches, 4. Move heavy work to actions, 5. Trim return values, 6. Replace `ctx.runQuery` and `ctx.runMutation` with helper functions, 7. Avoid unnecessary `runAction` calls, Common Causes (+10 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (17): Adding Index, Adding New Table, Adding Optional Field, Breaking Changes: The Deployment Workflow, Common Migration Patterns, Common Pitfalls, Convex Migration Helper, Don't Delete Data (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (18): 1.1 Prerequisite: workspace, 1.2 Prerequisite: seed test, 1.3 Explore the app, 1.4 Write the spec file, 1. Planning, 2.1 Inputs, 2.2 Generate one scenario, 2.3 Generate multiple scenarios (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (16): Advanced Patterns, Authentication and environment access, Checklist, Choose the Shape, Client-facing API, Component Skeleton, Convex Create Component, Critical Rules (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (35): ClerkAvatarMenu(), ClerkAvatarMenuProps, ClerkProfile, AdminPanel, GlobalAdminPanel(), HomeNav(), openAdminPanel(), pushAdminHandler() (+27 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (16): Card renewal reminders, Commands, Composer draft autosave, Connect Clerk, Connect Convex, Convex unit tests, Enable the admin panel, Homepage (+8 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (8): BugReportLink(), GlobalBugReportModal(), openBugReport(), pushBugReportHandler(), stack, BUG_REASONS, BugReason, BugReportPage()

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (15): 1. Scope the problem, 2. Trace the full read and write set, 3. Apply fixes from the relevant reference, 4. Fix sibling functions together, 5. Verify before finishing, Checklist, Convex Performance Audit, Escalate Larger Fixes (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (15): Cancel a Running Migration, Check Migration Status, Configuration Options, Custom Batch Size, Define a Migration, Dry Run, Installation, Migrate a Subset Using an Index (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (15): 1. Reduce read set size, 2. Split hot documents, 3. Move non-critical work to scheduled functions, 4. Combine competing writes, Broad read sets causing false conflicts, Common Causes, Core Principle, Fan-out from triggers or cascading writes (+7 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (14): scripts, build, convex:deploy, convex:dev, dev, lint, start, test (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (10): Abort statuses, Status, Task list, Status, Status, Agent skill, Next steps, PostHog post-wizard report (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (13): Clipboard, Complex Workflows, Error Handling, File Downloads, Frames and Iframes, Geolocation, JavaScript Execution, Media Emulation (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (16): 1. Start Tracing Before the Problem, 2. Clean Up Old Traces, Analyzing Performance, Basic Usage, Best Practices, Capturing Evidence, Debugging Failed Actions, Limitations (+8 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (11): Checklist, Concrete Steps, Convex Auth, Expected Files and Decisions, Gotchas, Human Handoff, Production, Validation (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (4): Examples, Inspecting Element Attributes, Debugging Playwright Tests, Running Playwright Tests

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (11): Adding a Required Field, Changing a Field Type, Cleaning Up Orphaned Documents, Deleting a Field, Dual Read, Dual Write (Preferred), Migration Patterns Reference, Small Table Shortcut (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (16): BackCardPreview(), ComposerProps, EditCardModal(), shapeLabels, themeLabels, PlacementMode(), PlacementModeProps, businessCardFormats (+8 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (10): buildCardRow(), buildDigestEmail(), DigestCard, escapeHtml(), findCitiesWithSubscribers, findNewCardsForLocation, markDigestSent, sendWeeklyDigests (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (10): cancelAutoRenewOnCard, clearAutoRenew, completeBundlePosting, completePaidCard, completePaidRenewal, completeSubscriptionRenewal, completeVerificationRequest, handleStripeWebhook (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (10): After Choosing a Provider, Checklist, Convex Authentication Setup, Core Pattern: Protecting Backend Functions, First Step: Choose the Auth Provider, Provider References, Reference Files, When Not to Use (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (11): devDependencies, convex-test, @edge-runtime/vm, eslint, eslint-config-next, @playwright/test, @types/node, @types/react (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (10): Auth0, Checklist, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (10): Checklist, Clerk, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (10): Checklist, Concrete Steps, Files and Env Vars To Expect, Gotchas, Key Setup Areas, Production, Validation, What To Do (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (10): http, cancelAutoRenew, finalizeBundlePosting, finalizePaidCard, finalizePaidRenewal, finalizeSubscriptionPosting, finalizeSubscriptionRenewal, finalizeVerification (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): deleteCardOwnedData(), deleteAccount, _deleteMyData, exportMyData, _gatherMyData, GdprExport, action

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (8): metadata, Props, RenewCardPage(), cardStyle, Props, RenewPage(), TIERS, wrapStyle

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (8): buildReminderEmail(), escapeHtml(), findCardsNeedingReminders, markReminderSent, RENEWAL_TIERS, sendExpirationReminders, internalAction, internalQuery

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (8): 1. Use Descriptive Filenames, 2. Record entire hero scripts., Basic Recording, Best Practices, Limitations, Overlay API Summary, Tracing vs Video, Video Recording

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): Error tracking, Framework guidelines, Identifying users, Key principles, PostHog integration for Next.js App Router, Reference files, Workflow

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (7): name, overrides, postcss, ws, private, type, version

### Community 61 - "Community 61"
Cohesion: 0.25
Nodes (7): Build Flow, Checklist, Default Approach, Package Exports, Packaged Convex Components, Testing, When to Choose This

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (8): Advanced Mocking with run-code, CLI Route Commands, Conditional Response Based on Request, Delayed Response, Modify Real Response, Request Mocking, Simulate Network Failures, URL Patterns

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (8): 1. Use Semantic Locators, 2. Explore Before Recording, 3. Add Assertions Manually, Best Practices, Building a Test File, Example Workflow, How It Works, Test Generation

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (17): CardVars, hashStr(), MiniCard(), Props, TrendingCardGrid(), DetailPanel, Props, TrendingCardModal() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (6): ActionCtx, DatabaseReader, DatabaseWriter, Env, MutationCtx, QueryCtx

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (5): Advanced Component Patterns, Class-based client wrappers, Deriving validators from schema, Function Handles for callbacks, Static configuration with a globals table

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): Checklist, Default Advice, Hybrid Convex Components, Risks, What This Means

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (5): Checklist, Default Layout, Local Convex Components, When to Choose This, Workflow Notes

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): Convex, Route to the Right Skill, Start Here, When Not to Use

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): Agent skill, Next steps, PostHog post-wizard report, Verify before merging

### Community 72 - "Community 72"
Cohesion: 0.25
Nodes (8): ContactLink(), openContact(), pushContactHandler(), stack, fetchTopCards(), fetchTopWalls(), metadata, TrendingPage()

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (11): cardFormats, WallCard, CardStyle, hashString(), WallCard(), WallCardProps, Dims, Props (+3 more)

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (6): backfillUsernames, purgeStale, quotas, scopeValidator, take, internalMutation

### Community 106 - "Community 106"
Cohesion: 0.28
Nodes (4): AppProvidersProps, GlobalContactModal(), ClerkContactUser, ContactPage()

### Community 107 - "Community 107"
Cohesion: 0.20
Nodes (10): Commands, Core, DevTools, Keyboard, Mouse, Navigation, Network, Save as (+2 more)

### Community 108 - "Community 108"
Cohesion: 0.29
Nodes (3): list, mergeLocal, setSaved

### Community 109 - "Community 109"
Cohesion: 0.40
Nodes (5): Attach by channel name, Attach via browser extension, Attach via CDP endpoint, Attaching to a Running Browser, Detach

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (4): EmailTestSection(), SubscriptionSection(), useAsync(), VerificationSection()

### Community 113 - "Community 113"
Cohesion: 0.29
Nodes (7): BASE_URL, CITY_PATHS, sitemap(), STATIC_ROUTES, US_STATE_CODES, fetchPublishedCardIds(), categories

## Knowledge Gaps
- **845 isolated node(s):** `npx`, `Props`, `Props`, `Props`, `Props` (+840 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api` connect `Geo-Routed Pages & RSS Feeds` to `Community 32`, `Community 64`, `Community 34`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Billing, Admin & Test Infrastructure`, `Community 106`, `Community 10`, `Community 11`, `Community 17`, `Community 56`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `WallCard` connect `Community 75` to `Community 64`, `Billing, Admin & Test Infrastructure`, `Community 32`, `Community 3`, `Community 7`, `Community 46`, `Community 23`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `PrivacySettingsLink()` connect `Community 9` to `Community 72`, `Community 4`, `Community 23`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `parseCountrySlug()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`parseCountrySlug()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `Props`, `Props` to the rest of the system?**
  _845 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rate Limiting & API Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Billing, Admin & Test Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._