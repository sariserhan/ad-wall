"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, ChevronUp, Clock, CreditCard, ExternalLink, FileText, FlaskConical, Layers, Mail, RefreshCw, Shield, ShieldOff, Star, Trash2, Upload, X, Zap } from "lucide-react";
import { useState } from "react";
import { City, Country, State } from "country-state-city";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { categories, cardThemes, SUBCATEGORY_OPTIONS, type CardCategory } from "./types";
import { buildPlaygroundTemplateWorkbook } from "./admin-playground-xlsx";

const PG_WALL_URL = "/admin/wall";
const PG_DEFAULTS = { country: "xx", state: "test", city: "Playground" };

const PLAN_OPTIONS = [
  { label: "Free (1 day)", value: 0, tag: "free" },
  { label: "$2.99 — 30 days", value: 2.99 },
  { label: "$7.99 — 90 days", value: 7.99 },
  { label: "$19.99 — 90 days (premium)", value: 19.99 },
  { label: "$24.99 — 365 days", value: 24.99, tag: "best" },
] as const;

const DURATION_OPTIONS = [1, 7, 30, 90, 180, 365] as const;

const FEATURED_TIERS = [
  { label: "None", value: undefined },
  { label: "Bronze", value: "bronze" as const },
  { label: "Silver", value: "silver" as const },
  { label: "Gold", value: "gold" as const },
];

const EXPIRY_PRESETS = [
  { label: "2 min", ms: 2 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "Expired now", ms: -1 },
] as const;

function useAsync<T>(fn: (...args: never[]) => Promise<T>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const run = async (...args: Parameters<typeof fn>) => {
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await fn(...(args as never[]));
      setOk(true);
      setTimeout(() => setOk(false), 2400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, ok, run, clearError: () => setError(null) };
}

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pg-section">
      <button className="pg-section-header" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="pg-section-icon">{icon}</span>
        <span className="pg-section-title">{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open ? <div className="pg-section-body">{children}</div> : null}
    </div>
  );
}

function PgError({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="pg-error" role="alert">
      <span>{msg}</span>
      <button onClick={onDismiss} aria-label="Dismiss"><X size={12} /></button>
    </div>
  );
}

function PgOk({ msg }: { msg: string }) {
  return <div className="pg-ok" role="status"><Check size={12} />{msg}</div>;
}

type PlaygroundCardArgs = {
  name: string;
  category: string;
  subcategory?: string;
  line: string;
  message?: string;
  area?: string;
  city: string;
  state: string;
  country: string;
  zipcode?: string;
  neighborhood?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  whatsapp?: string;
  telegram?: string;
  ownerName?: string;
  theme: string;
  imageMode?: "photo" | "business-card";
  imageX?: number;
  imageY?: number;
  imageWidth?: number;
  paidAmount: number;
  featuredTier?: "bronze" | "silver" | "gold";
  status?: "published" | "hidden" | "expired";
  durationDays?: number;
  expiresAt?: number;
  clicks?: number;
  likes?: number;
  reviewCount?: number;
  websiteClicks?: number;
  phoneClicks?: number;
  emailClicks?: number;
  socialClicks?: number;
  saves?: number;
  shares?: number;
  x?: number;
  y?: number;
  rotation?: number;
  width?: number;
  pending?: boolean;
};

type ParsedCsvRow = {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
};

const CSV_REQUIRED_HEADERS = ["name", "category", "line", "city", "state", "country", "theme", "paidAmount", "featuredTier", "status", "durationDays", "likes", "clicks", "reviewCount"] as const;
const CSV_ALLOWED_HEADERS = new Set([
  ...CSV_REQUIRED_HEADERS,
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
]);

function parseCsv(text: string) {
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
    .map<ParsedCsvRow>((current, index) => {
      const data = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
        acc[header] = current[headerIndex]?.trim() ?? "";
        return acc;
      }, {});
      return { rowNumber: index + 2, data, errors: [] };
    });

  return { headers, records };
}

function csvString(data: Record<string, string>, key: string) {
  return data[key]?.trim() || "";
}

function csvMaybeNumber(data: Record<string, string>, key: string) {
  const raw = data[key]?.trim();
  if (!raw) return { raw: "", value: undefined, provided: false, valid: true };
  const value = Number(raw);
  return { raw, value: Number.isFinite(value) ? value : undefined, provided: true, valid: Number.isFinite(value) };
}

function csvMaybeInteger(data: Record<string, string>, key: string) {
  const field = csvMaybeNumber(data, key);
  return {
    ...field,
    valid: field.valid && (field.value === undefined || Number.isInteger(field.value)),
  };
}

function csvPick(data: Record<string, string>, key: string, values: readonly string[]) {
  const raw = data[key]?.trim();
  return raw && values.includes(raw) ? raw : undefined;
}

function sanitizeExcelName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "default";
}

type LocationCatalog = {
  countries: Array<{ code: string; name: string }>;
  statesByCountry: Map<string, Array<{ code: string; name: string }>>;
  citiesByCountryState: Map<string, string[]>;
};

let locationCatalogPromise: Promise<LocationCatalog> | null = null;

function toExcelColumnLetter(index: number) {
  let n = index;
  let letter = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function formatLocationLabel(code: string, name: string) {
  if (code === "TR") return "TR - Türkiye";
  return `${code} - ${name}`;
}

function normalizeLocationText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractSelectionCode(value: string) {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(" - ");
  return separatorIndex > 0 ? trimmed.slice(0, separatorIndex).trim() : trimmed;
}

async function loadLocationCatalog() {
  if (locationCatalogPromise) return locationCatalogPromise;

  locationCatalogPromise = import("country-state-city").then(({ Country, State, City }) => {
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
  });

  return locationCatalogPromise;
}

function getSubcategoriesForCategory(category: string) {
  return category !== "All" ? (SUBCATEGORY_OPTIONS[category as CardCategory] ?? []) : [];
}

function fileNameFromUpload(file: File, fallback: string) {
  return file.name.replace(/\.[^.]+$/, "") || fallback;
}

function xlsxValueToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const cell = value as { text?: string; richText?: Array<{ text?: string }>; result?: unknown; formula?: unknown };
    if (typeof cell.text === "string") return cell.text;
    if (Array.isArray(cell.richText)) return cell.richText.map((part) => part.text ?? "").join("");
    if ("result" in cell) return xlsxValueToString(cell.result);
  }
  return String(value);
}

function xlsxCellValueToPayloadString(value: unknown) {
  const text = xlsxValueToString(value);
  return text.trim();
}

function resolveLocationErrors(data: Record<string, string>, locationCatalog?: LocationCatalog) {
  const errors: string[] = [];
  if (!locationCatalog) return errors;

  const country = csvString(data, "country");
  const state = csvString(data, "state");
  const city = csvString(data, "city");
  const countryCodeCandidate = country ? extractSelectionCode(country) : "";
  const countryCode = country
    ? locationCatalog.countries.find((entry) => {
        const normalized = normalizeLocationText(country);
        const label = formatLocationLabel(entry.code, entry.name);
        return normalized === normalizeLocationText(entry.code)
          || normalized === normalizeLocationText(entry.name)
          || normalized === normalizeLocationText(label)
          || normalizeLocationText(countryCodeCandidate) === normalizeLocationText(entry.code);
      })?.code
    : "";
  const stateCodeCandidate = state ? extractSelectionCode(state) : "";
  const stateCode = countryCode && state
    ? (locationCatalog.statesByCountry.get(countryCode) ?? []).find((entry) => {
        const normalized = normalizeLocationText(state);
        const label = formatLocationLabel(entry.code, entry.name);
        return normalized === normalizeLocationText(entry.code)
          || normalized === normalizeLocationText(entry.name)
          || normalized === normalizeLocationText(label)
          || normalizeLocationText(stateCodeCandidate) === normalizeLocationText(entry.code);
      })?.code
    : "";

  if (country && !countryCode) {
    errors.push(`invalid country: ${country}`);
  }
  if (countryCode && state && !stateCode) {
    errors.push(`invalid state for ${country}: ${state}`);
  }
  if (countryCode && stateCode && city) {
    const cities = locationCatalog.citiesByCountryState.get(`${countryCode}|${stateCode}`) ?? [];
    if (!cities.includes(city)) errors.push(`invalid city for ${country}/${state}: ${city}`);
  }

  return errors;
}

// ─── Create Card Section ──────────────────────────────────────────────────────

function CreateCardSection() {
  const createCard = useMutation(api.admin.playgroundCreateCard) as unknown as (args: PlaygroundCardArgs) => Promise<{ cardId: Id<"cards"> }>;

  const [name, setName] = useState("Test Business Co.");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState<CardCategory>("Services");
  const [subcategory, setSubcategory] = useState("");
  const [line, setLine] = useState("This is a test card posted from admin playground");
  const [theme, setTheme] = useState("yellow");
  const [paidAmount, setPaidAmount] = useState(0);
  const [featuredTier, setFeaturedTier] = useState<"bronze" | "silver" | "gold" | undefined>(undefined);
  const [paymentMode, setPaymentMode] = useState<"bypass" | "stripe">("bypass");
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("TX");
  const [city, setCity] = useState("Dallas");
  const [area, setArea] = useState("Downtown");
  const [status, setStatus] = useState<"published" | "hidden" | "expired">("published");
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [likes, setLikes] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  const buildArgs = (pending = false): PlaygroundCardArgs => ({
    name,
    category,
    subcategory: subcategory || undefined,
    line,
    area: area.trim() || city.trim(),
    city,
    state,
    country,
    theme,
    paidAmount,
    featuredTier,
    ownerName: ownerName.trim() || undefined,
    pending,
    status: pending ? "hidden" : status,
    durationDays: durationDays === "" ? undefined : durationDays,
    likes,
    clicks,
    reviewCount,
  });

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      if (paymentMode === "bypass") {
        const result = await createCard(buildArgs(false));
        setLastId(String(result.cardId));
        setTimeout(() => setLastId(null), 5000);
      } else {
        // Create a pending (hidden) card then redirect to Stripe checkout
        const result = await createCard(buildArgs(true));
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingCardId: String(result.cardId), paidAmount, cardName: name }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Stripe checkout could not be started.");
        window.location.href = data.url;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const stripeOnly = paymentMode === "stripe" && paidAmount === 0;
  const availableStates = State.getStatesOfCountry(country);
  const availableCities = state ? City.getCitiesOfState(country, state) : [];
  const availableSubcategories = getSubcategoriesForCategory(category);

  return (
    <div className="pg-fields">
      <div className="pg-mode-toggle">
        <button
          className={`pg-mode-btn${paymentMode === "bypass" ? " selected" : ""}`}
          onClick={() => setPaymentMode("bypass")}
          type="button"
        >
          <Zap size={12} /> Bypass payment
        </button>
        <button
          className={`pg-mode-btn${paymentMode === "stripe" ? " selected" : ""}`}
          onClick={() => setPaymentMode("stripe")}
          type="button"
        >
          <CreditCard size={12} /> Test Stripe checkout
        </button>
      </div>

      <details className="pg-disclosure">
        <summary>Business details</summary>
        <div className="pg-disclosure-body">
          <div className="pg-row-2">
            <label className="pg-field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" />
            </label>
            <label className="pg-field">
              <span>Owner label</span>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Public display name" />
            </label>
            <label className="pg-field">
              <span>Category</span>
              <select value={category} onChange={(e) => { const next = e.target.value as CardCategory; setCategory(next); setSubcategory(""); }}>
                {categories.filter((c): c is CardCategory => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="pg-row-2">
            <label className="pg-field">
              <span>Subcategory</span>
              <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">None</option>
                {availableSubcategories.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </label>
            <label className="pg-field">
              <span>Tagline</span>
              <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Short description" />
            </label>
          </div>
        </div>
      </details>

      <details className="pg-disclosure">
        <summary>Location</summary>
        <div className="pg-disclosure-body">
          <div className="pg-row-3">
            <label className="pg-field">
              <span>Country</span>
              <select value={country} onChange={(e) => {
                const nextCountry = e.target.value;
                const nextStates = State.getStatesOfCountry(nextCountry);
                const nextState = nextStates[0]?.isoCode ?? "";
                const nextCities = nextState ? City.getCitiesOfState(nextCountry, nextState) : [];
                setCountry(nextCountry);
                setState(nextState);
                setCity(nextCities[0]?.name ?? "");
              }}>
                {["US", "TR"].map((code) => <option key={code} value={code}>{formatLocationLabel(code, code === "TR" ? "Türkiye" : Country.getCountryByCode(code)?.name ?? code)}</option>)}
              </select>
            </label>
            <label className="pg-field">
              <span>State</span>
              <select value={state} onChange={(e) => {
                const nextState = e.target.value;
                const nextCities = nextState ? City.getCitiesOfState(country, nextState) : [];
                setState(nextState);
                setCity(nextCities[0]?.name ?? "");
              }}>
                {availableStates.map((s) => <option key={s.isoCode} value={s.isoCode}>{formatLocationLabel(s.isoCode, s.name)}</option>)}
              </select>
            </label>
            <label className="pg-field">
              <span>City</span>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {availableCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <label className="pg-field">
            <span>Area / neighborhood</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Downtown" />
          </label>
        </div>
      </details>

      <details className="pg-disclosure">
        <summary>Promotion</summary>
        <div className="pg-disclosure-body">
          <div className="pg-row-2">
            <label className="pg-field">
              <span>Theme</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                {cardThemes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="pg-field">
              <span>Featured tier</span>
              <select value={featuredTier ?? ""} onChange={(e) => setFeaturedTier((e.target.value || undefined) as "bronze" | "silver" | "gold" | undefined)}>
                {FEATURED_TIERS.map((t) => <option key={t.label} value={t.value ?? ""}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="pg-row-3">
            <label className="pg-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as "published" | "hidden" | "expired")}>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="pg-field">
              <span>Duration days</span>
              <input
                type="number"
                min={0}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Default from plan"
              />
            </label>
            <label className="pg-field">
              <span>Initial likes</span>
              <input type="number" min={0} value={likes} onChange={(e) => setLikes(Math.max(0, Number(e.target.value) || 0))} />
            </label>
          </div>
          <div className="pg-row-3">
            <label className="pg-field">
              <span>Initial clicks</span>
              <input type="number" min={0} value={clicks} onChange={(e) => setClicks(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label className="pg-field">
              <span>Reviews</span>
              <input type="number" min={0} value={reviewCount} onChange={(e) => setReviewCount(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <div className="pg-field">
              <span>Note</span>
              <p className="pg-hint">This is the admin override path. Use the XLSX import below when you want to create many locations at once.</p>
            </div>
          </div>
        </div>
      </details>

      <details className="pg-disclosure">
        <summary>Pricing</summary>
        <div className="pg-disclosure-body">
          <div className="pg-plan-row">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p.value}
                className={`pg-plan-btn${paidAmount === p.value ? " selected" : ""}${paymentMode === "stripe" && p.value === 0 ? " pg-plan-btn-disabled" : ""}`}
                onClick={() => setPaidAmount(p.value)}
                type="button"
                disabled={paymentMode === "stripe" && p.value === 0}
                title={paymentMode === "stripe" && p.value === 0 ? "Free plan has no Stripe checkout" : undefined}
              >
                {p.label}{"tag" in p && p.tag === "best" ? <span className="pg-plan-tag">best</span> : null}
                {"tag" in p && p.tag === "free" ? <span className="pg-plan-tag free">free</span> : null}
              </button>
            ))}
          </div>
        </div>
      </details>

      {stripeOnly ? <p className="pg-hint" style={{ color: "#b91c1c" }}>Select a paid plan to test Stripe checkout (free has no payment).</p> : null}
      {error ? <PgError msg={error} onDismiss={() => setError(null)} /> : null}
      {lastId ? <PgOk msg={`Card created: ${lastId.slice(-8)} — visible on playground wall`} /> : null}
      <div className="pg-create-row">
        <button className="pg-action-btn" disabled={busy || !name.trim() || stripeOnly} onClick={handleCreate}>
          {busy
            ? (paymentMode === "stripe" ? "Redirecting to Stripe…" : "Creating…")
            : paymentMode === "bypass"
              ? <><Zap size={13} /> Create card (bypass payment)</>
              : <><CreditCard size={13} /> Create card + go to Stripe</>
          }
        </button>
        <a className="pg-wall-link" href={PG_WALL_URL} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} /> Open playground wall
        </a>
      </div>
      <p className="pg-hint">
        {paymentMode === "bypass"
          ? <>Card appears immediately on <code>{PG_WALL_URL}</code>. No Stripe involved.</>
          : <>Creates a hidden pending card, then redirects to real Stripe checkout. Use card <code>4242 4242 4242 4242</code> to test.</>
        }
      </p>
    </div>
  );
}

function BulkCsvImportSection() {
  const createCard = useMutation(api.admin.playgroundCreateCard) as unknown as (args: PlaygroundCardArgs) => Promise<{ cardId: Id<"cards"> }>;
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedCsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const resolveRow = (data: Record<string, string>, locationCatalog?: LocationCatalog) => {
    const errors: string[] = [];
    const name = csvString(data, "name");
    const category = csvString(data, "category");
    const line = csvString(data, "line");
    const city = csvString(data, "city");
    const state = csvString(data, "state");
    const country = csvString(data, "country");
    const theme = csvString(data, "theme");
    const paidAmountField = csvMaybeNumber(data, "paidAmount");
    const imageXField = csvMaybeNumber(data, "imageX");
    const imageYField = csvMaybeNumber(data, "imageY");
    const imageWidthField = csvMaybeNumber(data, "imageWidth");
    const durationDaysField = csvMaybeInteger(data, "durationDays");
    const expiresAtField = csvMaybeNumber(data, "expiresAt");
    const clicksField = csvMaybeInteger(data, "clicks");
    const likesField = csvMaybeInteger(data, "likes");
    const reviewCountField = csvMaybeInteger(data, "reviewCount");
    const websiteClicksField = csvMaybeInteger(data, "websiteClicks");
    const phoneClicksField = csvMaybeInteger(data, "phoneClicks");
    const emailClicksField = csvMaybeInteger(data, "emailClicks");
    const socialClicksField = csvMaybeInteger(data, "socialClicks");
    const savesField = csvMaybeInteger(data, "saves");
    const sharesField = csvMaybeInteger(data, "shares");
    const xField = csvMaybeNumber(data, "x");
    const yField = csvMaybeNumber(data, "y");
    const rotationField = csvMaybeNumber(data, "rotation");
    const widthField = csvMaybeNumber(data, "width");
    const paidAmount = paidAmountField.value!;
    const featuredTierRaw = csvString(data, "featuredTier");
    const statusRaw = csvString(data, "status");
    const featuredTier = csvPick(data, "featuredTier", ["bronze", "silver", "gold"]) as PlaygroundCardArgs["featuredTier"];
    const status = csvPick(data, "status", ["published", "hidden", "expired"]) as PlaygroundCardArgs["status"];
    const durationDays = durationDaysField.value;
    const expiresAt = expiresAtField.value;
    const area = csvString(data, "area") || csvString(data, "neighborhood") || city;
    const categoryValue = category || "Services";
    const subcategoryRaw = csvString(data, "subcategory");
    const subcategoryOptions = getSubcategoriesForCategory(categoryValue);
    const subcategory = subcategoryRaw && subcategoryOptions.includes(subcategoryRaw) ? subcategoryRaw : undefined;
    const themeValue = theme || "yellow";
    const imageMode = csvPick(data, "imageMode", ["photo", "business-card"]) as "photo" | "business-card" | undefined;

    if (!name) errors.push("name is required");
    if (!line) errors.push("line is required");
    if (!city) errors.push("city is required");
    if (!state) errors.push("state is required");
    if (!country) errors.push("country is required");
    if (!themeValue) errors.push("theme is required");
    if (!paidAmountField.provided) errors.push("paidAmount is required");
    if (!durationDaysField.provided) errors.push("durationDays is required");
    if (!clicksField.provided) errors.push("clicks is required");
    if (!likesField.provided) errors.push("likes is required");
    if (!reviewCountField.provided) errors.push("reviewCount is required");
    if (!featuredTierRaw) errors.push("featuredTier is required");
    if (!statusRaw) errors.push("status is required");
    if (!categories.includes(categoryValue as (typeof categories)[number]) || categoryValue === "All") errors.push(`invalid category: ${categoryValue || "(empty)"}`);
    if (subcategoryRaw && !subcategory) errors.push(`invalid subcategory for ${categoryValue}: ${subcategoryRaw}`);
    if (!cardThemes.includes(themeValue as (typeof cardThemes)[number])) errors.push(`invalid theme: ${themeValue || "(empty)"}`);
    if (paidAmountField.provided && !paidAmountField.valid) errors.push(`paidAmount must be a number: ${paidAmountField.raw}`);
    if (imageXField.provided && !imageXField.valid) errors.push(`imageX must be a number: ${imageXField.raw}`);
    if (imageYField.provided && !imageYField.valid) errors.push(`imageY must be a number: ${imageYField.raw}`);
    if (imageWidthField.provided && !imageWidthField.valid) errors.push(`imageWidth must be a number: ${imageWidthField.raw}`);
    if (durationDaysField.provided && !durationDaysField.valid) errors.push(`durationDays must be a whole number: ${durationDaysField.raw}`);
    if (durationDaysField.provided && durationDaysField.value !== undefined && durationDaysField.value < 0) errors.push(`durationDays must be zero or greater: ${durationDaysField.raw}`);
    if (expiresAtField.provided && !expiresAtField.valid) errors.push(`expiresAt must be a number: ${expiresAtField.raw}`);
    if (paidAmount !== undefined && ![0, 2.99, 7.99, 19.99, 24.99].includes(paidAmount)) errors.push(`invalid paidAmount: ${paidAmount}`);
    if (durationDays !== undefined && Number.isNaN(durationDays)) errors.push("durationDays must be a number");
    if (expiresAt !== undefined && Number.isNaN(expiresAt)) errors.push("expiresAt must be a number");
    if (clicksField.provided && !clicksField.valid) errors.push(`clicks must be a whole number: ${clicksField.raw}`);
    if (clicksField.provided && clicksField.value !== undefined && clicksField.value < 0) errors.push(`clicks must be zero or greater: ${clicksField.raw}`);
    if (likesField.provided && !likesField.valid) errors.push(`likes must be a whole number: ${likesField.raw}`);
    if (likesField.provided && likesField.value !== undefined && likesField.value < 0) errors.push(`likes must be zero or greater: ${likesField.raw}`);
    if (reviewCountField.provided && !reviewCountField.valid) errors.push(`reviewCount must be a whole number: ${reviewCountField.raw}`);
    if (reviewCountField.provided && reviewCountField.value !== undefined && reviewCountField.value < 0) errors.push(`reviewCount must be zero or greater: ${reviewCountField.raw}`);
    if (websiteClicksField.provided && !websiteClicksField.valid) errors.push(`websiteClicks must be a whole number: ${websiteClicksField.raw}`);
    if (websiteClicksField.provided && websiteClicksField.value !== undefined && websiteClicksField.value < 0) errors.push(`websiteClicks must be zero or greater: ${websiteClicksField.raw}`);
    if (phoneClicksField.provided && !phoneClicksField.valid) errors.push(`phoneClicks must be a whole number: ${phoneClicksField.raw}`);
    if (phoneClicksField.provided && phoneClicksField.value !== undefined && phoneClicksField.value < 0) errors.push(`phoneClicks must be zero or greater: ${phoneClicksField.raw}`);
    if (emailClicksField.provided && !emailClicksField.valid) errors.push(`emailClicks must be a whole number: ${emailClicksField.raw}`);
    if (emailClicksField.provided && emailClicksField.value !== undefined && emailClicksField.value < 0) errors.push(`emailClicks must be zero or greater: ${emailClicksField.raw}`);
    if (socialClicksField.provided && !socialClicksField.valid) errors.push(`socialClicks must be a whole number: ${socialClicksField.raw}`);
    if (socialClicksField.provided && socialClicksField.value !== undefined && socialClicksField.value < 0) errors.push(`socialClicks must be zero or greater: ${socialClicksField.raw}`);
    if (savesField.provided && !savesField.valid) errors.push(`saves must be a whole number: ${savesField.raw}`);
    if (savesField.provided && savesField.value !== undefined && savesField.value < 0) errors.push(`saves must be zero or greater: ${savesField.raw}`);
    if (sharesField.provided && !sharesField.valid) errors.push(`shares must be a whole number: ${sharesField.raw}`);
    if (sharesField.provided && sharesField.value !== undefined && sharesField.value < 0) errors.push(`shares must be zero or greater: ${sharesField.raw}`);
    if (xField.provided && !xField.valid) errors.push(`x must be a number: ${xField.raw}`);
    if (yField.provided && !yField.valid) errors.push(`y must be a number: ${yField.raw}`);
    if (rotationField.provided && !rotationField.valid) errors.push(`rotation must be a number: ${rotationField.raw}`);
    if (widthField.provided && !widthField.valid) errors.push(`width must be a number: ${widthField.raw}`);
    if (featuredTierRaw && !featuredTier) errors.push(`invalid featuredTier: ${featuredTierRaw}`);
    if (statusRaw && !status) errors.push(`invalid status: ${statusRaw}`);
    errors.push(...resolveLocationErrors(data, locationCatalog));
    if (errors.length > 0) {
      return { errors };
    }

    const payload: PlaygroundCardArgs = {
      name,
      category: categoryValue as PlaygroundCardArgs["category"],
      subcategory,
      line,
      message: csvString(data, "message") || undefined,
      area: area || city,
      city,
      state,
      country,
      zipcode: csvString(data, "zipcode") || undefined,
      neighborhood: csvString(data, "neighborhood") || undefined,
      price: csvString(data, "price") || undefined,
      phone: csvString(data, "phone") || undefined,
      email: csvString(data, "email") || undefined,
      website: csvString(data, "website") || undefined,
      location: csvString(data, "location") || undefined,
      instagram: csvString(data, "instagram") || undefined,
      facebook: csvString(data, "facebook") || undefined,
      tiktok: csvString(data, "tiktok") || undefined,
      linkedin: csvString(data, "linkedin") || undefined,
      whatsapp: csvString(data, "whatsapp") || undefined,
      telegram: csvString(data, "telegram") || undefined,
      ownerName: csvString(data, "ownerName") || undefined,
      theme: themeValue,
      imageMode,
      imageX: imageXField.value,
      imageY: imageYField.value,
      imageWidth: imageWidthField.value,
      paidAmount,
      featuredTier,
      status,
      durationDays,
      expiresAt,
      clicks: clicksField.value,
      likes: likesField.value,
      reviewCount: reviewCountField.value,
      websiteClicks: websiteClicksField.value,
      phoneClicks: phoneClicksField.value,
      emailClicks: emailClicksField.value,
      socialClicks: socialClicksField.value,
      saves: savesField.value,
      shares: sharesField.value,
      x: xField.value,
      y: yField.value,
      rotation: rotationField.value,
      width: widthField.value,
    };

    return { payload, errors };
  };

  const handleFile = async (file: File | null) => {
    setError(null);
    setOk(null);
    if (!file) {
      setRows([]);
      setHeaders([]);
      setFileName(null);
      return;
    }
    try {
      const locationCatalog = await loadLocationCatalog();
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet("Bulk Import") ?? workbook.worksheets.find((ws) => ws.name === "Bulk Import") ?? workbook.worksheets[0];
      if (!worksheet) throw new Error("The workbook needs at least one sheet.");
      const headerRow = worksheet.getRow(1);
      const headerCount = headerRow.cellCount;
      const parsedHeaders = Array.from({ length: headerCount }, (_, index) => xlsxCellValueToPayloadString(headerRow.getCell(index + 1).value));
      const headersFromSheet = parsedHeaders.filter((header, index) => header || index < CSV_REQUIRED_HEADERS.length || headerCount > 0);
      if (!headersFromSheet.length) throw new Error("The workbook needs a header row.");
      const unknownHeaders = headersFromSheet.filter((header) => header && !CSV_ALLOWED_HEADERS.has(header));
      if (unknownHeaders.length > 0) {
        throw new Error(`Unknown XLSX columns: ${unknownHeaders.join(", ")}`);
      }
      const missingHeaders = CSV_REQUIRED_HEADERS.filter((header) => !headersFromSheet.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required XLSX columns: ${missingHeaders.join(", ")}`);
      }
      const nextRows: ParsedCsvRow[] = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const hasValue = headersFromSheet.some((_, index) => xlsxCellValueToPayloadString(row.getCell(index + 1).value) !== "");
        if (!hasValue) continue;
        const data = headersFromSheet.reduce<Record<string, string>>((acc, header, index) => {
          acc[header] = xlsxCellValueToPayloadString(row.getCell(index + 1).value);
          return acc;
        }, {});
        const resolved = resolveRow(data, locationCatalog);
        nextRows.push({ rowNumber, data, errors: resolved.errors });
      }
      setHeaders(headersFromSheet);
      setRows(nextRows);
      setFileName(file.name);
    } catch (cause) {
      setRows([]);
      setHeaders([]);
      setFileName(null);
      setError(cause instanceof Error ? cause.message : "Could not read the workbook.");
    }
  };

  const importRows = async () => {
    const readyRows = rows.map((row) => ({ row, resolved: resolveRow(row.data) }));
    const invalid = readyRows.filter(({ row, resolved }) => row.errors.length > 0 || resolved.errors.length > 0);
    if (invalid.length > 0) {
      setError(`Fix the workbook issues first. ${invalid.length} row${invalid.length === 1 ? "" : "s"} have errors.`);
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    setProgress({ done: 0, total: readyRows.length });
    try {
      for (let index = 0; index < readyRows.length; index++) {
        const { resolved } = readyRows[index];
        if (!resolved.payload) continue;
        await createCard(resolved.payload);
        setProgress({ done: index + 1, total: readyRows.length });
      }
      setOk(`Imported ${readyRows.length} card${readyRows.length === 1 ? "" : "s"}.`);
      setTimeout(() => setOk(null), 4000);
      setRows([]);
      setHeaders([]);
      setFileName(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "XLSX import failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const visibleRows = rows.slice(0, 5);
  const invalidCount = rows.filter((row) => row.errors.length > 0).length;
  const canImport = rows.length > 0 && !busy && invalidCount === 0;
  const downloadTemplate = async () => {
    setError(null);
    setOk(null);
    try {
      const locationCatalog = await loadLocationCatalog();
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      workbook.creator = "LocalWall";
      workbook.created = new Date();
      workbook.modified = new Date();
      buildPlaygroundTemplateWorkbook(workbook, locationCatalog);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wall-xlsx-template.xlsx";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 0);
      setOk("XLSX template downloaded.");
      setTimeout(() => setOk(null), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the XLSX template.");
    }
  };

  return (
    <div className="pg-fields">
      <p className="pg-hint">
        One row = one location. Small businesses can repeat the same name across multiple rows for each branch.
        Every row must provide its own plan, featured tier, status, duration, likes, clicks, and review count.
        Contact and social columns are supported too: `phone`, `email`, `website`, `location`, `instagram`, `facebook`, `tiktok`, `linkedin`, `whatsapp`, and `telegram`.
        The workbook contains all fields and dropdowns. <button className="pg-inline-link pg-download-link" type="button" onClick={() => void downloadTemplate()}><FileText size={12} className="pg-download-icon" /> <span>Download XLSX template</span></button>
      </p>
      <div className="pg-row-2">
        <label className="pg-field">
          <span>Upload XLSX</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => void handleFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="pg-field">
          <span>Required columns</span>
          <p className="pg-hint">name, category, line, city, state, country, theme, paidAmount, featuredTier, status, durationDays, likes, clicks, reviewCount. Optional: subcategory, ownerName, area, contact, social, and analytics fields.</p>
        </div>
      </div>
      {fileName ? <p className="pg-hint">Loaded <strong>{fileName}</strong> with {rows.length} row{rows.length === 1 ? "" : "s"}.</p> : null}
      {headers.length ? <p className="pg-hint">Headers: <code>{headers.join(", ")}</code></p> : null}
      {error ? <PgError msg={error} onDismiss={() => setError(null)} /> : null}
      {ok ? <PgOk msg={ok} /> : null}
      {progress ? (
        <div className="pg-progress">
          <div className="pg-progress-bar" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          <span>{progress.done} / {progress.total} cards imported</span>
        </div>
      ) : null}
      {visibleRows.length ? (
        <div className="pg-csv-preview">
          <div className="pg-csv-preview-head">
            <strong>Preview</strong>
            <span>{rows.length} row{rows.length === 1 ? "" : "s"} ready</span>
          </div>
          {visibleRows.map((row) => (
            <div key={row.rowNumber} className={`pg-csv-row${row.errors.length ? " has-error" : ""}`}>
              <div className="pg-csv-row-main">
                <strong>Row {row.rowNumber}</strong>
                <span>{csvString(row.data, "name") || "(missing name)"}</span>
                <small>{csvString(row.data, "city") || "(missing city)"} · {csvString(row.data, "state") || "(missing state)"} · {csvString(row.data, "country") || "(missing country)"}</small>
              </div>
              <div className="pg-csv-row-meta">
                <span>{csvString(row.data, "featuredTier") || "(missing)"}</span>
                <span>{csvString(row.data, "status") || "(missing)"}</span>
                <span>{csvString(row.data, "paidAmount") || "(missing)"}</span>
              </div>
              {row.errors.length ? <p className="pg-csv-row-error">{row.errors.join(" · ")}</p> : null}
            </div>
          ))}
          {rows.length > visibleRows.length ? <p className="pg-hint">Showing first {visibleRows.length} rows only.</p> : null}
        </div>
      ) : null}
      <div className="pg-bulk-actions">
        <button className="pg-action-btn" disabled={!canImport} onClick={() => void importRows()}>
          {busy ? "Importing…" : <><Upload size={13} /> Import XLSX rows</>}
        </button>
      </div>
      <p className="pg-hint">
        XLSX rows are the source of truth for plan, featured tier, status, duration days, likes, clicks, and review count. Missing values will block import.
      </p>
    </div>
  );
}

// ─── My Cards Section ─────────────────────────────────────────────────────────

type PgCard = {
  id: Id<"cards">;
  name: string;
  status: string;
  expiresAt: number;
  paidAmount: number;
  featuredTier: "bronze" | "silver" | "gold" | null;
  city: string;
  country: string;
  createdAt: number;
  clicks: number;
  likes: number;
  reviewCount: number;
};

function CardToolRow({ card }: { card: PgCard }) {
  const setExpiry = useMutation(api.admin.playgroundSetExpiry);
  const setTier = useMutation(api.admin.playgroundSetFeaturedTier);
  const renew = useMutation(api.admin.playgroundRenewCard);
  const deleteCard = useMutation(api.admin.playgroundDeleteCard);
  const [renewPlan, setRenewPlan] = useState(card.paidAmount);
  const [tierPick, setTierPick] = useState<"bronze" | "silver" | "gold" | "">(card.featuredTier ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      await fn();
      setOk(label);
      setTimeout(() => setOk(null), 2400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="pg-card-row">
      <div className="pg-card-info">
        <span className={`status-dot status-${card.status}`} />
        <strong>{card.name}</strong>
        <span className="pg-card-meta">{card.city} · ${card.paidAmount} plan · expires {fmt(card.expiresAt)} · {card.clicks} clicks · {card.likes} likes</span>
        {card.reviewCount > 0 ? <span className="pg-card-tier">{card.reviewCount} reviews</span> : null}
        {card.featuredTier ? <span className="pg-card-tier">{card.featuredTier}</span> : null}
      </div>

      {error ? <PgError msg={error} onDismiss={() => setError(null)} /> : null}
      {ok ? <PgOk msg={`${ok} done`} /> : null}

      <div className="pg-card-actions">
        <div className="pg-card-action-group">
          <span className="pg-action-label">Set expiry</span>
          <div className="pg-btn-row">
            {EXPIRY_PRESETS.map((p) => (
              <button
                key={p.label}
                className="pg-sm-btn"
                disabled={busy !== null}
                onClick={() => run(`Expiry → ${p.label}`, () =>
                  setExpiry({ cardId: card.id, expiresAt: p.ms < 0 ? Date.now() - 1000 : Date.now() + p.ms })
                )}
              >
                <Clock size={10} />{p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pg-card-action-group">
          <span className="pg-action-label">Featured tier</span>
          <div className="pg-btn-row">
            <select className="pg-inline-select" value={tierPick} onChange={(e) => setTierPick(e.target.value as "bronze" | "silver" | "gold" | "")}>
              <option value="">None</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
            <button
              className="pg-sm-btn"
              disabled={busy !== null}
              onClick={() => run("Set tier", () => setTier({ cardId: card.id, tier: (tierPick || undefined) as "bronze" | "silver" | "gold" | undefined }))}
            >
              <Star size={10} /> Apply
            </button>
          </div>
        </div>

        <div className="pg-card-action-group">
          <span className="pg-action-label">Renew with plan</span>
          <div className="pg-btn-row">
            <select className="pg-inline-select" value={renewPlan} onChange={(e) => setRenewPlan(Number(e.target.value))}>
              {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button
              className="pg-sm-btn"
              disabled={busy !== null}
              onClick={() => run("Renew", () => renew({ cardId: card.id, paidAmount: renewPlan }))}
            >
              <RefreshCw size={10} /> Renew
            </button>
          </div>
        </div>

        <div className="pg-card-action-group pg-card-action-right">
          {confirmDelete ? (
            <>
              <span className="pg-confirm-label">Delete permanently?</span>
              <button className="pg-sm-btn danger" disabled={busy !== null} onClick={() => { setConfirmDelete(false); run("Delete", () => deleteCard({ cardId: card.id })); }}>
                <Trash2 size={10} /> Yes, delete
              </button>
              <button className="pg-sm-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button className="pg-sm-btn danger" onClick={() => setConfirmDelete(true)}><Trash2 size={10} /> Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

function MyCardsSection() {
  const data = useQuery(api.admin.playgroundGetMyCards);
  const cards = (data?.cards ?? []) as PgCard[];

  if (!data) return <div className="pg-loading">Loading your cards…</div>;
  if (!cards.length) return (
    <div className="pg-empty">
      No cards yet. Create one above, then{" "}
      <a href={PG_WALL_URL} target="_blank" rel="noopener noreferrer" className="pg-inline-link">
        open the playground wall
      </a>{" "}to see them.
    </div>
  );

  return (
    <div className="pg-card-list">
      {cards.map((card) => <CardToolRow key={String(card.id)} card={card} />)}
      <a className="pg-wall-link pg-wall-link-bottom" href={PG_WALL_URL} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={12} /> Open playground wall to see all cards
      </a>
    </div>
  );
}

// ─── Email Tests Section ──────────────────────────────────────────────────────

function EmailTestSection() {
  const sendReminder = useAction(api.admin.sendTestReminderEmail);
  const sendDigest = useAction(api.admin.playgroundSendDigestTest);
  const [to, setTo] = useState("");

  const reminder = useAsync(sendReminder as (...args: never[]) => Promise<unknown>);
  const digest = useAsync(sendDigest as (...args: never[]) => Promise<unknown>);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);

  return (
    <div className="pg-fields">
      <label className="pg-field">
        <span>Recipient email</span>
        <input type="email" value={to} onChange={(e) => { setTo(e.target.value); reminder.clearError(); digest.clearError(); }} placeholder="test@example.com" />
      </label>
      <div className="pg-btn-row">
        <button
          className="pg-action-btn secondary"
          disabled={reminder.busy || !valid}
          onClick={() => (reminder.run as (...args: never[]) => Promise<void>)({ to } as never)}
        >
          {reminder.busy ? "Sending…" : reminder.ok ? <><Check size={12} /> Sent</> : <><Mail size={13} /> Send reminder email</>}
        </button>
        <button
          className="pg-action-btn secondary"
          disabled={digest.busy || !valid}
          onClick={() => (digest.run as (...args: never[]) => Promise<void>)({ to } as never)}
        >
          {digest.busy ? "Sending…" : digest.ok ? <><Check size={12} /> Sent</> : <><Mail size={13} /> Send digest email</>}
        </button>
      </div>
      {reminder.error ? <PgError msg={reminder.error} onDismiss={reminder.clearError} /> : null}
      {digest.error ? <PgError msg={digest.error} onDismiss={digest.clearError} /> : null}
      <p className="pg-hint">Reminder email: the standard card-expiry email. Digest email: the weekly local listings newsletter template.</p>
    </div>
  );
}

// ─── Subscription Tests Section ───────────────────────────────────────────────

function SubscriptionSection() {
  const subscribe = useMutation(api.digest.subscribe);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(PG_DEFAULTS.country);
  const [state, setState] = useState(PG_DEFAULTS.state);
  const [city, setCity] = useState(PG_DEFAULTS.city);
  const [result, setResult] = useState<string | null>(null);
  const sub = useAsync(subscribe as (...args: never[]) => Promise<unknown>);

  const handleSubscribe = async () => {
    const res = await subscribe({ email, country, state, city }) as { alreadySubscribed: boolean };
    setResult(res.alreadySubscribed ? "Already subscribed — duplicate prevented." : "Subscribed successfully.");
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="pg-fields">
      <p className="pg-hint">Subscribe an email address to the weekly digest for a specific location, then verify it appears in the digest send list.</p>
      <label className="pg-field">
        <span>Email to subscribe</span>
        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); sub.clearError(); }} placeholder="test@example.com" />
      </label>
      <div className="pg-row-3">
        <label className="pg-field">
          <span>Country</span>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="us" maxLength={4} />
        </label>
        <label className="pg-field">
          <span>State</span>
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" maxLength={4} />
        </label>
        <label className="pg-field">
          <span>City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </label>
      </div>
      {sub.error ? <PgError msg={sub.error} onDismiss={sub.clearError} /> : null}
      {result ? <PgOk msg={result} /> : null}
      <button
        className="pg-action-btn"
        disabled={sub.busy || !email.includes("@") || !city.trim()}
        onClick={handleSubscribe}
      >
        {sub.busy ? "Subscribing…" : "Subscribe to digest"}
      </button>
    </div>
  );
}

// ─── Payment Tests Section ────────────────────────────────────────────────────

function PaymentSection() {
  return (
    <div className="pg-fields">
      <p className="pg-hint">To test the real Stripe payment flow, use the card composer on the wall page and select any paid plan. Use Stripe test card <code>4242 4242 4242 4242</code>, any future expiry, any CVC.</p>
      <div className="pg-payment-grid">
        <div className="pg-payment-item">
          <strong>One-time posting</strong>
          <span>Select a paid plan in the composer → Stripe Checkout → card created on success webhook</span>
        </div>
        <div className="pg-payment-item">
          <strong>Subscription posting</strong>
          <span>Select any plan + turn on Auto-renew → Stripe subscription created → monthly/annual renewal</span>
        </div>
        <div className="pg-payment-item">
          <strong>Renewal</strong>
          <span>Open an expired or near-expiry card in dashboard → Renew → Stripe Checkout</span>
        </div>
        <div className="pg-payment-item">
          <strong>Verification badge</strong>
          <span>Dashboard → Verification tab → Subscribe → monthly ($4.99) or annual ($19.99)</span>
        </div>
        <div className="pg-payment-item">
          <strong>Bundle (3 cities)</strong>
          <span>Composer step 3 → select Bundle → fill 3 city slots → Stripe Checkout (bundled SKU)</span>
        </div>
      </div>
      <p className="pg-hint" style={{ marginTop: 12 }}>All Stripe events are visible in the Stripe dashboard under Developers → Webhooks. Check <code>/api/webhooks/stripe</code> for the webhook endpoint.</p>
    </div>
  );
}

// ─── Verification Section ─────────────────────────────────────────────────────

function VerificationSection() {
  const data = useQuery(api.admin.playgroundGetMyCards);
  const setVerified = useMutation(api.admin.playgroundSetVerified);
  const { busy, error, ok, run, clearError } = useAsync(setVerified as (...args: never[]) => Promise<unknown>);
  const isVerified = data?.verified ?? false;

  return (
    <div className="pg-fields">
      <div className="pg-verify-row">
        <div>
          <strong>Your verification badge</strong>
          <p className="pg-hint" style={{ margin: "4px 0 0" }}>
            Status: <span className={`pg-verify-status${isVerified ? " yes" : ""}`}>{isVerified ? "✓ Verified" : "Not verified"}</span>
          </p>
        </div>
        <div className="pg-btn-row">
          <button
            className="pg-action-btn"
            disabled={busy || isVerified}
            onClick={() => (run as (...args: never[]) => Promise<void>)({ verified: true } as never)}
          >
            {busy ? "…" : <><Shield size={13} /> Verify me</>}
          </button>
          <button
            className="pg-action-btn secondary"
            disabled={busy || !isVerified}
            onClick={() => (run as (...args: never[]) => Promise<void>)({ verified: false } as never)}
          >
            {busy ? "…" : <><ShieldOff size={13} /> Unverify</>}
          </button>
        </div>
      </div>
      {error ? <PgError msg={error} onDismiss={clearError} /> : null}
      {ok ? <PgOk msg={isVerified ? "Verification removed." : "You are now verified. Reload the wall to see the badge."} /> : null}
      <p className="pg-hint">This toggles the verified badge (✓) on your own admin account and all your cards. Use it to test badge display without going through the payment flow.</p>
    </div>
  );
}

// ─── Bulk Create / Stress Test Section ───────────────────────────────────────

const BULK_COUNTS = [5, 10, 25, 50, 100] as const;
const BULK_NAMES = ["Ace Plumbing", "Metro Cleaners", "Star Tutors", "City Auto", "Fresh Bakes", "Peak Fitness", "Green Lawns", "Tech Repair", "Bright Smiles", "Quick Move"];
const BULK_CATEGORIES = ["Services", "Repairs", "Home & Garden", "Food & Catering", "Automotive", "Health & Fitness", "Technology", "Pets"] as const;
const BULK_THEMES = ["yellow", "paper", "pink", "cyan", "dark", "cream", "kraft"] as const;
const BULK_LINES = [
  "Fast, reliable and local.",
  "Serving the community since day one.",
  "Call us for a free quote today.",
  "Quality work at fair prices.",
  "Your trusted local expert.",
  "Same-day service available.",
  "Licensed & insured professionals.",
  "No job too big or too small.",
];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function BulkCreateSection() {
  const createCard = useMutation(api.admin.playgroundCreateCard);
  const deleteAll = useMutation(api.admin.playgroundDeleteAllMyCards);
  const cardData = useQuery(api.admin.playgroundGetMyCards);
  const cardCount = cardData?.cards.length ?? 0;

  const [count, setCount] = useState<number>(10);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleBulkCreate = async () => {
    setError(null);
    setProgress({ done: 0, total: count });
    const BATCH = 5;
    try {
      for (let i = 0; i < count; i += BATCH) {
        const batchSize = Math.min(BATCH, count - i);
        await Promise.all(
          Array.from({ length: batchSize }, () =>
            createCard({
              name: `${pick(BULK_NAMES)} #${Math.floor(Math.random() * 900 + 100)}`,
              category: pick(BULK_CATEGORIES),
              line: pick(BULK_LINES),
              ...PG_DEFAULTS,
              theme: pick(BULK_THEMES),
              paidAmount: 0,
            })
          )
        );
        setProgress({ done: Math.min(i + BATCH, count), total: count });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bulk create failed.");
    } finally {
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteBusy(true);
    setDeleteConfirm(false);
    setDeleteResult(null);
    try {
      const res = await deleteAll({}) as { deleted: number };
      setDeleteResult(`Deleted ${res.deleted} card${res.deleted !== 1 ? "s" : ""}.`);
      setTimeout(() => setDeleteResult(null), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const running = progress !== null;

  return (
    <div className="pg-fields">
      <div className="pg-bulk-row">
        <div>
          <p className="pg-action-label" style={{ marginBottom: 8 }}>Number of cards</p>
          <div className="pg-btn-row">
            {BULK_COUNTS.map((n) => (
              <button
                key={n}
                className={`pg-plan-btn${count === n ? " selected" : ""}`}
                onClick={() => setCount(n)}
                disabled={running}
                type="button"
              >
                {n}
              </button>
            ))}
            <input
              className="pg-bulk-input"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              disabled={running}
              aria-label="Custom count"
            />
          </div>
        </div>
      </div>

      {error ? <PgError msg={error} onDismiss={() => setError(null)} /> : null}
      {deleteResult ? <PgOk msg={deleteResult} /> : null}

      {running ? (
        <div className="pg-progress">
          <div className="pg-progress-bar" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          <span>{progress.done} / {progress.total} cards created</span>
        </div>
      ) : null}

      <div className="pg-bulk-actions">
        <button className="pg-action-btn" disabled={running || deleteBusy} onClick={handleBulkCreate}>
          {running ? `Creating… ${progress!.done}/${progress!.total}` : <><Layers size={13} /> Create {count} random cards</>}
        </button>
        <a className="pg-wall-link" href={PG_WALL_URL} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} /> Open playground wall
        </a>
        {cardCount > 0 ? (
          deleteConfirm ? (
            <div className="pg-btn-row">
              <span className="pg-confirm-label">Delete all {cardCount} cards?</span>
              <button className="pg-sm-btn danger" disabled={deleteBusy} onClick={handleDeleteAll}>
                <Trash2 size={10} /> Yes, delete all
              </button>
              <button className="pg-sm-btn" onClick={() => setDeleteConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button className="pg-sm-btn danger" disabled={running || deleteBusy} onClick={() => setDeleteConfirm(true)}>
              <Trash2 size={10} /> Clear all ({cardCount})
            </button>
          )
        ) : null}
      </div>

      <p className="pg-hint">
        Creates cards with random names, categories, themes, and positions across the wall. Use it to stress-test layout, stacking, scroll, and performance. All cards land on <code>{PG_WALL_URL}</code>.
      </p>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function AdminPlayground() {
  return (
    <div className="pg-root" role="region" aria-label="Admin playground">
      <div className="pg-header">
        <FlaskConical size={15} />
        <div>
          <strong>Admin Playground</strong>
          <span>Test all features without real payments. All mutations are admin-only and bypass the normal user flows.</span>
        </div>
      </div>

      <Section title="Create Card (payment bypass)" icon={<Zap size={14} />}>
        <CreateCardSection />
      </Section>

      <Section title="Bulk XLSX Import" icon={<Upload size={14} />}>
        <BulkCsvImportSection />
      </Section>

      <Section title="Bulk Create — Stress Test" icon={<Layers size={14} />}>
        <BulkCreateSection />
      </Section>

      <Section title="My Cards — Quick Tools" icon={<CreditCard size={14} />}>
        <MyCardsSection />
      </Section>

      <Section title="Email Tests" icon={<Mail size={14} />}>
        <EmailTestSection />
      </Section>

      <Section title="Digest Subscriptions" icon={<RefreshCw size={14} />}>
        <SubscriptionSection />
      </Section>

      <Section title="Payment Flow Tests (real Stripe)" icon={<CreditCard size={14} />}>
        <PaymentSection />
      </Section>

      <Section title="Verification Badge" icon={<Shield size={14} />}>
        <VerificationSection />
      </Section>
    </div>
  );
}
