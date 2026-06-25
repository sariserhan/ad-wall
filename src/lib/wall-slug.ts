const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

// ─── Path slug builders ───────────────────────────────────────────────────────

export function toCountrySlug(isoCode: string): string {
  return isoCode.toLowerCase();
}

export function toStateSlug(isoCode: string): string {
  return isoCode.toLowerCase();
}

export function toCitySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildWallPath(
  country: string,
  state?: string,
  city?: string,
  category?: string,
): string {
  const parts = [toCountrySlug(country)];
  if (state) parts.push(toStateSlug(state));
  if (city) parts.push(toCitySlug(city));
  if (category && category !== "All") parts.push(toCategorySlug(category));
  return `/${parts.join("/")}`;
}

const CATEGORY_SLUGS: Record<string, string> = {
  "services": "Services",
  "repairs": "Repairs",
  "home-garden": "Home & Garden",
  "food-catering": "Food & Catering",
  "pets": "Pets",
  "classes-education": "Classes & Education",
  "shops-retail": "Shops & Retail",
  "automotive": "Automotive",
  "health-fitness": "Health & Fitness",
  "beauty-personal-care": "Beauty & Personal Care",
  "professional-services": "Professional Services",
  "technology": "Technology",
  "events-entertainment": "Events & Entertainment",
  "real-estate": "Real Estate",
  "child-family": "Child & Family",
  "community": "Community",
  "jobs": "Jobs",
  "dating": "Dating",
  "buy-sell-marketplace": "Buy & Sell Marketplace",
  "vehicles": "Vehicles",
};

export function toLocationSlug(city: string, state: string): string {
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const stateSlug = state.toLowerCase();
  return `${citySlug}-${stateSlug}`;
}

export function parseLocationSlug(slug: string): { country: string; state: string; city: string } {
  const parts = slug.split("-");
  const last = parts[parts.length - 1].toUpperCase();
  if (parts.length >= 2 && US_STATE_CODES.has(last)) {
    const state = last;
    const city = parts
      .slice(0, -1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    return { country: "US", state, city };
  }
  const city = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  return { country: "US", state: "", city };
}

export function formatWallPath(path: string): string {
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length === 0) return "Global";
  const cap = (s: string) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const [country, state, city] = parts;
  if (city && state) return `${cap(city)}, ${state.toUpperCase()}`;
  if (state) return `${state.toUpperCase()}, ${country.toUpperCase()}`;
  return country.toUpperCase();
}

export function parseWallPath(path: string): { city: string; state: string; country: string } {
  const cap = (s: string) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  const [country = "", state = "", city = ""] = parts;
  return { city: cap(city), state: state.toUpperCase(), country: country.toUpperCase() };
}

export function toCategorySlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function parseCategorySlug(slug: string): { category?: string; keyword?: string } {
  const lower = slug.toLowerCase();
  if (CATEGORY_SLUGS[lower]) return { category: CATEGORY_SLUGS[lower] };
  return { keyword: slug.replace(/-/g, " ") };
}

export function parseSmartQuery(
  query: string,
  getCityNames?: (stateCode: string) => string[],
): { keyword: string; city?: string; state?: string } {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return { keyword: query.trim() };

  const last = tokens[tokens.length - 1];
  if (!US_STATE_CODES.has(last.toUpperCase())) return { keyword: query.trim() };

  const state = last.toUpperCase();
  const rest = tokens.slice(0, -1);

  if (getCityNames) {
    const cityNames = getCityNames(state);
    for (let len = Math.min(4, rest.length); len >= 1; len--) {
      const cityTokens = rest.slice(-len);
      const candidate = cityTokens.join(" ");
      if (cityNames.some((c) => c.toLowerCase() === candidate)) {
        const city = cityTokens.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const keyword = rest.slice(0, -len).join(" ");
        return { keyword, city, state };
      }
    }
  }

  // Heuristic: first word(s) = keyword, rest = city
  const city = rest
    .slice(1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { keyword: rest[0], city: city || undefined, state };
}
