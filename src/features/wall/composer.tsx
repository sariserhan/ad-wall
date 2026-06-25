"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, ImagePlus, MapPin, Sparkles, X } from "lucide-react";
import { useState, useEffect, useRef, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { Country, State, City } from "country-state-city";
import { categories, SUBCATEGORY_OPTIONS, getCardFormat, type CardCategory, type CardDraft, type CardImageMode, type CardTheme } from "./types";

interface ComposerProps {
  onClose: () => void;
  onReady: (draft: CardDraft) => void;
  initialLocation?: { country: string; state: string; city: string };
}

interface ComposerForm {
  name: string;
  category: CardCategory | "";
  subcategory: string;
  line: string;
  message: string;
  area: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  neighborhood: string;
  price: string;
  phone: string;
  email: string;
  website: string;
  location: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  whatsapp: string;
  telegram: string;
  theme: CardTheme;
  imageMode: CardImageMode;
  paymentOption: "free" | "2.99" | "7.99" | "24.99" | "bundle";
  featuredTier: "none" | "bronze" | "silver" | "gold";
}

interface BundleCity { country: string; state: string; city: string; }

const countries = Country.getAllCountries();
const defaultCountry = countries[0]?.isoCode ?? "US";
const defaultStates = State.getStatesOfCountry(defaultCountry);
const defaultState = defaultStates[0]?.isoCode ?? "";
const defaultCities = defaultState ? City.getCitiesOfState(defaultCountry, defaultState) : [];
const defaultCity = defaultCities[0]?.name ?? "";

const initialForm: ComposerForm = {
  name: "",
  category: "",
  subcategory: "",
  line: "",
  message: "",
  area: "",
  city: defaultCity,
  state: defaultState,
  country: defaultCountry,
  zipcode: "",
  neighborhood: "",
  price: "",
  phone: "",
  email: "",
  website: "",
  location: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  linkedin: "",
  whatsapp: "",
  telegram: "",
  theme: "yellow",
  imageMode: "photo",
  paymentOption: "free",
  featuredTier: "none",
};

const themeOptions: ReadonlyArray<{ theme: CardTheme; label: string; description: string }> = [
  { theme: "yellow", label: "Sticky note", description: "Handwritten yellow" },
  { theme: "paper", label: "Flyer", description: "Classic white paper" },
  { theme: "pink", label: "Neon flyer", description: "Bright and loud" },
  { theme: "cyan", label: "Color card", description: "Crisp cyan stock" },
  { theme: "dark", label: "Night card", description: "Bold black paper" },
  { theme: "biz", label: "Business card", description: "Clean and professional" },
  { theme: "photo", label: "Photo print", description: "Image-first Polaroid" },
  { theme: "ticket", label: "Ticket", description: "Perforated coupon" },
  { theme: "kraft", label: "Kraft note", description: "Warm recycled stock" },
  { theme: "blueprint", label: "Blueprint", description: "Technical grid" },
];

const paymentOptions: ReadonlyArray<{ value: ComposerForm["paymentOption"]; price: string; duration: string; description: string; featured?: boolean; badge?: string }> = [
  { value: "free", price: "Free", duration: "1 day", description: "Try the wall with no commitment." },
  { value: "2.99", price: "$2.99", duration: "30 days", description: "Great for a quick local offer." },
  { value: "7.99", price: "$7.99", duration: "90 days", description: "Best for regular neighborhood services.", featured: true },
  { value: "24.99", price: "$24.99", duration: "365 days", description: "A full year on your local wall." },
  { value: "bundle", price: "$19.99", duration: "90 days × 3 cities", description: "Post in 3 cities for the price of one.", badge: "Best value" },
];

const featuredTierOptions: ReadonlyArray<{ value: ComposerForm["featuredTier"]; price: string; label: string; perks: string[] }> = [
  { value: "none", price: "", label: "No boost", perks: ["Normal card", "Appears in regular results"] },
  { value: "bronze", price: "+$2.99", label: "Bronze", perks: ["⭐ Featured badge", "Gold border", "Appears before free listings"] },
  { value: "silver", price: "+$4.99", label: "Silver", perks: ["Everything in Bronze", "Higher in search results", "Appears in Featured section"] },
  { value: "gold", price: "+$9.99", label: "Gold", perks: ["Everything in Silver", "Pinned to top", "Homepage spotlight", "⭐ Featured ribbon"] },
];

const stepLabels = ["Design", "Details", "Duration"] as const;
const DRAFT_STORAGE_KEY = "wall-card-draft-v1";
const DRAFT_IMAGES_DB = "wall-draft-images-v1";
const DRAFT_IMAGES_STORE = "blobs";
const DRAFT_IMAGES_KEY = "draft";

function openImagesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_IMAGES_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DRAFT_IMAGES_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImagesToIDB(blobs: Blob[]): Promise<void> {
  try {
    const db = await openImagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readwrite");
      tx.objectStore(DRAFT_IMAGES_STORE).put(blobs, DRAFT_IMAGES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* storage unavailable */ }
}

async function loadImagesFromIDB(): Promise<Blob[] | null> {
  try {
    const db = await openImagesDB();
    const blobs = await new Promise<Blob[] | null>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readonly");
      const req = tx.objectStore(DRAFT_IMAGES_STORE).get(DRAFT_IMAGES_KEY);
      req.onsuccess = () => resolve((req.result as Blob[]) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blobs;
  } catch { return null; }
}

async function clearImagesFromIDB(): Promise<void> {
  try {
    const db = await openImagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readwrite");
      tx.objectStore(DRAFT_IMAGES_STORE).delete(DRAFT_IMAGES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* storage unavailable */ }
}

type ModerationMatch = { field: "name" | "line" | "message"; term: string; start: number; end: number };
type DetailField = "name" | "line" | "message" | "area" | "zipcode" | "price" | "phone" | "email" | "website" | "location" | "instagram" | "facebook" | "tiktok" | "linkedin" | "whatsapp" | "telegram";

const detailFieldLabels: Record<DetailField, string> = {
  name: "Business or service", line: "Subtitle", message: "Message", area: "Neighborhood", zipcode: "Zip code", price: "Price", phone: "Phone", email: "Email", website: "Website", location: "Location", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", whatsapp: "WhatsApp", telegram: "Telegram",
};

function validWebUrl(value: string) {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalized);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function validSocialProfile(value: string) {
  return /^@?[A-Za-z0-9._-]{2,100}$/.test(value) || /^(https?:\/\/)?(www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/.test(value);
}

function LiveCardPreview({ form, image }: { form: ComposerForm; image?: string }) {
  const displayTheme = form.imageMode === "business-card" ? "biz" : form.theme;
  const format = getCardFormat(displayTheme);
  const location = form.area.trim() || [form.city.trim(), form.state.trim(), form.country.trim()].filter(Boolean).join(", ") || "Selected wall";
  const style = { "--w": `${format.width}px`, "--h": `${format.minHeight}px`, "--r": "-1deg", "--x": "0", "--y": "0" } as CSSProperties;
  return (
    <article className={`wall-card composer-live-card theme-${displayTheme} ${form.imageMode === "business-card" && image ? "image-business-card" : ""}`} style={style} aria-label="Live card preview">
      <span className="card-tape" aria-hidden="true" />
      <div className="card-copy"><p className="card-category">{form.category}{form.subcategory ? <> · {form.subcategory}</> : null}</p><h2>{form.name || "Your business"}</h2><p className="card-line">{form.line || "Your offer goes here."}</p>{form.message.trim() ? <p className="composer-preview-message">{form.message}</p> : null}</div>
      {image ? <img src={image} alt="" draggable={false} /> : null}
      <footer><span>{location}</span>{form.price ? <strong>{form.price}</strong> : null}</footer>
    </article>
  );
}

export function Composer({ onClose, onReady, initialLocation }: ComposerProps) {
  const [form, setForm] = useState<ComposerForm>(() => {
    const baseCountry = initialLocation?.country ?? defaultCountry;
    const baseState = initialLocation?.state ?? defaultState;
    const baseCity = initialLocation?.city ?? defaultCity;
    const states = State.getStatesOfCountry(baseCountry);
    const state = states.some((s) => s.isoCode === baseState) ? baseState : states[0]?.isoCode ?? "";
    const cities = state ? City.getCitiesOfState(baseCountry, state) : [];
    const city = cities.some((c) => c.name === baseCity) ? baseCity : cities[0]?.name ?? "";
    if (typeof window === "undefined") return { ...initialForm, country: baseCountry, state, city };
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null") as Partial<ComposerForm> | null;
      if (!saved) return { ...initialForm, country: baseCountry, state, city };
      const cat = (categories as readonly string[]).includes(saved.category ?? "") ? (saved.category as CardCategory) : "";
      const sub = cat && saved.subcategory && (SUBCATEGORY_OPTIONS[cat] ?? []).includes(saved.subcategory) ? saved.subcategory : "";
      return { ...initialForm, ...saved, category: cat, subcategory: sub, country: baseCountry, state, city };
    } catch {
      return { ...initialForm, country: baseCountry, state, city };
    }
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [autoRenew, setAutoRenew] = useState(false);
  const [bundleCities, setBundleCities] = useState<BundleCity[]>(() => {
    const base: BundleCity = initialLocation
      ? { country: initialLocation.country, state: initialLocation.state, city: initialLocation.city }
      : { country: "", state: "", city: "" };
    return [base, { country: "", state: "", city: "" }, { country: "", state: "", city: "" }];
  });
  const [bundleCityError, setBundleCityError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [draftBanner, setDraftBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null") as Partial<ComposerForm> | null;
      return !!(saved?.name?.trim() || saved?.line?.trim());
    } catch { return false; }
  });
  const [honeypot, setHoneypot] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DetailField, string>>>({});
  const [moderationStatus, setModerationStatus] = useState<"idle" | "checking" | "passed" | "blocked">("idle");
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationMatches, setModerationMatches] = useState<ModerationMatch[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const moderationRequestRef = useRef<AbortController | null>(null);

  const validateDetails = () => {
    const errors: Partial<Record<DetailField, string>> = {};
    const name = form.name.trim();
    const line = form.line.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (name.length < 2) errors.name = "Enter at least 2 characters.";
    if (name.length > 60) errors.name = "Use 60 characters or fewer.";
    if (line.length < 5) errors.line = "Enter at least 5 characters.";
    if (line.length > 90) errors.line = "Use 90 characters or fewer.";
    if (form.message.length > 300) errors.message = "Use 300 characters or fewer.";
    if (form.area && form.area.trim().length < 2) errors.area = "Enter at least 2 characters or leave it empty.";
    if (form.zipcode && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(form.zipcode.trim())) errors.zipcode = "Use letters, numbers, spaces, or hyphens.";
    if (!phone && !email) {
      errors.phone = "Add a phone number or email address.";
      errors.email = "Add a phone number or email address.";
    }
    if (phone && !/^[+()0-9.\s-]{7,30}$/.test(phone)) errors.phone = "Use a valid phone number with at least 7 digits/characters.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a complete email address, such as name@example.com.";
    if (form.website && !validWebUrl(form.website.trim())) errors.website = "Enter a valid website, such as example.com.";
    if (form.location.length > 300) errors.location = "Use 300 characters or fewer.";
    for (const field of ["instagram", "facebook", "tiktok", "linkedin"] as const) {
      if (form[field] && !validSocialProfile(form[field].trim())) errors[field] = "Enter a username, @handle, or complete profile URL.";
    }
    if (form.whatsapp && !/^[+()0-9.\s-]{7,30}$/.test(form.whatsapp.trim())) errors.whatsapp = "Enter a valid phone number with country code, e.g. +1 555 123 4567.";
    if (form.telegram && !/^@?[A-Za-z0-9_]{4,32}$|^https?:\/\/(t\.me|telegram\.me)\//.test(form.telegram.trim())) errors.telegram = "Enter a @username or t.me link.";

    const fields = Object.keys(detailFieldLabels) as DetailField[];
    fields.forEach((field) => {
      const control = formRef.current?.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement | null;
      control?.setCustomValidity(errors[field] ?? "");
    });
    setFieldErrors(errors);
    const contactMessage = errors.phone && errors.email ? "Add at least one contact method: phone or email." : null;
    setContactError(contactMessage);

    const firstField = fields.find((field) => errors[field]);
    if (firstField) {
      const control = formRef.current?.elements.namedItem(firstField) as HTMLInputElement | HTMLTextAreaElement | null;
      control?.focus();
      control?.reportValidity();
      return false;
    }
    return formRef.current?.reportValidity() ?? false;
  };

  const fieldError = (field: DetailField) => fieldErrors[field] ? <small className="field-error" role="alert">{fieldErrors[field]}</small> : null;

  const moderateDraft = async (includeImages: boolean) => {
    moderationRequestRef.current?.abort();
    const controller = new AbortController();
    moderationRequestRef.current = controller;
    setModerationStatus("checking");
    setModerationError(null);
    setModerationMatches([]);
    const moderationBody = new FormData();
    moderationBody.set("name", form.name);
    moderationBody.set("line", form.line);
    moderationBody.set("message", form.message);
    if (includeImages) files.forEach((file) => moderationBody.append("images", file));
    try {
      const response = await fetch("/api/moderate", { method: "POST", body: moderationBody, signal: controller.signal });
      const result = await response.json() as { safe?: boolean; error?: string; matches?: ModerationMatch[] };
      if (moderationRequestRef.current !== controller) return false;
      if (!response.ok || !result.safe) {
        setModerationStatus("blocked");
        setModerationError(result.error ?? "This content did not pass the safety check.");
        const matches = result.matches ?? [];
        setModerationMatches(matches);
        const firstMatch = matches[0];
        if (firstMatch) {
          window.requestAnimationFrame(() => {
            const field = formRef.current?.elements.namedItem(firstMatch.field) as HTMLInputElement | HTMLTextAreaElement | null;
            field?.focus();
            field?.setSelectionRange(firstMatch.start, firstMatch.end);
          });
        }
        return false;
      }
      setModerationStatus("passed");
      moderationRequestRef.current = null;
      return true;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return false;
      setModerationStatus("blocked");
      setModerationError("The safety check is temporarily unavailable. Please try again.");
      return false;
    }
  };

  const goToStep = async (targetStep: number) => {
    if (targetStep < 1 || targetStep > 3) return;
    if (targetStep <= step) {
      setStep(targetStep);
      return;
    }
    if (step === 1) {
      setStep(targetStep === 3 ? 2 : targetStep);
      return;
    }
    if (step === 2 && targetStep === 3) {
      if (!validateDetails()) return;
      if (!await moderateDraft(true)) return;
    }
    setStep(targetStep);
  };

  useEffect(() => {
    if (!initialLocation) return;
    const country = initialLocation.country;
    const states = State.getStatesOfCountry(country);
    const state = states.some((s) => s.isoCode === initialLocation.state) ? initialLocation.state : states[0]?.isoCode ?? "";
    const cities = state ? City.getCitiesOfState(country, state) : [];
    const city = cities.some((c) => c.name === initialLocation.city) ? initialLocation.city : cities[0]?.name ?? "";
    setForm((value) => ({ ...value, country, state, city }));
  }, [initialLocation]);

  useEffect(() => {
    moderationRequestRef.current?.abort();
    moderationRequestRef.current = null;
    setModerationStatus("idle");
    setModerationError(null);
    setModerationMatches([]);
  }, [form.name, form.line, form.message, files]);

  useEffect(() => () => moderationRequestRef.current?.abort(), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form)); } catch { /* storage unavailable */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form]);

  useEffect(() => {
    void loadImagesFromIDB().then((blobs) => {
      if (!blobs?.length) return;
      const restored = blobs.map((blob, i) => new File([blob], `draft-${i}.${blob.type.split("/")[1] ?? "jpg"}`, { type: blob.type }));
      setFiles(restored);
      setPreviews(restored.map((f) => URL.createObjectURL(f)));
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void saveImagesToIDB(files); }, 500);
    return () => window.clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    if (!form.phone.trim() && !form.email.trim()) return;
    const phoneInput = formRef.current?.elements.namedItem("phone") as HTMLInputElement | null;
    const emailInput = formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
    phoneInput?.setCustomValidity("");
    emailInput?.setCustomValidity("");
    setContactError(null);
    setFieldErrors((current) => {
      if (!current.phone && !current.email) return current;
      const next = { ...current };
      delete next.phone;
      delete next.email;
      return next;
    });
  }, [form.phone, form.email]);

  const onImages = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 2);
    previews.forEach(URL.revokeObjectURL);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    if (!nextFiles.length) setForm((value) => ({ ...value, imageMode: "photo" }));
  };

  const chooseImageMode = (imageMode: CardImageMode) => {
    if (imageMode === "business-card" && files.length > 1) {
      previews.slice(1).forEach(URL.revokeObjectURL);
      setFiles((current) => current.slice(0, 1));
      setPreviews((current) => current.slice(0, 1));
    }
    setForm((value) => ({ ...value, imageMode }));
  };

  useEffect(() => {
    if (form.paymentOption !== "bundle") setBundleCityError(null);
  }, [form.paymentOption]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (honeypot) return;
    if (step < 3) {
      await goToStep(step + 1);
      return;
    }
    if (form.paymentOption === "bundle") {
      const allHaveCountry = bundleCities.every((c) => c.country);
      if (!allHaveCountry) {
        setBundleCityError("Select at least a country for all 3 slots before continuing.");
        return;
      }
    }
    onReady({
      ...form,
      category: form.category as CardCategory,
      subcategory: form.subcategory,
      area: form.area.trim() || [form.city.trim(), form.state.trim(), form.country.trim()].filter(Boolean).join(", ") || "Selected wall",
      message: form.message.trim() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
      price: form.price.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      website: form.website.trim() || undefined,
      location: form.location.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      tiktok: form.tiktok.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      telegram: form.telegram.trim() || undefined,
      featuredTier: form.featuredTier,
      autoRenew: autoRenew && form.paymentOption !== "free" && form.paymentOption !== "bundle",
      bundleCities: form.paymentOption === "bundle" ? bundleCities : undefined,
      files,
      previews,
    });
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* storage unavailable */ }
    void clearImagesFromIDB();
  };

  return (
    <div className="composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form ref={formRef} className={`composer composer-step-${step}`} onSubmit={submit} onInput={(event) => {
        const control = event.target as HTMLInputElement | HTMLTextAreaElement;
        const field = control.name as DetailField;
        if (!field || !(field in detailFieldLabels)) return;
        control.setCustomValidity("");
        setFieldErrors((current) => {
          if (!current[field]) return current;
          const next = { ...current };
          delete next[field];
          return next;
        });
      }}>
        <input name="url" type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="composer-hp" />
        <header>
          <button type="button" className="icon-btn" onClick={() => setStep((current) => current - 1)} aria-label="Back" style={{ visibility: step > 1 ? "visible" : "hidden" }}><ArrowLeft /></button>
          <div><span>{stepLabels[step - 1]}</span><small>POST A CARD · STEP {step} OF 3</small></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="composer-progress" aria-label={`Step ${step} of 3: ${stepLabels[step - 1]}`}>
          {stepLabels.map((label, index) => {
            const target = index + 1;
            const isComplete = target <= step;
            const isCurrent = target === step;
            return (
              <button
                key={label}
                type="button"
                className={`${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""}`.trim()}
                onClick={() => goToStep(target)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Go to ${label} step`}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {draftBanner ? (
          <div className="composer-draft-banner" role="status">
            <span>Draft restored — pick up where you left off.</span>
            <button type="button" className="icon-btn" onClick={() => setDraftBanner(false)} aria-label="Dismiss draft notice"><X size={14} /></button>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="composer-body details-step">
            <div className="details-fields">
            {Object.keys(fieldErrors).length ? <div className="validation-summary" role="alert"><strong>Fix these details to continue</strong>{(Object.keys(fieldErrors) as DetailField[]).map((field) => <button type="button" key={field} onClick={() => (formRef.current?.elements.namedItem(field) as HTMLElement | null)?.focus()}><span>{detailFieldLabels[field]}</span>{fieldErrors[field]}</button>)}</div> : null}
            <label>Business or service<input name="name" required maxLength={60} autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="What should the wall call you?" />{fieldError("name")}</label>
            <div className="form-grid">
              <label>Category<select required value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value as CardCategory, subcategory: "" }))}><option value="" disabled>— Select a category —</option>{categories.slice(1).map((cat) => <option key={cat}>{cat}</option>)}</select></label>
              <label>Subcategory<select required value={form.subcategory} disabled={!form.category} onChange={(event) => setForm((value) => ({ ...value, subcategory: event.target.value }))}><option value="" disabled>— Select a type —</option>{form.category ? SUBCATEGORY_OPTIONS[form.category as CardCategory].map((sub) => <option key={sub} value={sub}>{sub}</option>) : null}</select></label>
            </div>
            <div className="form-grid">
              <label>Neighborhood<input name="area" maxLength={50} value={form.area} onChange={(event) => setForm((value) => ({ ...value, area: event.target.value }))} placeholder="Optional" />{fieldError("area")}</label>
              <label>Zip code<input name="zipcode" maxLength={20} value={form.zipcode} onChange={(event) => setForm((value) => ({ ...value, zipcode: event.target.value }))} placeholder="Optional" />{fieldError("zipcode")}</label>
            </div>
            <label>Subtitle<textarea name="line" required maxLength={90} value={form.line} onChange={(event) => setForm((value) => ({ ...value, line: event.target.value }))} placeholder="Short line shown on the card." />{fieldError("line")}</label>
            <label>Message <span>(optional)</span><textarea name="message" maxLength={300} aria-describedby="message-safety" value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} placeholder="Longer details shown when someone opens the card." />{fieldError("message")}<small id="message-safety" className="safety-hint">Messages are checked for adult and unsafe content before publishing.</small>{step === 2 && moderationError ? <small className="field-error" role="alert">{moderationError}</small> : null}{moderationMatches.length ? <span className="flagged-terms">Flagged: {moderationMatches.map((match) => <mark key={`${match.field}-${match.start}`}>{match.field}: {match.term}</mark>)}</span> : null}</label>
            <label>Price <span>(optional)</span><input name="price" maxLength={50} value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} placeholder="$25 / visit" />{fieldError("price")}</label>
            <fieldset>
              <legend>How should people contact you?</legend>
              <div className="form-grid contact-fields">
                <label>Phone<input name="phone" type="tel" maxLength={30} inputMode="tel" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} placeholder="(555) 123-4567" />{fieldError("phone")}</label>
                <label>Email<input name="email" type="email" maxLength={120} value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} placeholder="hello@example.com" />{fieldError("email")}</label>
              </div>
              <small className={contactError ? "field-error" : "field-help"} role={contactError ? "alert" : undefined}>{contactError ?? "At least one phone number or email address is required."}</small>
              <label>Website<input name="website" type="text" inputMode="url" maxLength={240} value={form.website} onChange={(event) => setForm((value) => ({ ...value, website: event.target.value }))} placeholder="example.com" />{fieldError("website")}</label>
              <label>Google Maps location <span>(optional)</span><input name="location" type="text" maxLength={300} value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} placeholder="Address or Google Maps link" />{fieldError("location")}<small className="field-help">Share only a public business or meeting location.</small></label>
            </fieldset>
            <fieldset style={{ paddingBottom: "20px" }}>
              <legend>Social media &amp; messaging <span>(optional)</span></legend>
              <div className="form-grid social-fields">
                <label>Instagram<input name="instagram" maxLength={240} value={form.instagram} onChange={(event) => setForm((value) => ({ ...value, instagram: event.target.value }))} placeholder="@yourbusiness" />{fieldError("instagram")}</label>
                <label>Facebook<input name="facebook" maxLength={240} value={form.facebook} onChange={(event) => setForm((value) => ({ ...value, facebook: event.target.value }))} placeholder="facebook.com/yourbusiness" />{fieldError("facebook")}</label>
                <label>TikTok<input name="tiktok" maxLength={240} value={form.tiktok} onChange={(event) => setForm((value) => ({ ...value, tiktok: event.target.value }))} placeholder="@yourbusiness" />{fieldError("tiktok")}</label>
                <label>LinkedIn<input name="linkedin" maxLength={240} value={form.linkedin} onChange={(event) => setForm((value) => ({ ...value, linkedin: event.target.value }))} placeholder="linkedin.com/company/yourbusiness" />{fieldError("linkedin")}</label>
                <label>WhatsApp<input name="whatsapp" type="tel" inputMode="tel" maxLength={30} value={form.whatsapp} onChange={(event) => setForm((value) => ({ ...value, whatsapp: event.target.value }))} placeholder="+1 555 123 4567" />{fieldError("whatsapp")}</label>
                <label>Telegram<input name="telegram" maxLength={100} value={form.telegram} onChange={(event) => setForm((value) => ({ ...value, telegram: event.target.value }))} placeholder="@yourusername or t.me/..." />{fieldError("telegram")}</label>
              </div>
            </fieldset>
            </div>
            <aside className="details-live-preview">
              <span>Live card</span>
              <div className="details-preview-canvas"><LiveCardPreview form={form} image={previews[0]} /></div>
              <small>Updates as you type</small>
              <div className="details-wall-location">
                <MapPin size={13} aria-hidden="true" />
                <div>
                  <span className="details-wall-location-label">Posting on</span>
                  <strong className="details-wall-location-name">
                    {[form.city, form.state, form.country].filter(Boolean).join(", ") || "Selected wall"}
                  </strong>
                </div>
              </div>
            </aside>
          </div>
        ) : step === 1 ? (
          <div className="composer-body design-step">
            <label className="upload-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onImages} />
              {previews.length ? <div className="preview-row">{previews.map((src) => <img src={src} key={src} alt="Upload preview" />)}</div> : <><ImagePlus /><strong>Upload pictures or your finished card</strong><span>JPG, PNG or WEBP · 8MB each</span></>}
            </label>
            {previews.length ? (
              <fieldset className="image-use-picker">
                <legend>How should we use your upload?</legend>
                <div role="radiogroup" aria-label="Choose how to display the uploaded image">
                  <button type="button" role="radio" aria-checked={form.imageMode === "photo"} className={form.imageMode === "photo" ? "selected" : ""} onClick={() => chooseImageMode("photo")}>
                    <ImagePlus /><span><strong>Picture in a WALL style</strong><small>Place the picture inside any card style below.</small></span>{form.imageMode === "photo" ? <Check /> : null}
                  </button>
                  <button type="button" role="radio" aria-checked={form.imageMode === "business-card"} className={form.imageMode === "business-card" ? "selected" : ""} onClick={() => chooseImageMode("business-card")}>
                    <span className="business-card-icon" aria-hidden="true" /><span><strong>My finished business card</strong><small>Use the whole image at our standard 300 × 180 size.</small></span>{form.imageMode === "business-card" ? <Check /> : null}
                  </button>
                </div>
              </fieldset>
            ) : null}
            <div className="safety-status" data-status={moderationStatus}>{moderationStatus === "checking" ? "Checking images and text for unsafe content…" : moderationError ?? "Images are checked for nudity and adult content before publishing."}</div>
            <fieldset className={form.imageMode === "business-card" ? "styles-disabled" : ""}>
              <legend>Card style</legend>
              {form.imageMode === "business-card" ? <p className="style-lock-note">Your finished design will be shown as the full card. Switch to “Picture in a WALL style” to choose a style.</p> : null}
              <div className="style-options" role="radiogroup" aria-label="Choose a card style">
                {themeOptions.map(({ theme, label, description }) => (
                  <button
                    type="button"
                    key={theme}
                    className={`style-option style-${theme} ${form.theme === theme ? "selected" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, theme }))}
                    disabled={form.imageMode === "business-card"}
                    role="radio"
                    aria-checked={form.theme === theme}
                  >
                    <span className="style-option-sample" aria-hidden="true"><i /><b /></span>
                    <span className="style-option-copy"><strong>{label}</strong><small>{description}</small></span>
                    {form.theme === theme ? <Check className="style-option-check" /> : null}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="preview-stage">
              <span>Live preview</span>
              <div className="preview-canvas">
                <LiveCardPreview form={form} image={previews[0]} />
              </div>
            </div>
          </div>
        ) : (
          <div className="composer-body payment-step">
            <section className="checkout-summary">
              <div>
                <span>Ready to post</span>
                <h3>{form.name || "Your card"}</h3>
                <p>{form.imageMode === "business-card" ? "Your business card" : themeOptions.find((option) => option.theme === form.theme)?.label} · {form.city}{form.state ? `, ${form.state}` : ""}</p>
              </div>
              <div className={`checkout-card-mark card-mark-${form.theme}`} aria-hidden="true"><i /><b /></div>
            </section>
            <fieldset>
              <legend>How long should your card stay up?</legend>
              <div className="payment-options" role="radiogroup" aria-label="Choose how long the card stays on the wall">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.paymentOption === option.value}
                    className={`payment-option ${form.paymentOption === option.value ? "selected" : ""} ${option.featured ? "featured" : ""} ${option.value === "bundle" ? "bundle" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, paymentOption: option.value }))}
                  >
                    {option.featured ? <span className="payment-popular">Most popular</span> : null}
                    {option.badge ? <span className="payment-badge">{option.badge}</span> : null}
                    <span className="payment-price">{option.price}</span>
                    <span className="payment-duration"><Clock3 /> {option.duration}</span>
                    <small>{option.description}</small>
                    <span className="payment-select">{form.paymentOption === option.value ? "Selected" : "Select"}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {form.paymentOption === "bundle" ? (
              <div className="bundle-picker">
                <div className="bundle-picker-header">
                  <h4>Choose 3 cities</h4>
                  <p>Your card will appear on each wall for 90 days. Country is required; state and city are optional.</p>
                </div>
                {bundleCities.map((slot, slotIndex) => {
                  const slotStates = slot.country ? State.getStatesOfCountry(slot.country) : [];
                  const slotCities = slot.country && slot.state ? City.getCitiesOfState(slot.country, slot.state) : [];
                  return (
                    <div key={slotIndex} className="bundle-city-slot">
                      <span className="bundle-slot-label">City {slotIndex + 1}</span>
                      <div className="bundle-slot-selects">
                        <select
                          value={slot.country}
                          onChange={(e) => {
                            const country = e.target.value;
                            setBundleCities((prev) => prev.map((c, i) => i === slotIndex ? { country, state: "", city: "" } : c));
                            setBundleCityError(null);
                          }}
                        >
                          <option value="">Country</option>
                          {countries.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                        </select>
                        <select
                          value={slot.state}
                          disabled={!slotStates.length}
                          onChange={(e) => {
                            const state = e.target.value;
                            setBundleCities((prev) => prev.map((c, i) => i === slotIndex ? { ...c, state, city: "" } : c));
                            setBundleCityError(null);
                          }}
                        >
                          <option value="">State / Region</option>
                          {slotStates.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                        </select>
                        <select
                          value={slot.city}
                          disabled={!slotCities.length}
                          onChange={(e) => {
                            setBundleCities((prev) => prev.map((c, i) => i === slotIndex ? { ...c, city: e.target.value } : c));
                            setBundleCityError(null);
                          }}
                        >
                          <option value="">City</option>
                          {slotCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {bundleCityError ? <small className="field-error" role="alert">{bundleCityError}</small> : null}
              </div>
            ) : null}
            {form.paymentOption !== "free" && form.paymentOption !== "bundle" ? (
              <label className="composer-auto-renew-row">
                <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
                <span>Auto-renew when it expires</span>
              </label>
            ) : null}
            <fieldset className="featured-tier-fieldset" style={form.paymentOption === "bundle" ? { display: "none" } : undefined}>
              <legend>Boost your listing <span>(optional)</span></legend>
              <div className="featured-tier-options" role="radiogroup" aria-label="Choose a featured tier">
                {featuredTierOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={form.featuredTier === option.value}
                    className={`featured-tier-option featured-tier-${option.value} ${form.featuredTier === option.value ? "selected" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, featuredTier: option.value }))}
                  >
                    <span className="featured-tier-header">
                      <strong>{option.label}</strong>
                      {option.price ? <span className="featured-tier-price">{option.price}</span> : null}
                    </span>
                    <ul className="featured-tier-perks">
                      {option.perks.map((perk) => <li key={perk}>{perk}</li>)}
                    </ul>
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="payment-note">Your selected duration stays with this card. You’ll choose its exact position on the wall next.</p>
          </div>
        )}
        <footer>
          <span>{step === 1 ? "Next, add the words and contact details." : step === 2 ? "Next, choose how long it stays." : "You’ll choose its spot next."}</span>
          <button className="primary" type="submit" disabled={moderationStatus === "checking"}>
            {moderationStatus === "checking" ? "Checking safety…" : step === 1 ? <>Add details <ArrowRight /></> : step === 2 ? <>Choose duration <ArrowRight /></> : <>Choose a spot <Sparkles /></>}
          </button>
        </footer>
      </form>
    </div>
  );
}
