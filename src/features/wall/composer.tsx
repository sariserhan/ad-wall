"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, ImagePlus, Sparkles, X } from "lucide-react";
import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { Country, State, City } from "country-state-city";
import { categories, type CardCategory, type CardDraft, type CardTheme } from "./types";

interface ComposerProps {
  onClose: () => void;
  onReady: (draft: CardDraft) => void;
  initialLocation?: { country: string; state: string; city: string };
}

interface ComposerForm {
  name: string;
  category: CardCategory;
  line: string;
  message: string;
  area: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  price: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  theme: CardTheme;
  paymentOption: "free" | "1" | "3" | "10" | "20";
}

const countries = Country.getAllCountries();
const defaultCountry = countries[0]?.isoCode ?? "US";
const defaultStates = State.getStatesOfCountry(defaultCountry);
const defaultState = defaultStates[0]?.isoCode ?? "";
const defaultCities = defaultState ? City.getCitiesOfState(defaultCountry, defaultState) : [];
const defaultCity = defaultCities[0]?.name ?? "";

const initialForm: ComposerForm = {
  name: "",
  category: "Services",
  line: "",
  message: "",
  area: "",
  city: defaultCity,
  state: defaultState,
  country: defaultCountry,
  zipcode: "",
  price: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  linkedin: "",
  theme: "yellow",
  paymentOption: "free",
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

const paymentOptions: ReadonlyArray<{ value: ComposerForm["paymentOption"]; price: string; duration: string; description: string; featured?: boolean }> = [
  { value: "free", price: "Free", duration: "1 day", description: "Try the wall with no commitment." },
  { value: "1", price: "$1", duration: "1 week", description: "Great for a quick local offer." },
  { value: "3", price: "$3", duration: "1 month", description: "Best for regular neighborhood services.", featured: true },
  { value: "10", price: "$10", duration: "5 months", description: "Stay visible through the season." },
  { value: "20", price: "$20", duration: "1 year", description: "A full year on your local wall." },
];

const stepLabels = ["Details", "Design", "Duration"] as const;
type ModerationMatch = { field: "name" | "line" | "message"; term: string; start: number; end: number };

export function Composer({ onClose, onReady, initialLocation }: ComposerProps) {
  const [form, setForm] = useState<ComposerForm>(() => {
    const baseCountry = initialLocation?.country ?? defaultCountry;
    const baseState = initialLocation?.state ?? defaultState;
    const baseCity = initialLocation?.city ?? defaultCity;
    const states = State.getStatesOfCountry(baseCountry);
    const state = states.some((s) => s.isoCode === baseState) ? baseState : states[0]?.isoCode ?? "";
    const cities = state ? City.getCitiesOfState(baseCountry, state) : [];
    const city = cities.some((c) => c.name === baseCity) ? baseCity : cities[0]?.name ?? "";
    return { ...initialForm, country: baseCountry, state, city };
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [contactError, setContactError] = useState<string | null>(null);
  const [moderationStatus, setModerationStatus] = useState<"idle" | "checking" | "passed" | "blocked">("idle");
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationMatches, setModerationMatches] = useState<ModerationMatch[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const moderationRequestRef = useRef<AbortController | null>(null);

  const validateContact = () => {
    const phoneInput = formRef.current?.elements.namedItem("phone") as HTMLInputElement | null;
    const emailInput = formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
    phoneInput?.setCustomValidity("");
    emailInput?.setCustomValidity("");
    if (form.phone.trim() || form.email.trim()) {
      setContactError(null);
      return true;
    }
    const error = "Add at least one contact method: phone or email.";
    phoneInput?.setCustomValidity(error);
    setContactError(error);
    phoneInput?.reportValidity();
    return false;
  };

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
      if (!formRef.current?.reportValidity() || !validateContact()) return;
      if (!await moderateDraft(false)) return;
    }
    if (step === 2 && targetStep === 3 && !await moderateDraft(true)) return;
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
    if (!form.phone.trim() && !form.email.trim()) return;
    const phoneInput = formRef.current?.elements.namedItem("phone") as HTMLInputElement | null;
    const emailInput = formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
    phoneInput?.setCustomValidity("");
    emailInput?.setCustomValidity("");
    setContactError(null);
  }, [form.phone, form.email]);

  const onImages = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 2);
    previews.forEach(URL.revokeObjectURL);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 3) {
      await goToStep(step + 1);
      return;
    }
    onReady({
      ...form,
      message: form.message.trim() || undefined,
      price: form.price.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      website: form.website.trim() || undefined,
      instagram: form.instagram.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      tiktok: form.tiktok.trim() || undefined,
      linkedin: form.linkedin.trim() || undefined,
      files,
      previews,
    });
  };

  return (
    <div className="composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form ref={formRef} className="composer" onSubmit={submit}>
        <header>
          <button type="button" className="icon-btn" onClick={step > 1 ? () => setStep((current) => current - 1) : onClose} aria-label={step > 1 ? "Back" : "Close"}>{step > 1 ? <ArrowLeft /> : <X />}</button>
          <div><span>{stepLabels[step - 1]}</span><small>POST A CARD · STEP {step} OF 3</small></div>
          <span className="step-count">0{step}</span>
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
        {step === 1 ? (
          <div className="composer-body">
            <label>Business or service<input name="name" required maxLength={60} autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="What should the wall call you?" /></label>
            <div className="form-grid">
              <label>Category<select value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value as CardCategory }))}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Posting on selected wall<input value={`${form.city}${form.state ? `, ${form.state}` : ""}${form.country ? `, ${form.country}` : ""}`} readOnly aria-readonly /></label>
            </div>
            <div className="form-grid">
              <label>Neighborhood<input maxLength={50} value={form.area} onChange={(event) => setForm((value) => ({ ...value, area: event.target.value }))} placeholder="Optional" /></label>
              <label>Zip code<input maxLength={20} value={form.zipcode} onChange={(event) => setForm((value) => ({ ...value, zipcode: event.target.value }))} placeholder="Optional" /></label>
            </div>
            <label>Subtitle<textarea name="line" required maxLength={90} value={form.line} onChange={(event) => setForm((value) => ({ ...value, line: event.target.value }))} placeholder="Short line shown on the card." /></label>
            <label>Message <span>(optional)</span><textarea name="message" maxLength={300} aria-describedby="message-safety" value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} placeholder="Longer details shown when someone opens the card." /><small id="message-safety" className="safety-hint">Messages are checked for adult and unsafe content before publishing.</small>{step === 1 && moderationError ? <small className="field-error" role="alert">{moderationError}</small> : null}{moderationMatches.length ? <span className="flagged-terms">Flagged: {moderationMatches.map((match) => <mark key={`${match.field}-${match.start}`}>{match.field}: {match.term}</mark>)}</span> : null}</label>
            <label>Price <span>(optional)</span><input maxLength={50} value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} placeholder="$25 / visit" /></label>
            <fieldset>
              <legend>How should people contact you?</legend>
              <div className="form-grid contact-fields">
                <label>Phone<input name="phone" type="tel" maxLength={30} pattern="[+()0-9.\s-]{7,30}" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} placeholder="(555) 123-4567" /></label>
                <label>Email<input name="email" type="email" maxLength={120} value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} placeholder="hello@example.com" /></label>
              </div>
              <small className={contactError ? "field-error" : "field-help"} role={contactError ? "alert" : undefined}>{contactError ?? "At least one phone number or email address is required."}</small>
              <label>Website<input type="url" maxLength={240} value={form.website} onChange={(event) => setForm((value) => ({ ...value, website: event.target.value }))} placeholder="https://example.com" /></label>
            </fieldset>
            <fieldset>
              <legend>Social media <span>(optional)</span></legend>
              <div className="form-grid social-fields">
                <label>Instagram<input maxLength={240} value={form.instagram} onChange={(event) => setForm((value) => ({ ...value, instagram: event.target.value }))} placeholder="@yourbusiness" /></label>
                <label>Facebook<input maxLength={240} value={form.facebook} onChange={(event) => setForm((value) => ({ ...value, facebook: event.target.value }))} placeholder="facebook.com/yourbusiness" /></label>
                <label>TikTok<input maxLength={240} value={form.tiktok} onChange={(event) => setForm((value) => ({ ...value, tiktok: event.target.value }))} placeholder="@yourbusiness" /></label>
                <label>LinkedIn<input maxLength={240} value={form.linkedin} onChange={(event) => setForm((value) => ({ ...value, linkedin: event.target.value }))} placeholder="linkedin.com/company/yourbusiness" /></label>
              </div>
            </fieldset>
          </div>
        ) : step === 2 ? (
          <div className="composer-body design-step">
            <label className="upload-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onImages} />
              {previews.length ? <div className="preview-row">{previews.map((src) => <img src={src} key={src} alt="Upload preview" />)}</div> : <><ImagePlus /><strong>Add 1 or 2 pictures</strong><span>JPG, PNG or WEBP · 8MB each</span></>}
            </label>
            <div className="safety-status" data-status={moderationStatus}>{moderationStatus === "checking" ? "Checking images and text for unsafe content…" : moderationError ?? "Images are checked for nudity and adult content before publishing."}</div>
            <fieldset>
              <legend>Card style</legend>
              <div className="style-options" role="radiogroup" aria-label="Choose a card style">
                {themeOptions.map(({ theme, label, description }) => (
                  <button
                    type="button"
                    key={theme}
                    className={`style-option style-${theme} ${form.theme === theme ? "selected" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, theme }))}
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
                <div className={`mini-preview theme-${form.theme}`}>
                  <i className="mini-preview-tape" aria-hidden="true" />
                  <span>{form.category}</span>
                  <strong>{form.name || "Your business"}</strong>
                  <p>{form.line || "Your offer goes here."}</p>
                  <small>{form.area || "Your neighborhood"}</small>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="composer-body payment-step">
            <section className="checkout-summary">
              <div>
                <span>Ready to post</span>
                <h3>{form.name || "Your card"}</h3>
                <p>{themeOptions.find((option) => option.theme === form.theme)?.label} · {form.city}{form.state ? `, ${form.state}` : ""}</p>
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
                    className={`payment-option ${form.paymentOption === option.value ? "selected" : ""} ${option.featured ? "featured" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, paymentOption: option.value }))}
                  >
                    {option.featured ? <span className="payment-popular">Most popular</span> : null}
                    <span className="payment-price">{option.price}</span>
                    <span className="payment-duration"><Clock3 /> {option.duration}</span>
                    <small>{option.description}</small>
                    <span className="payment-select">{form.paymentOption === option.value ? <><Check /> Selected</> : "Select"}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="payment-note">Your selected duration stays with this card. You’ll choose its exact position on the wall next.</p>
          </div>
        )}
        <footer>
          <span>{step === 1 ? "Next, make it look like yours." : step === 2 ? "Next, choose how long it stays." : "You’ll choose its spot next."}</span>
          <button className="primary" type="submit" disabled={moderationStatus === "checking"}>
            {moderationStatus === "checking" ? "Checking safety…" : step === 1 ? <>Design card <ArrowRight /></> : step === 2 ? <>Choose duration <ArrowRight /></> : <>Choose a spot <Sparkles /></>}
          </button>
        </footer>
      </form>
    </div>
  );
}
