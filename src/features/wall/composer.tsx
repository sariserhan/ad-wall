"use client";

import { ArrowLeft, Check, ImagePlus, Sparkles, X } from "lucide-react";
import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
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

  useEffect(() => {
    if (!initialLocation) return;
    const country = initialLocation.country;
    const states = State.getStatesOfCountry(country);
    const state = states.some((s) => s.isoCode === initialLocation.state) ? initialLocation.state : states[0]?.isoCode ?? "";
    const cities = state ? City.getCitiesOfState(country, state) : [];
    const city = cities.some((c) => c.name === initialLocation.city) ? initialLocation.city : cities[0]?.name ?? "";
    setForm((value) => ({ ...value, country, state, city }));
  }, [initialLocation]);

  const onImages = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 2);
    previews.forEach(URL.revokeObjectURL);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    onReady({ ...form, message: form.message.trim() || undefined, price: form.price || undefined, files, previews });
  };

  return (
    <div className="composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="composer" onSubmit={submit}>
        <header>
          <button type="button" className="icon-btn" onClick={step === 2 ? () => setStep(1) : onClose} aria-label={step === 2 ? "Back" : "Close"}>{step === 2 ? <ArrowLeft /> : <X />}</button>
          <div><span>POST A CARD</span><small>STEP {step} OF 2</small></div>
          <span className="step-count">0{step}</span>
        </header>
        {step === 1 ? (
          <div className="composer-body">
            <label>Business or service<input required autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="What should the wall call you?" /></label>
            <div className="form-grid">
              <label>Category<select value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value as CardCategory }))}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Posting on selected wall<input value={`${form.city}${form.state ? `, ${form.state}` : ""}${form.country ? `, ${form.country}` : ""}`} readOnly aria-readonly /></label>
            </div>
            <div className="form-grid">
              <label>Neighborhood<input value={form.area} onChange={(event) => setForm((value) => ({ ...value, area: event.target.value }))} placeholder="Optional" /></label>
              <label>Zip code<input value={form.zipcode} onChange={(event) => setForm((value) => ({ ...value, zipcode: event.target.value }))} placeholder="Optional" /></label>
            </div>
            <label>Subtitle<textarea required maxLength={90} value={form.line} onChange={(event) => setForm((value) => ({ ...value, line: event.target.value }))} placeholder="Short line shown on the card." /></label>
            <label>Message <span>(optional)</span><textarea maxLength={300} value={form.message} onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))} placeholder="Longer details shown when someone opens the card." /></label>
            <label>Price <span>(optional)</span><input value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} placeholder="$25 / visit" /></label>
            <fieldset>
              <legend>Keep your card on the wall</legend>
              <div className="payment-options" role="group" aria-label="Choose how long the card stays on the wall">
                {[
                  { value: "free", label: "Free — 1 day" },
                  { value: "1", label: "$1 — 1 week" },
                  { value: "3", label: "$3 — 1 month" },
                  { value: "10", label: "$10 — 5 months" },
                  { value: "20", label: "$20 — 1 year" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={form.paymentOption === option.value}
                    className={`payment-option ${form.paymentOption === option.value ? "selected" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, paymentOption: option.value as ComposerForm["paymentOption"] }))}
                  >
                    <span>{option.label}</span>
                    {/* <span className="payment-tag">{form.paymentOption === option.value ? "Selected" : "Select1"}</span> */}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="composer-body design-step">
            <label className="upload-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onImages} />
              {previews.length ? <div className="preview-row">{previews.map((src) => <img src={src} key={src} alt="Upload preview" />)}</div> : <><ImagePlus /><strong>Add 1 or 2 pictures</strong><span>JPG, PNG or WEBP · 8MB each</span></>}
            </label>
            <fieldset>
              <legend>Card style</legend>
              <div className="style-options" role="radiogroup" aria-label="Choose a card style">
                {themeOptions.map(({ theme, label, description }) => (
                  <button
                    type="button"
                    key={theme}
                    className={`style-option theme-${theme} ${form.theme === theme ? "selected" : ""}`}
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
              <div className={`mini-preview theme-${form.theme}`}>
                <i className="mini-preview-tape" aria-hidden="true" />
                <span>{form.category}</span>
                <strong>{form.name || "Your business"}</strong>
                <p>{form.line || "Your offer goes here."}</p>
                <small>{form.area || "Your neighborhood"}</small>
              </div>
            </div>
          </div>
        )}
        <footer><span>You’ll choose its spot next.</span><button className="primary" type="submit">{step === 1 ? "Design card" : "Choose a spot"} <Sparkles /></button></footer>
      </form>
    </div>
  );
}
