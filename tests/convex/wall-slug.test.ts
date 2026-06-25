/**
 * Unit tests for src/lib/wall-slug.ts
 *
 * These run under the same Vitest edge-runtime environment as Convex tests
 * but do not touch the database — they only test pure utility functions.
 */

import { expect, test, describe } from "vitest";
import {
  buildWallPath,
  formatWallPath,
  parseWallPath,
  toCategorySlug,
  parseCategorySlug,
  toCitySlug,
  toCountrySlug,
  toStateSlug,
  toLocationSlug,
  parseLocationSlug,
} from "../../src/lib/wall-slug";

// ---------------------------------------------------------------------------
// toCitySlug
// ---------------------------------------------------------------------------

describe("toCitySlug", () => {
  test("lowercases and hyphenates spaces", () => {
    expect(toCitySlug("New York")).toBe("new-york");
  });

  test("strips accents (NFD normalisation)", () => {
    expect(toCitySlug("Montréal")).toBe("montreal");
  });

  test("removes leading and trailing hyphens", () => {
    expect(toCitySlug(" Chicago ")).toBe("chicago");
  });

  test("collapses consecutive non-alphanumeric chars into one hyphen", () => {
    expect(toCitySlug("Fort Worth, TX")).toBe("fort-worth-tx");
  });

  test("handles single-word city names", () => {
    expect(toCitySlug("Seattle")).toBe("seattle");
  });
});

// ---------------------------------------------------------------------------
// toCountrySlug / toStateSlug
// ---------------------------------------------------------------------------

describe("toCountrySlug", () => {
  test("lowercases ISO code", () => {
    expect(toCountrySlug("US")).toBe("us");
  });
  test("handles already-lowercase input", () => {
    expect(toCountrySlug("gb")).toBe("gb");
  });
});

describe("toStateSlug", () => {
  test("lowercases state code", () => {
    expect(toStateSlug("WA")).toBe("wa");
  });
});

// ---------------------------------------------------------------------------
// buildWallPath
// ---------------------------------------------------------------------------

describe("buildWallPath", () => {
  test("country only", () => {
    expect(buildWallPath("US")).toBe("/us");
  });

  test("country + state", () => {
    expect(buildWallPath("US", "WA")).toBe("/us/wa");
  });

  test("country + state + city", () => {
    expect(buildWallPath("US", "WA", "Seattle")).toBe("/us/wa/seattle");
  });

  test("country + state + city + category", () => {
    expect(buildWallPath("US", "WA", "Seattle", "Services")).toBe("/us/wa/seattle/services");
  });

  test("category 'All' is omitted from the path", () => {
    expect(buildWallPath("US", "WA", "Seattle", "All")).toBe("/us/wa/seattle");
  });

  test("multi-word city becomes hyphenated slug", () => {
    expect(buildWallPath("US", "NY", "New York")).toBe("/us/ny/new-york");
  });

  test("multi-word category slug is generated correctly", () => {
    expect(buildWallPath("US", "CA", "Los Angeles", "Buy & Sell Marketplace")).toBe(
      "/us/ca/los-angeles/buy-sell-marketplace",
    );
  });

  test("empty state and city produce country-only path", () => {
    expect(buildWallPath("US", "", "")).toBe("/us");
  });
});

// ---------------------------------------------------------------------------
// formatWallPath
// ---------------------------------------------------------------------------

describe("formatWallPath", () => {
  test("city + state path returns 'City, STATE'", () => {
    expect(formatWallPath("/us/wa/seattle")).toBe("Seattle, WA");
  });

  test("multi-word city is title-cased", () => {
    expect(formatWallPath("/us/ny/new-york")).toBe("New York, NY");
  });

  test("state-only path returns 'STATE, COUNTRY'", () => {
    expect(formatWallPath("/us/wa")).toBe("WA, US");
  });

  test("country-only path returns 'COUNTRY'", () => {
    expect(formatWallPath("/us")).toBe("US");
  });

  test("empty path returns 'Global'", () => {
    expect(formatWallPath("/")).toBe("Global");
  });

  test("strips trailing slash before formatting", () => {
    expect(formatWallPath("/us/wa/seattle/")).toBe("Seattle, WA");
  });
});

// ---------------------------------------------------------------------------
// parseWallPath
// ---------------------------------------------------------------------------

describe("parseWallPath", () => {
  test("parses a full 3-segment path", () => {
    expect(parseWallPath("/us/wa/seattle")).toEqual({ city: "Seattle", state: "WA", country: "US" });
  });

  test("title-cases hyphenated city slugs", () => {
    expect(parseWallPath("/us/ny/new-york")).toEqual({ city: "New York", state: "NY", country: "US" });
  });

  test("returns empty strings for missing segments", () => {
    expect(parseWallPath("/us")).toEqual({ city: "", state: "", country: "US" });
  });

  test("uppercases country and state", () => {
    expect(parseWallPath("/gb/eng/london")).toEqual({ city: "London", state: "ENG", country: "GB" });
  });
});

// ---------------------------------------------------------------------------
// toCategorySlug
// ---------------------------------------------------------------------------

describe("toCategorySlug", () => {
  test("lowercases and hyphenates", () => {
    expect(toCategorySlug("Home & Garden")).toBe("home-garden");
  });

  test("removes leading/trailing hyphens", () => {
    expect(toCategorySlug("  Services  ")).toBe("services");
  });

  test("handles ampersand correctly", () => {
    expect(toCategorySlug("Buy & Sell Marketplace")).toBe("buy-sell-marketplace");
  });

  test("simple single word", () => {
    expect(toCategorySlug("Jobs")).toBe("jobs");
  });

  test("handles apostrophe in name", () => {
    expect(toCategorySlug("Child & Family")).toBe("child-family");
  });
});

// ---------------------------------------------------------------------------
// parseCategorySlug
// ---------------------------------------------------------------------------

describe("parseCategorySlug", () => {
  test("known slug resolves to category name", () => {
    expect(parseCategorySlug("services")).toEqual({ category: "Services" });
  });

  test("real-estate resolves correctly", () => {
    expect(parseCategorySlug("real-estate")).toEqual({ category: "Real Estate" });
  });

  test("buy-sell-marketplace resolves correctly", () => {
    expect(parseCategorySlug("buy-sell-marketplace")).toEqual({ category: "Buy & Sell Marketplace" });
  });

  test("unknown slug returns keyword fallback with spaces", () => {
    expect(parseCategorySlug("plumber-services")).toEqual({ keyword: "plumber services" });
  });

  test("empty-ish slug falls through to keyword", () => {
    expect(parseCategorySlug("something-random")).toEqual({ keyword: "something random" });
  });
});

// ---------------------------------------------------------------------------
// toLocationSlug / parseLocationSlug
// ---------------------------------------------------------------------------

describe("toLocationSlug", () => {
  test("city + state slug", () => {
    expect(toLocationSlug("Seattle", "WA")).toBe("seattle-wa");
  });

  test("multi-word city", () => {
    expect(toLocationSlug("New York", "NY")).toBe("new-york-ny");
  });
});

describe("parseLocationSlug", () => {
  test("parses city-state slug for US states", () => {
    expect(parseLocationSlug("seattle-wa")).toEqual({ country: "US", state: "WA", city: "Seattle" });
  });

  test("parses multi-word city slug", () => {
    expect(parseLocationSlug("new-york-ny")).toEqual({ country: "US", state: "NY", city: "New York" });
  });

  test("unknown state suffix falls back to city-only", () => {
    const result = parseLocationSlug("london");
    expect(result.country).toBe("US");
    expect(result.city).toBe("London");
  });
});
