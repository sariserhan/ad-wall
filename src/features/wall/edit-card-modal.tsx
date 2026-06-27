"use client";

import { RotateCcw, Save, X } from "lucide-react";
import { useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import { cardThemes, categories, getCardFormat, getImageCardFormat, SUBCATEGORY_OPTIONS, type CardTheme, type CardUpdate, type OwnerCard } from "./types";

const themeLabels: Record<CardTheme, string> = {
  yellow: "Sticky note", paper: "Flyer", pink: "Neon flyer", cyan: "Color card", dark: "Night card", cream: "Cream paper", biz: "Business card", kraft: "Kraft note", blueprint: "Blueprint", photo: "Photo print", ticket: "Ticket",
};

export function EditCardModal({ card, onClose, onSave }: { card: OwnerCard; onClose: () => void; onSave: (card: OwnerCard, update: CardUpdate) => Promise<void> }) {
  const [form, setForm] = useState<CardUpdate>(() => ({
    name: card.name,
    category: card.category,
    subcategory: card.subcategory,
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
    whatsapp: card.whatsapp,
    telegram: card.telegram,
    theme: card.theme,
    rotation: card.rotation,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tiltPointerRef = useRef<{ id: number; x: number; y: number; rotation: number } | null>(null);
  const previewImage = card.thumbnailImages?.[0] ?? card.images[0];
  const previewImageTopLayout = Boolean(previewImage && card.imageMode !== "business-card" && card.theme !== "biz" && card.theme !== "ticket");
  const format = card.imageMode === "business-card" ? getCardFormat("biz") : getImageCardFormat(form.theme, card.imageMode);

  const setField = <Key extends keyof CardUpdate>(field: Key, value: CardUpdate[Key]) => setForm((current) => ({ ...current, [field]: value }));

  const handleTiltPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    tiltPointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: form.rotation ?? 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTiltPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    const delta = (event.clientX - start.x) * 0.45 - (event.clientY - start.y) * 0.18;
    const next = Math.max(-90, Math.min(90, Math.round(start.rotation + delta)));
    setField("rotation", next);
  };

  const handleTiltPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const start = tiltPointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    tiltPointerRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
  };

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
          <div className="edit-card-preview">
            <article className={`wall-card edit-card-preview-card theme-${form.theme} ${previewImageTopLayout ? "image-top-layout" : ""} ${card.imageMode === "business-card" && previewImage ? "image-business-card" : ""}`} style={{ "--w": `${format.width}px`, "--h": `${format.minHeight}px`, "--r": `${form.rotation ?? 0}deg` } as CSSProperties}>
              <button
                type="button"
                className="wall-card-tilt-handle"
                onPointerDown={handleTiltPointerDown}
                onPointerMove={handleTiltPointerMove}
                onPointerUp={handleTiltPointerEnd}
                onPointerCancel={handleTiltPointerEnd}
                aria-label="Tilt preview card"
                title="Hold and drag to tilt"
              >
                <RotateCcw size={12} />
              </button>
              <span className="card-tape" aria-hidden="true" />
              {previewImageTopLayout ? (
                <>
                  <div className="wall-card-image-top-wrap">
                    <img src={previewImage} alt="" draggable={false} className="wall-card-image-top" />
                  </div>
                  <div className="wall-card-content">
                    <div className="card-copy">
                      <p className="card-category">{form.category}{form.subcategory ? <> · {form.subcategory}</> : null}</p>
                      <h2>{form.name || "Your card"}</h2>
                      <p className="card-line">{form.line || "Preview your card here."}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card-copy">
                  <p className="card-category">{form.category}{form.subcategory ? <> · {form.subcategory}</> : null}</p>
                  <h2>{form.name || "Your card"}</h2>
                  <p className="card-line">{form.line || "Preview your card here."}</p>
                </div>
              )}
              <footer>
                <span>{form.area || "Neighborhood"}</span>
                {form.price ? <strong className="card-price-right">{form.price}</strong> : null}
              </footer>
            </article>
            <small className="edit-card-preview-hint">Hold the corner icon and drag to tilt.</small>
          </div>
          <div className="form-grid">
            <label>Business or service<input required minLength={2} maxLength={60} value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
            <label>Category<select value={form.category} onChange={(event) => { setField("category", event.target.value as CardUpdate["category"]); setField("subcategory", undefined); }}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Subcategory<select required value={form.subcategory ?? ""} onChange={(event) => setField("subcategory", event.target.value || undefined)}><option value="" disabled>— Select a type —</option>{SUBCATEGORY_OPTIONS[form.category].map((sub) => <option key={sub} value={sub}>{sub}</option>)}</select></label>
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
          <fieldset><legend>Social media &amp; messaging <span>(optional)</span></legend><div className="form-grid"><label>Instagram<input maxLength={240} value={form.instagram ?? ""} onChange={(event) => setField("instagram", event.target.value || undefined)} /></label><label>Facebook<input maxLength={240} value={form.facebook ?? ""} onChange={(event) => setField("facebook", event.target.value || undefined)} /></label><label>TikTok<input maxLength={240} value={form.tiktok ?? ""} onChange={(event) => setField("tiktok", event.target.value || undefined)} /></label><label>LinkedIn<input maxLength={240} value={form.linkedin ?? ""} onChange={(event) => setField("linkedin", event.target.value || undefined)} /></label><label>WhatsApp<input type="tel" maxLength={30} value={form.whatsapp ?? ""} onChange={(event) => setField("whatsapp", event.target.value || undefined)} placeholder="+1 555 123 4567" /></label><label>Telegram<input maxLength={100} value={form.telegram ?? ""} onChange={(event) => setField("telegram", event.target.value || undefined)} placeholder="@yourusername" /></label></div></fieldset>
        </div>
        <footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}><Save /> {saving ? "Saving…" : "Save changes"}</button></footer>
      </form>
    </div>
  );
}
