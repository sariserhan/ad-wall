import { describe, expect, test } from "vitest";
import {
  buildPlaygroundCsvTemplate,
  parseCsv,
  resolveLocationFields,
  getCsvImageMode,
  type LocationCatalog,
} from "../../src/features/wall/admin-playground-csv";

const catalog: LocationCatalog = {
  countries: [
    { code: "US", name: "United States" },
    { code: "TR", name: "Turkey" },
  ],
  statesByCountry: new Map([
    ["US", [
      { code: "VA", name: "Virginia" },
      { code: "TX", name: "Texas" },
    ]],
    ["TR", [
      { code: "34", name: "Istanbul" },
    ]],
  ]),
  citiesByCountryState: new Map([
    ["US|VA", ["Arlington"]],
    ["US|TX", ["Austin", "Dallas"]],
    ["TR|34", ["Istanbul"]],
  ]),
};

describe("admin playground csv template", () => {
  test("builds a readable csv template", () => {
    const csv = buildPlaygroundCsvTemplate();
    const { headers, records } = parseCsv(csv);

    expect(headers).toContain("name");
    expect(headers).toContain("country");
    expect(headers).toContain("rating");
    expect(headers).toContain("googleMapsUrl");
    expect(headers).toContain("image");
    expect(records).toHaveLength(2);
    expect(records[0].data.name).toBe("Call Cleaning Collection");
  });

  test("keeps image links intact", () => {
    const { records } = parseCsv([
      "name,category,line,city,state,country,theme,paidAmount,featuredTier,status,durationDays,likes,clicks,reviewCount,image",
      'Photo Spot,Services,Photo friendly listing,Arlington,VA,USA,paper,0,bronze,published,90,1,2,3,https://example.com/photo.jpg?x=1&y=2',
    ].join("\n"));

    expect(records).toHaveLength(1);
    expect(records[0].data.image).toBe("https://example.com/photo.jpg?x=1&y=2");
  });

  test("defaults image rows to photo layout when no image mode is set", () => {
    expect(getCsvImageMode("https://example.com/photo.jpg")).toBe("photo");
    expect(getCsvImageMode("https://example.com/photo.jpg", "business-card")).toBe("business-card");
  });

  test("normalizes USA and state codes", () => {
    const resolved = resolveLocationFields(
      { country: "USA", state: "VA", city: "Arlington" },
      catalog,
    );

    expect(resolved.errors).toHaveLength(0);
    expect(resolved.country).toBe("US");
    expect(resolved.state).toBe("VA");
    expect(resolved.city).toBe("Arlington");
  });
});
