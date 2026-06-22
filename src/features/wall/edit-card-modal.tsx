"use client";

import { Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cardThemes, categories, type CardTheme, type CardUpdate, type OwnerCard } from "./types";

const themeLabels: Record<CardTheme, string> = {
  yellow: "Sticky note", paper: "Flyer", pink: "Neon flyer", cyan: "Color card", dark: "Night card", cream: "Cream paper", biz: "Business card", kraft: "Kraft note", blueprint: "Blueprint", photo: "Photo print", ticket: "Ticket",
};

export function EditCardModal({ card, onClose, onSave }: { card: OwnerCard; onClose: () => void; onSave: (card: OwnerCard, update: CardUpdate) => Promise<void> }) {
  const [form, setForm] = useState<CardUpdate>(() => ({
    name: card.name,
    category: card.category,
    line: card.line,
    message: card.message,
    area: card.area,
    zipcode: card.zipcode,
    neighborhood: card.neighborhood,
    price: card.price,
    phone: card.phone,
    email: card.email,
    website: card.website,
    location: card.location,
    instagram: card.instagram,
    facebook: card.facebook,
    tiktok: card.tiktok,
    linkedin: card.linkedin,
    theme: card.theme,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <Key extends keyof CardUpdate>(field: Key, value: CardUpdate[Key]) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.phone?.trim() && !form.email?.trim()) {
      setError("Add at least one contact method: phone or email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const moderationBody = new FormData();
      moderationBody.set("name", form.name);
      moderationBody.set("line", form.line);
      moderationBody.set("message", form.message ?? "");
      const moderation = await fetch("/api/moderate", { method: "POST", body: moderationBody });
      const result = await moderation.json() as { safe?: boolean; error?: string };
      if (!moderation.ok || !result.safe) throw new Error(result.error ?? "This content did not pass the safety check.");
      await onSave(card, form);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-card-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="edit-card-modal" onSubmit={submit}>
        <header><div><span>OWNER TOOLS</span><h2>Edit card</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close editor"><X /></button></header>
        <div className="edit-card-body">
          {error ? <div className="dashboard-error" role="alert">{error}</div> : null}
          <div className="form-grid">
            <label>Business or service<input required minLength={2} maxLength={60} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
            <label>Category<select value={form.category} onChange={(event) => setField("category", event.target.value as CardUpdate["category"])}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          </div>
          <label>Subtitle<textarea required minLength={5} maxLength={90} value={form.line} onChange={(event) => setField("line", event.target.value)} /></label>
          <label>Message <span>(optional)</span><textarea maxLength={300} value={form.message ?? ""} onChange={(event) => setField("message", event.target.value || undefined)} /></label>
          <div className="form-grid">
            <label>Neighborhood<input required minLength={1} maxLength={50} value={form.area} onChange={(event) => setField("area", event.target.value)} /></label>
            <label>Zip code <span>(optional)</span><input maxLength={20} value={form.zipcode ?? ""} onChange={(event) => setField("zipcode", event.target.value || undefined)} /></label>
            <label>Sub-neighborhood <span>(optional)</span><input maxLength={50} value={form.neighborhood ?? ""} onChange={(event) => setField("neighborhood", event.target.value || undefined)} /></label>
          </div>
          <div className="form-grid">
            <label>Price <span>(optional)</span><input maxLength={50} value={form.price ?? ""} onChange={(event) => setField("price", event.target.value || undefined)} /></label>
            <label>Card style<select value={form.theme} onChange={(event) => setField("theme", event.target.value as CardTheme)}>{cardThemes.map((theme) => <option key={theme} value={theme}>{themeLabels[theme]}</option>)}</select></label>
          </div>
          <fieldset><legend>Contact</legend><div className="form-grid"><label>Phone<input type="tel" maxLength={30} value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value || undefined)} /></label><label>Email<input type="email" maxLength={120} value={form.email ?? ""} onChange={(event) => setField("email", event.target.value || undefined)} /></label></div><label>Website <span>(optional)</span><input inputMode="url" maxLength={240} value={form.website ?? ""} onChange={(event) => setField("website", event.target.value || undefined)} /></label><label>Google Maps location <span>(optional)</span><input maxLength={300} value={form.location ?? ""} onChange={(event) => setField("location", event.target.value || undefined)} /></label></fieldset>
          <fieldset><legend>Social media <span>(optional)</span></legend><div className="form-grid"><label>Instagram<input maxLength={240} value={form.instagram ?? ""} onChange={(event) => setField("instagram", event.target.value || undefined)} /></label><label>Facebook<input maxLength={240} value={form.facebook ?? ""} onChange={(event) => setField("facebook", event.target.value || undefined)} /></label><label>TikTok<input maxLength={240} value={form.tiktok ?? ""} onChange={(event) => setField("tiktok", event.target.value || undefined)} /></label><label>LinkedIn<input maxLength={240} value={form.linkedin ?? ""} onChange={(event) => setField("linkedin", event.target.value || undefined)} /></label></div></fieldset>
        </div>
        <footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}><Save /> {saving ? "Saving…" : "Save changes"}</button></footer>
      </form>
    </div>
  );
}
