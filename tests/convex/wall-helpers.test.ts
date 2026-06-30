import { describe, expect, test } from "vitest";
import { activeFilterCount, featuredTierWeight, getVisibleFeaturedTierOptions } from "../../src/features/wall/wall-helpers";
import { wallCardStyle } from "../../src/features/home/trending-wall-style";

describe("wall helpers", () => {
  test("boost ranks above the legacy featured tiers", () => {
    expect(featuredTierWeight("boost")).toBeGreaterThan(featuredTierWeight("gold"));
    expect(featuredTierWeight("gold")).toBeGreaterThan(featuredTierWeight("silver"));
    expect(featuredTierWeight("silver")).toBeGreaterThan(featuredTierWeight("bronze"));
  });

  test("hides legacy featured tier options when legacy UI is off", () => {
    const options = getVisibleFeaturedTierOptions(
      [
        { value: "none", price: "", label: "No boost", perks: [] },
        { value: "boost", price: "+$2.99", label: "Boost", perks: [] },
        { value: "bronze", price: "+$2.99", label: "Bronze", perks: [] },
        { value: "silver", price: "+$4.99", label: "Silver", perks: [] },
        { value: "gold", price: "+$9.99", label: "Gold", perks: [] },
      ],
      false,
    );

    expect(options.map((option) => option.value)).toEqual(["none", "boost"]);
  });

  test("counts the active wall filters", () => {
    expect(
      activeFilterCount({
        categoryIsAll: false,
        subcategory: "Plumbing",
        selectedNeighborhood: "Downtown",
        fresh: true,
        sortByDefault: false,
        hasWebsite: true,
        hasPhone: true,
        hasEmail: true,
        hasPhotos: true,
        featuredOnly: true,
      }),
    ).toBe(10);
  });

  test("gives each trending wall card its own stable color", () => {
    const first = wallCardStyle("/us/wa/seattle");
    const second = wallCardStyle("/us/wa/tacoma");

    expect(first["--twc-bg"]).not.toBe(second["--twc-bg"]);
    expect(first["--twc-border"]).not.toBe(second["--twc-border"]);
    expect(wallCardStyle("/us/wa/seattle")).toEqual(first);
  });
});
