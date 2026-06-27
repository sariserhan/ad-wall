import { City, Country, State } from "country-state-city";
import { SUBCATEGORY_OPTIONS, type CardCategory } from "./types";

const PLAN_OPTIONS = [
  0,
  2.99,
  7.99,
  19.99,
  24.99,
] as const;

export const CSV_REQUIRED_HEADERS = ["name", "category", "line", "city", "state", "country", "theme", "paidAmount", "featuredTier", "status", "durationDays", "likes", "clicks", "reviewCount"] as const;

export const CSV_OPTIONAL_HEADERS = [
  "ownerName",
  "message",
  "area",
  "zipcode",
  "neighborhood",
  "price",
  "phone",
  "email",
  "website",
  "location",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "whatsapp",
  "telegram",
  "subcategory",
  "imageMode",
  "imageX",
  "imageY",
  "imageWidth",
  "expiresAt",
  "websiteClicks",
  "phoneClicks",
  "emailClicks",
  "socialClicks",
  "saves",
  "shares",
  "x",
  "y",
  "rotation",
  "width",
  "rating",
  "googleMapsUrl",
  "image",
] as const;

export const CSV_ALLOWED_HEADERS = new Set([
  ...CSV_REQUIRED_HEADERS,
  ...CSV_OPTIONAL_HEADERS,
]);

export type LocationCatalog = {
  countries: Array<{ code: string; name: string }>;
  statesByCountry: Map<string, Array<{ code: string; name: string }>>;
  citiesByCountryState: Map<string, string[]>;
};

export type ResolvedLocation = {
  country: string;
  state: string;
  city: string;
  errors: string[];
};

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  turkey: "TR",
  türkiye: "TR",
  "türkiye republic": "TR",
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractSelectionCode(value: string) {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(" - ");
  return separatorIndex > 0 ? trimmed.slice(0, separatorIndex).trim() : trimmed;
}

export function formatLocationLabel(code: string, name: string) {
  if (code === "TR") return "TR - Türkiye";
  return `${code} - ${name}`;
}

export function getSubcategoriesForCategory(category: string) {
  return category !== "All" ? (SUBCATEGORY_OPTIONS[category as CardCategory] ?? []) : [];
}

export async function loadLocationCatalog() {
  const countries = Country.getAllCountries()
    .filter((country) => country.isoCode === "US" || country.isoCode === "TR")
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const statesByCountry = new Map<string, Array<{ code: string; name: string }>>();
  const citiesByCountryState = new Map<string, string[]>();

  for (const country of countries) {
    const states = State.getStatesOfCountry(country.code)
      .map((state) => ({ code: state.isoCode, name: state.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    statesByCountry.set(country.code, states);

    for (const state of states) {
      const cities = City.getCitiesOfState(country.code, state.code).map((city) => city.name).sort((a, b) => a.localeCompare(b));
      citiesByCountryState.set(`${country.code}|${state.code}`, cities);
    }
  }

  return { countries, statesByCountry, citiesByCountryState };
}

export function resolveLocationFields(data: Record<string, string>, locationCatalog?: LocationCatalog): ResolvedLocation {
  const countryRaw = csvString(data, "country");
  const stateRaw = csvString(data, "state");
  const cityRaw = csvString(data, "city");
  const errors: string[] = [];

  if (!locationCatalog) {
    return { country: countryRaw, state: stateRaw, city: cityRaw, errors };
  }

  const countryCodeCandidate = extractSelectionCode(countryRaw);
  const countryCode = countryRaw
    ? (locationCatalog.countries.find((entry) => {
        const normalized = normalizeText(countryRaw);
        const label = formatLocationLabel(entry.code, entry.name);
        return normalized === normalizeText(entry.code)
          || normalized === normalizeText(entry.name)
          || normalized === normalizeText(label)
          || normalizeText(countryCodeCandidate) === normalizeText(entry.code)
          || COUNTRY_ALIASES[normalized] === entry.code;
      })?.code ?? "")
    : "";

  const stateCodeCandidate = extractSelectionCode(stateRaw);
  const stateCode = countryCode && stateRaw
    ? (((locationCatalog.statesByCountry.get(countryCode) ?? []).find((entry) => {
        const normalized = normalizeText(stateRaw);
        const label = formatLocationLabel(entry.code, entry.name);
        return normalized === normalizeText(entry.code)
          || normalized === normalizeText(entry.name)
          || normalized === normalizeText(label)
          || normalizeText(stateCodeCandidate) === normalizeText(entry.code);
      })?.code ?? ""))
    : "";

  const city = cityRaw;

  if (countryRaw && !countryCode) {
    errors.push(`invalid country: ${countryRaw}`);
  }
  if (countryCode && stateRaw && !stateCode) {
    errors.push(`invalid state for ${countryRaw}: ${stateRaw}`);
  }
  if (countryCode && stateCode && city) {
    const cities = locationCatalog.citiesByCountryState.get(`${countryCode}|${stateCode}`) ?? [];
    if (!cities.some((entry) => normalizeText(entry) === normalizeText(city))) {
      errors.push(`invalid city for ${countryRaw}/${stateRaw}: ${city}`);
    }
  }

  return { country: countryCode || countryRaw, state: stateCode || stateRaw, city, errors };
}

export function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i++;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === "\"") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }

  row.push(cell);
  rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()).filter(Boolean) ?? [];
  const records = rows
    .filter((current) => current.some((value) => value.trim() !== ""))
    .map((current, index) => {
      const data = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
        acc[header] = current[headerIndex]?.trim() ?? "";
        return acc;
      }, {});
      return { rowNumber: index + 2, data, errors: [] as string[] };
    });

  return { headers, records };
}

export function csvString(data: Record<string, string>, key: string) {
  return data[key]?.trim() || "";
}

export function csvMaybeNumber(data: Record<string, string>, key: string) {
  const raw = data[key]?.trim();
  if (!raw) return { raw: "", value: undefined, provided: false, valid: true };
  const value = Number(raw);
  return { raw, value: Number.isFinite(value) ? value : undefined, provided: true, valid: Number.isFinite(value) };
}

export function csvMaybeInteger(data: Record<string, string>, key: string) {
  const field = csvMaybeNumber(data, key);
  return {
    ...field,
    valid: field.valid && (field.value === undefined || Number.isInteger(field.value)),
  };
}

export function csvPick(data: Record<string, string>, key: string, values: readonly string[]) {
  const raw = data[key]?.trim();
  return raw && values.includes(raw) ? raw : undefined;
}

export function getCsvImageMode(imageUrl?: string, imageMode?: "photo" | "business-card") {
  return imageMode || (imageUrl ? "photo" : undefined);
}

function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(values: string[]) {
  return values.map((value) => csvEscape(value)).join(",");
}

export function buildPlaygroundCsvTemplate() {
  const headers = [...CSV_REQUIRED_HEADERS, ...CSV_OPTIONAL_HEADERS];
  const sampleRows: Array<Record<string, string>> = [
    {
      name: "Call Cleaning Collection",
      category: "Services",
      line: "Call Cleaning Collection is a local cleaning business serving the area.",
      city: "Arlington",
      state: "VA",
      country: "USA",
      theme: "paper",
      paidAmount: "19.99",
      featuredTier: "bronze",
      status: "published",
      durationDays: "90",
      likes: "134",
      clicks: "524",
      reviewCount: "208",
      ownerName: "Call Cleaning Collection",
      zipcode: "22202",
      phone: "(703) 810-3604",
      website: "https://callcleaningcollection.com/",
      location: "3400 Potomac Ave, Arlington, VA 22202, USA",
      subcategory: "Cleaning",
    },
    {
      name: "Metro Cleaners",
      category: "Services",
      line: "Pickup and delivery laundry service",
      city: "Austin",
      state: "TX",
      country: "USA",
      theme: "cream",
      paidAmount: "7.99",
      featuredTier: "silver",
      status: "published",
      durationDays: "90",
      likes: "12",
      clicks: "75",
      reviewCount: "4",
      ownerName: "Metro Cleaners LLC",
      zipcode: "78701",
      phone: "+1 512 555 0144",
      email: "care@metrocleaners.com",
      website: "https://metrocleaners.com",
      location: "88 Congress Ave",
      instagram: "https://instagram.com/metrocleaners",
      facebook: "https://facebook.com/metrocleaners",
      tiktok: "https://tiktok.com/@metrocleaners",
      linkedin: "https://linkedin.com/company/metrocleaners",
      whatsapp: "+1 512 555 0144",
      telegram: "https://t.me/metrocleaners",
      subcategory: "Cleaning",
    },
  ];

  return [csvRow(headers), ...sampleRows.map((row) => csvRow(headers.map((header) => row[header] ?? "")))].join("\n");
}

export function getSupportedPlanAmounts() {
  return [...PLAN_OPTIONS];
}
