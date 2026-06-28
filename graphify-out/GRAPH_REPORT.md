# Graph Report - local-wall  (2026-06-28)

## Corpus Check
- 215 files · ~435,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 35 nodes · 40 edges · 3 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db2b5722`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Rate Limiting & API Utilities|Rate Limiting & API Utilities]]
- [[_COMMUNITY_Billing, Admin & Test Infrastructure|Billing, Admin & Test Infrastructure]]
- [[_COMMUNITY_Geo-Routed Pages & RSS Feeds|Geo-Routed Pages & RSS Feeds]]

## God Nodes (most connected - your core abstractions)
1. `openImagesDB()` - 4 edges
2. `ImageSwapViewer()` - 3 edges
3. `saveImagesToIDB()` - 2 edges
4. `loadImagesFromIDB()` - 2 edges
5. `clearImagesFromIDB()` - 2 edges
6. `websiteHref()` - 2 edges
7. `DetailPanel()` - 2 edges
8. `ComposerProps` - 1 edges
9. `ComposerForm` - 1 edges
10. `BundleCity` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (3 total, 0 thin omitted)

### Community 0 - "Rate Limiting & API Utilities"
Cohesion: 0.10
Nodes (13): BundleCity, ComposerForm, ComposerProps, countries, defaultStates, DetailField, detailFieldLabels, featuredTierOptions (+5 more)

### Community 1 - "Billing, Admin & Test Infrastructure"
Cohesion: 0.24
Nodes (7): CardEvent, DetailPanel(), REPORT_REASONS, ReportReason, websiteHref(), ImageSwapViewer(), ImageSwapViewerProps

### Community 2 - "Geo-Routed Pages & RSS Feeds"
Cohesion: 0.50
Nodes (4): clearImagesFromIDB(), loadImagesFromIDB(), openImagesDB(), saveImagesToIDB()

## Knowledge Gaps
- **17 isolated node(s):** `ComposerProps`, `ComposerForm`, `BundleCity`, `countries`, `defaultStates` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ImageSwapViewer()` connect `Billing, Admin & Test Infrastructure` to `Rate Limiting & API Utilities`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `openImagesDB()` connect `Geo-Routed Pages & RSS Feeds` to `Rate Limiting & API Utilities`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `ComposerProps`, `ComposerForm`, `BundleCity` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rate Limiting & API Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._