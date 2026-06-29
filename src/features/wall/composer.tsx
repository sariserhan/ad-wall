"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, ImagePlus, MapPin, Sparkles, Trash2, X } from "lucide-react";
import { useState, useEffect, useRef, type ChangeEvent, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import { Country, State, City } from "country-state-city";
import { categories, SUBCATEGORY_OPTIONS, getCardFormat, type CardCategory, type CardDraft, type CardImageMode, type CardTheme } from "./types";
import { ImageSwapViewer } from "./image-compare-slider";

interface ComposerProps {
  onClose: () => void;
  onReady: (draft: CardDraft) => void;
  initialLocation?: { country: string; state: string; city: string };
  isVerified?: boolean;
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
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  backImageX: number;
  backImageY: number;
  backImageScale: number;
  rotation: number;
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
  imageX: 50,
  imageY: 35,
  imageWidth: 90,
  imageHeight: 156,
  backImageX: 50,
  backImageY: 35,
  backImageScale: 1,
  rotation: 0,
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
const DRAFT_BACK_IMAGES_KEY = "draft-back";

function openImagesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRAFT_IMAGES_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DRAFT_IMAGES_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImagesToIDB(key: string, blobs: Blob[]): Promise<void> {
  try {
    const db = await openImagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readwrite");
      tx.objectStore(DRAFT_IMAGES_STORE).put(blobs, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* storage unavailable */ }
}

async function loadImagesFromIDB(key: string): Promise<Blob[] | null> {
  try {
    const db = await openImagesDB();
    const blobs = await new Promise<Blob[] | null>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readonly");
      const req = tx.objectStore(DRAFT_IMAGES_STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob[]) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blobs;
  } catch { return null; }
}

async function clearImagesFromIDB(key: string): Promise<void> {
  try {
    const db = await openImagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_IMAGES_STORE, "readwrite");
      tx.objectStore(DRAFT_IMAGES_STORE).delete(key);
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

async function bakeImageCrop(file: File, frameWidth: number, frameHeight: number, objectX: number, objectY: number, scale = 1): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new window.Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Could not load the image."));
      node.src = url;
    });
    const naturalWidth = image.naturalWidth || frameWidth;
    const naturalHeight = image.naturalHeight || frameHeight;
    const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight) * Math.max(scale, 0.01);
    const drawWidth = naturalWidth * coverScale;
    const drawHeight = naturalHeight * coverScale;
    const offsetX = -(drawWidth - frameWidth) * (objectX / 100);
    const offsetY = -(drawHeight - frameHeight) * (objectY / 100);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(frameWidth));
    canvas.height = Math.max(1, Math.round(frameHeight));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not process the image."));
          return;
        }
        resolve(result);
      }, "image/png");
    });
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-cropped.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function LiveCardPreview({
  form,
  image,
  onImageHeightChange,
  onImagePanChange,
  isVerified,
}: {
  form: ComposerForm;
  image?: string;
  onImageHeightChange?: (height: number) => void;
  onImagePanChange?: (x: number, y: number) => void;
  isVerified?: boolean;
}) {
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);
  const panRef = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const format = getCardFormat(form.theme);
  const previewWidth = format.width;
  const location = form.area.trim() || [form.city.trim(), form.state.trim(), form.country.trim()].filter(Boolean).join(", ") || "Selected wall";
  const imageTopLayout = Boolean(image && form.imageMode !== "business-card" && form.theme !== "biz" && form.theme !== "ticket");
  const categoryLabel = form.category ? `${form.category}${form.subcategory ? ` · ${form.subcategory}` : ""}` : "Category";
  const messageLabel = form.message.trim() || "Your message";
  const priceLabel = form.price.trim() || "Your price";

  const handlePanPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (!imageTopLayout || !image || !onImagePanChange) return;
    event.stopPropagation();
    event.preventDefault();
    panRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: form.imageX, originY: form.imageY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const start = panRef.current;
    if (!start || start.id !== event.pointerId || !imageTopLayout || !image || !onImagePanChange) return;
    const nextX = Math.max(0, Math.min(100, Number((start.originX + ((event.clientX - start.x) / 4)).toFixed(1))));
    const nextY = Math.max(0, Math.min(100, Number((start.originY + ((event.clientY - start.y) / 4)).toFixed(1))));
    onImagePanChange(nextX, nextY);
  };

  const handlePanPointerEnd = (event: PointerEvent<HTMLImageElement>) => {
    const start = panRef.current;
    if (!start || start.id !== event.pointerId) return;
    panRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
  };

  if (form.imageMode === "business-card" && image) {
    return (
      <div className="composer-biz-preview" style={{ "--tape-w": "62px", "--tape-r": "-2deg", "--tape-l": "38%" } as CSSProperties} aria-label="Live card preview">
        <span className="card-tape" aria-hidden="true" />
        <img src={image} alt="" draggable={false} className="composer-biz-img" />
      </div>
    );
  }

  const style = { "--w": `${previewWidth}px`, "--h": `${format.minHeight}px`, "--r": `${form.rotation}deg`, "--x": "0", "--y": "0" } as CSSProperties;
  return (
    <article className={`wall-card composer-live-card theme-${form.theme} ${imageTopLayout ? "image-top-layout" : ""}`} style={style} aria-label="Live card preview">
      <span className="card-tape" aria-hidden="true" />
      {imageTopLayout ? (
        <>
          <div className="wall-card-image-top-wrap">
            <img
              src={image}
              alt=""
              draggable={false}
              className="wall-card-image-top"
              style={{ "--image-h": `${form.imageHeight}px`, objectPosition: `${form.imageX}% ${form.imageY}%` } as CSSProperties}
              onPointerDown={handlePanPointerDown}
              onPointerMove={handlePanPointerMove}
              onPointerUp={handlePanPointerEnd}
              onPointerCancel={handlePanPointerEnd}
            />
            {onImageHeightChange ? (
              <div
                className="img-resize-handle"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  resizeRef.current = { startY: e.clientY, startH: form.imageHeight };
                }}
                onPointerMove={(e) => {
                  if (!resizeRef.current) return;
                  const nextHeight = Math.max(120, Math.min(360, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)));
                  onImageHeightChange(nextHeight);
                }}
                onPointerUp={() => { resizeRef.current = null; }}
                onPointerCancel={() => { resizeRef.current = null; }}
              />
            ) : null}
          </div>
          <div className="wall-card-content">
            <div className="card-copy">
              <p className={`card-category ${form.category ? "" : "composer-preview-placeholder"}`.trim()}>{categoryLabel}</p>
              {isVerified ? <span className="verified-badge" aria-label="Verified business">✓ Verified</span> : null}
              <h2 className={`${form.name ? "" : "composer-preview-placeholder"}`.trim()}>{form.name || "Your business"}</h2>
              <p className={`card-line ${form.line ? "" : "composer-preview-placeholder"}`.trim()}>{form.line || "Your offer goes here."}</p>
              <p className={`composer-preview-message ${form.message.trim() ? "" : "composer-preview-placeholder"}`.trim()}>{messageLabel}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="card-copy">
          <p className={`card-category ${form.category ? "" : "composer-preview-placeholder"}`.trim()}>{categoryLabel}</p>
          {isVerified ? <span className="verified-badge" aria-label="Verified business">✓ Verified</span> : null}
          <h2 className={`${form.name ? "" : "composer-preview-placeholder"}`.trim()}>{form.name || "Your business"}</h2>
          <p className={`card-line ${form.line ? "" : "composer-preview-placeholder"}`.trim()}>{form.line || "Your offer goes here."}</p>
          <p className={`composer-preview-message ${form.message.trim() ? "" : "composer-preview-placeholder"}`.trim()}>{messageLabel}</p>
        </div>
      )}
      <footer>
        <span>{location}</span>
        <strong className={`card-price-right ${form.price ? "" : "card-price-placeholder"}`.trim()}>{priceLabel}</strong>
      </footer>
    </article>
  );
}

function ExpandedCardPreview({ form, image, backImage, isVerified }: { form: ComposerForm; image?: string; backImage?: string; isVerified?: boolean }) {
  const location = form.area.trim() || [form.city.trim(), form.state.trim(), form.country.trim()].filter(Boolean).join(", ") || "Selected wall";
  const backLayout = form.theme === "photo" ? "photo" : "full";
  const categoryLabel = form.category ? `${form.category}${form.subcategory ? ` · ${form.subcategory}` : ""}` : "Category";
  const titleLabel = form.name.trim() || "Your business";
  const lineLabel = form.line.trim() || "Your offer goes here.";
  const messageLabel = form.message.trim() || "Your message will appear here.";
  const priceLabel = form.price.trim() || "Starting at your price";
  const phoneLabel = form.phone.trim() || "Phone";
  const emailLabel = form.email.trim() || "Email";
  const websiteLabel = form.website.trim() || "Website";
  const socialLabels = [
    { label: form.instagram.trim() || "Instagram", value: form.instagram.trim() },
    { label: form.facebook.trim() || "Facebook", value: form.facebook.trim() },
    { label: form.tiktok.trim() || "TikTok", value: form.tiktok.trim() },
    { label: form.linkedin.trim() || "LinkedIn", value: form.linkedin.trim() },
  ];
  const actionLabels = [
    { label: "Save", value: false },
    { label: "Like", value: false },
  ];
  const secondaryActionLabels = [
    { label: "Share", value: false },
    { label: "QR Code", value: false },
    { label: "Report", value: false },
  ];

  return (
    <section className="details-expanded-preview" aria-label="Expanded card preview">
      <article className={`details-expanded-card ${image || backImage ? "image-top-layout" : ""}`}>
        {image || backImage ? (
          <ImageSwapViewer
            frontSrc={image}
            backSrc={backImage}
            frontAlt="Expanded card front image"
            backAlt="Expanded card back image"
            className="details-expanded-image-wrap"
            layout={backLayout}
          />
        ) : null}
        <div className="details-expanded-copy">
          <p className="sheet-category">{categoryLabel}</p>
          {isVerified ? <span className="sheet-verified" aria-label="Verified business">✓ Verified</span> : null}
          <h2>{titleLabel}</h2>
          <div className="rule" />
          <p className="sheet-service">{lineLabel}</p>
          <div className="note-copy">{messageLabel}</div>
          <div className="sheet-price">Starting at <strong>{priceLabel}</strong></div>
          <div className="preview-contact-actions" aria-hidden="true">
            <button type="button" className="preview-contact-pill">{phoneLabel}</button>
            <button type="button" className="preview-contact-pill">{emailLabel}</button>
            <button type="button" className="preview-contact-pill">{websiteLabel}</button>
          </div>
          <div className="detail-card-actions detail-card-actions-preview" aria-hidden="true">
            {actionLabels.map((item) => (
              <button key={item.label} type="button" className={`secondary ${item.value ? "is-saved" : ""}`}>{item.label}</button>
            ))}
          </div>
          <div className="detail-secondary-actions detail-secondary-actions-preview" aria-hidden="true">
            {secondaryActionLabels.map((item) => (
              <button key={item.label} type="button" className="secondary">{item.label}</button>
            ))}
          </div>
          <div className="details-expanded-socials" aria-hidden="true">
            {socialLabels.map((item) => (
              <span key={item.label} className={`details-expanded-social-pill${item.value ? " has-value" : ""}`}>{item.label}</span>
            ))}
          </div>
          <div className="sheet-meta"><span>{location}</span><span>CARD #PREVIEW</span></div>
        </div>
      </article>
    </section>
  );
}

function BackCardPreview({
  form,
  image,
  matchHeight,
  imageScale = 1,
  isVerified,
  onImageScaleChange,
  onImagePanChange,
}: {
  form: ComposerForm;
  image?: string;
  matchHeight?: number;
  imageScale?: number;
  isVerified?: boolean;
  onImageScaleChange?: (scale: number) => void;
  onImagePanChange?: (x: number, y: number) => void;
}) {
  const format = getCardFormat(form.theme);
  const backLayout = form.theme === "photo" ? "photo" : "full";
  const zoomRef = useRef<{ id: number; y: number; scale: number } | null>(null);
  const panRef = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);

  const handleZoomPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onImageScaleChange || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    zoomRef.current = { id: event.pointerId, y: event.clientY, scale: imageScale };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleZoomPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = zoomRef.current;
    if (!start || start.id !== event.pointerId || !onImageScaleChange) return;
    const next = Math.max(0.75, Math.min(1.8, Number((start.scale + ((start.y - event.clientY) * 0.006)).toFixed(2))));
    onImageScaleChange(next);
  };

  const handleZoomPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const start = zoomRef.current;
    if (!start || start.id !== event.pointerId) return;
    zoomRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
  };

  const handlePanPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (!image || !onImagePanChange) return;
    event.stopPropagation();
    event.preventDefault();
    panRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: form.backImageX, originY: form.backImageY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const start = panRef.current;
    if (!start || start.id !== event.pointerId || !image || !onImagePanChange) return;
    const nextX = Math.max(0, Math.min(100, Number((start.originX + ((event.clientX - start.x) / 4)).toFixed(1))));
    const nextY = Math.max(0, Math.min(100, Number((start.originY + ((event.clientY - start.y) / 4)).toFixed(1))));
    onImagePanChange(nextX, nextY);
  };

  const handlePanPointerEnd = (event: PointerEvent<HTMLImageElement>) => {
    const start = panRef.current;
    if (!start || start.id !== event.pointerId) return;
    panRef.current = null;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer already released by browser */ }
  };

  return (
    <article
      className={`wall-card composer-live-card details-back-card theme-${form.theme} image-top-layout`}
      style={{
        "--w": `${format.width}px`,
        "--back-scale": String(imageScale),
        "--image-h": `${form.imageHeight}px`,
        width: `${format.width}px`,
        height: matchHeight ? `${matchHeight}px` : undefined,
        minHeight: matchHeight ? `${matchHeight}px` : undefined,
      } as CSSProperties}
      aria-label="Back card preview"
    >
      <span className="card-tape" aria-hidden="true" />
      <div className="details-back-frame">
        {image ? (
          <div className={`details-back-art backside-art layout-${backLayout}`}>
            <img
              src={image}
              alt=""
              draggable={false}
              className="details-back-image"
              style={{ transform: "scale(var(--back-scale, 1))", objectPosition: `${form.backImageX}% ${form.backImageY}%` } as CSSProperties}
              onPointerDown={handlePanPointerDown}
              onPointerMove={handlePanPointerMove}
              onPointerUp={handlePanPointerEnd}
              onPointerCancel={handlePanPointerEnd}
            />
          </div>
        ) : (
          <div className="details-back-empty" aria-hidden="true" />
        )}
        {image && onImageScaleChange ? (
          <div
            className="img-resize-handle details-back-zoom-handle"
            onPointerDown={handleZoomPointerDown}
            onPointerMove={handleZoomPointerMove}
            onPointerUp={handleZoomPointerEnd}
            onPointerCancel={handleZoomPointerEnd}
            aria-label="Zoom back image"
            title="Drag to zoom back image"
          />
        ) : null}
      </div>
    </article>
  );
}

function CardSidesPreview({
  form,
  frontImage,
  backImage,
  backImageScale,
  isVerified,
  mode,
  stacked = false,
  onFrontImageHeightChange,
  onFrontImagePanChange,
  onBackImageScaleChange,
  onBackImagePanChange,
}: {
  form: ComposerForm;
  frontImage?: string;
  backImage?: string;
  backImageScale?: number;
  isVerified?: boolean;
  mode: "live" | "expanded";
  stacked?: boolean;
  onFrontImageHeightChange?: (height: number) => void;
  onFrontImagePanChange?: (x: number, y: number) => void;
  onBackImageScaleChange?: (scale: number) => void;
  onBackImagePanChange?: (x: number, y: number) => void;
}) {
  const frontCanvasRef = useRef<HTMLDivElement | null>(null);
  const [matchedFrontHeight, setMatchedFrontHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const node = frontCanvasRef.current;
    if (!node) return;
    const update = () => {
      const next = Math.ceil(node.getBoundingClientRect().height);
      setMatchedFrontHeight((current) => (current === next ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [form.theme, form.imageMode, form.imageHeight, form.rotation, form.name, form.line, form.message, form.price, form.category, form.subcategory, form.area, form.city, form.state, form.country, form.zipcode, frontImage, mode, isVerified]);

  return (
    <div className={`card-sides-preview${stacked ? " is-stacked" : ""}`}>
      <div className="card-side-preview">
        <span>Front Card</span>
        <div className="card-side-preview-canvas" ref={frontCanvasRef}>
          {mode === "live" ? (
            <LiveCardPreview
              form={form}
              image={frontImage}
              onImageHeightChange={onFrontImageHeightChange}
              onImagePanChange={onFrontImagePanChange}
              isVerified={isVerified}
            />
          ) : (
            <ExpandedCardPreview form={form} image={frontImage} backImage={backImage} isVerified={isVerified} />
          )}
        </div>
      </div>
      <div className="card-side-divider" aria-hidden="true" />
      <div className="card-side-preview">
        <span>Back Card</span>
        <div className="card-side-preview-canvas">
          <BackCardPreview
            form={form}
            image={backImage}
            matchHeight={matchedFrontHeight}
            imageScale={backImageScale}
            isVerified={isVerified}
            onImageScaleChange={onBackImageScaleChange}
            onImagePanChange={onBackImagePanChange}
          />
        </div>
      </div>
    </div>
  );
}

export function Composer({ onClose, onReady, initialLocation, isVerified = false }: ComposerProps) {
  const [form, setForm] = useState<ComposerForm>(() => {
    const baseCountry = initialLocation?.country ?? defaultCountry;
    const baseState = initialLocation ? (initialLocation.state ?? "") : defaultState;
    const baseCity = initialLocation ? (initialLocation.city ?? "") : defaultCity;
    const states = State.getStatesOfCountry(baseCountry);
    const state = baseState && states.some((s) => s.isoCode === baseState) ? baseState : (initialLocation ? "" : states[0]?.isoCode ?? "");
    const cities = state ? City.getCitiesOfState(baseCountry, state) : [];
    const city = baseCity && cities.some((c) => c.name === baseCity) ? baseCity : (initialLocation ? "" : cities[0]?.name ?? "");
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backFiles, setBackFiles] = useState<File[]>([]);
  const [backPreviews, setBackPreviews] = useState<string[]>([]);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const [backImageScale, setBackImageScale] = useState(() => form.backImageScale ?? 1);
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
    const state = initialLocation.state && states.some((s) => s.isoCode === initialLocation.state) ? initialLocation.state : "";
    const cities = state ? City.getCitiesOfState(country, state) : [];
    const city = initialLocation.city && cities.some((c) => c.name === initialLocation.city) ? initialLocation.city : "";
    setForm((value) => ({ ...value, country, state, city }));
  }, [initialLocation]);

  useEffect(() => {
    if (step !== 2) return;
    window.requestAnimationFrame(() => {
      formRef.current?.scrollTo({ top: 0, left: 0 });
    });
  }, [step]);

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
    void loadImagesFromIDB(DRAFT_IMAGES_KEY).then((blobs) => {
      if (!blobs?.length) return;
      const restored = blobs.map((blob, i) => new File([blob], `draft-${i}.${blob.type.split("/")[1] ?? "jpg"}`, { type: blob.type }));
      setFiles(restored);
      setPreviews(restored.map((f) => URL.createObjectURL(f)));
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void saveImagesToIDB(DRAFT_IMAGES_KEY, files); }, 500);
    return () => window.clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    void loadImagesFromIDB(DRAFT_BACK_IMAGES_KEY).then((blobs) => {
      if (!blobs?.length) return;
      const restored = blobs.map((blob, i) => new File([blob], `draft-back-${i}.${blob.type.split("/")[1] ?? "jpg"}`, { type: blob.type }));
      setBackFiles(restored);
      setBackPreviews(restored.map((f) => URL.createObjectURL(f)));
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void saveImagesToIDB(DRAFT_BACK_IMAGES_KEY, backFiles); }, 500);
    return () => window.clearTimeout(timer);
  }, [backFiles]);

  useEffect(() => {
    if (form.theme !== "biz" && form.theme !== "ticket") return;
    if (!files.length) return;
    previews.forEach(URL.revokeObjectURL);
    setFiles([]);
    setPreviews([]);
    setForm((value) => ({ ...value, imageMode: "photo", imageHeight: 156, imageX: 50, imageY: 35 }));
  }, [form.theme, files.length, previews]);

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
    if (!nextFiles.length) setForm((value) => ({ ...value, imageMode: "photo", imageHeight: 156, imageX: 50, imageY: 35 }));
    else setForm((value) => ({ ...value, imageHeight: 156, imageX: 50, imageY: 35 }));
    event.currentTarget.value = "";
  };

  const onBackImages = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 1);
    backPreviews.forEach(URL.revokeObjectURL);
    setBackFiles(nextFiles);
    setBackPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    setBackImageScale(1);
    setForm((value) => ({ ...value, backImageX: 50, backImageY: 35, backImageScale: 1 }));
    event.currentTarget.value = "";
  };

  const clearImages = () => {
    previews.forEach(URL.revokeObjectURL);
    setFiles([]);
    setPreviews([]);
    setForm((value) => ({ ...value, imageMode: "photo", imageHeight: 156, imageX: 50, imageY: 35 }));
    fileInputRef.current?.value && (fileInputRef.current.value = "");
    void clearImagesFromIDB(DRAFT_IMAGES_KEY);
  };

  const clearBackImages = () => {
    backPreviews.forEach(URL.revokeObjectURL);
    setBackFiles([]);
    setBackPreviews([]);
    setBackImageScale(1);
    setForm((value) => ({ ...value, backImageX: 50, backImageY: 35, backImageScale: 1 }));
    backFileInputRef.current?.value && (backFileInputRef.current.value = "");
    void clearImagesFromIDB(DRAFT_BACK_IMAGES_KEY);
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
    const backFrame = getCardFormat(form.theme);
    const bakedBackFiles = backFiles[0]
      ? [await bakeImageCrop(backFiles[0], backFrame.width, backFrame.minHeight, form.backImageX, form.backImageY, form.backImageScale)]
      : [];
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
      rotation: form.rotation,
      autoRenew: autoRenew && form.paymentOption !== "free" && form.paymentOption !== "bundle",
      bundleCities: form.paymentOption === "bundle" ? bundleCities : undefined,
      files,
      previews,
      backFiles: bakedBackFiles,
      backPreviews,
    });
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* storage unavailable */ }
    void clearImagesFromIDB(DRAFT_IMAGES_KEY);
    void clearImagesFromIDB(DRAFT_BACK_IMAGES_KEY);
  };

  const canUseFrontImages = form.theme !== "biz" && form.theme !== "ticket";

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
              <div className="details-wall-location">
                <MapPin size={13} aria-hidden="true" />
                <div>
                  <span className="details-wall-location-label">Posting on</span>
                  <strong className="details-wall-location-name">
                    {[form.city, form.state, form.country].filter(Boolean).join(", ") || "Selected wall"}
                  </strong>
                </div>
              </div>
              <span><small>Updates as you type</small></span>
              <div className="details-expanded-preview">
                <span>Expanded card</span>
                <div className="details-expanded-canvas">
                  <ExpandedCardPreview form={form} image={previews[0]} backImage={backPreviews[0]} isVerified={isVerified} />
                </div>
              </div>
              <div className="details-preview-divider" aria-hidden="true" />
              <div className="details-preview-block">
                <span>Front and back card</span>
                <div className="details-preview-canvas">
                  <CardSidesPreview
                  stacked
                  form={form}
                  frontImage={previews[0]}
                  backImage={backPreviews[0]}
                  backImageScale={backImageScale}
                  isVerified={isVerified}
                  mode="live"
                  onFrontImageHeightChange={(height) => setForm((value) => ({ ...value, imageHeight: height }))}
                  onFrontImagePanChange={(x, y) => setForm((value) => ({ ...value, imageX: x, imageY: y }))}
                  onBackImageScaleChange={backPreviews[0] ? (scale) => { setBackImageScale(scale); setForm((value) => ({ ...value, backImageScale: scale })); } : undefined}
                  onBackImagePanChange={(x, y) => setForm((value) => ({ ...value, backImageX: x, backImageY: y }))}
                />
                </div>
              </div>
            </aside>
          </div>
        ) : step === 1 ? (
          <div className="composer-body design-step">
            <div className="upload-grid">
              {canUseFrontImages ? (
                <div className="upload-zone-wrap">
                  <span className="upload-zone-label">Front image</span>
                  <label className="upload-zone">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onImages} />
                    {previews.length ? <div className="preview-row">{previews.map((src) => <img src={src} key={src} alt="Front upload preview" />)}</div> : <><ImagePlus /><strong>Upload front image</strong><span>JPG, PNG or WEBP · 8MB each</span></>}
                  </label>
                  {previews.length ? (
                    <button type="button" className="upload-zone-clear" onClick={clearImages} aria-label="Delete front image">
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="upload-zone-wrap upload-zone-locked">
                  <span className="upload-zone-label">Front image</span>
                  <div className="upload-zone upload-zone-disabled">
                    <ImagePlus />
                    <strong>Front image is disabled for this card type</strong>
                    <span>Biz and ticket cards use the back image only.</span>
                  </div>
                </div>
              )}
              <div className="upload-zone-wrap">
                <span className="upload-zone-label">Back image</span>
                <label className="upload-zone upload-zone-back">
                  <input ref={backFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onBackImages} />
                  {backPreviews.length ? <div className="preview-row">{backPreviews.map((src) => <img src={src} key={src} alt="Back upload preview" />)}</div> : <><ImagePlus /><strong>Upload back image</strong><span>Shown when the card flips</span></>}
                </label>
                {backPreviews.length ? (
                  <button type="button" className="upload-zone-clear" onClick={clearBackImages} aria-label="Delete back image">
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
              {previews.length ? (
                <fieldset className="image-use-picker upload-grid-actions">
                  <div role="radiogroup" aria-label="Choose how to display the uploaded image">
                    <button type="button" role="radio" aria-checked={form.imageMode === "photo"} className={form.imageMode === "photo" ? "selected" : ""} onClick={() => chooseImageMode("photo")}>
                      <ImagePlus /><span><strong>Place image in a card template</strong><small>Choose this if your upload is just a photo, logo, artwork, or picture. You’ll pick a card style below, and place your image into that design.</small></span>{form.imageMode === "photo" ? <Check /> : null}
                    </button>
                    <button type="button" role="radio" aria-checked={form.imageMode === "business-card"} className={form.imageMode === "business-card" ? "selected" : ""} onClick={() => chooseImageMode("business-card")}>
                      <span className="business-card-icon" aria-hidden="true" /><span><strong>My upload is already the card</strong><small>Choose this if your upload is already a complete business card, flyer, ID-style card, or finished design. We’ll use the full image exactly as the card, so you won’t need to choose a style below.</small></span>{form.imageMode === "business-card" ? <Check /> : null}
                    </button>
                  </div>
                </fieldset>
              ) : null}
            </div>
            <div className="safety-status" data-status={moderationStatus}>{moderationStatus === "checking" ? "Checking images and text for unsafe content…" : moderationError ?? "Images are checked for nudity and adult content before publishing."}</div>
            <fieldset className={form.imageMode === "business-card" ? "styles-disabled" : ""}>
              <legend>Card style</legend>
              {form.imageMode === "business-card" ? <p className="style-lock-note">Your finished design will be shown as the full card. Switch to “Picture in a WALL style” to choose a style.</p> : null}
              <div className="style-options" role="radiogroup" aria-label="Choose a card style">
                {themeOptions.map(({ theme, label, description }) => (
                  <button
                    type="button"
                    key={theme}
                    className={`style-option style-${theme} ${form.theme === theme && form.imageMode !== "business-card" ? "selected" : ""}`}
                    onClick={() => setForm((value) => ({ ...value, theme }))}
                    disabled={form.imageMode === "business-card"}
                    role="radio"
                    aria-checked={form.theme === theme}
                  >
                    <span className="style-option-sample" aria-hidden="true"><i /><b /></span>
                    <span className="style-option-copy"><strong>{label}</strong><small>{description}</small></span>
                    {form.theme === theme && form.imageMode !== "business-card" ? <Check className="style-option-check" /> : null}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="preview-stage">
              <span>Live preview</span>
              <div className="preview-canvas">
                <CardSidesPreview
                  mode="live"
                  form={form}
                  frontImage={previews[0]}
                  backImage={backPreviews[0]}
                  backImageScale={backImageScale}
                  isVerified={isVerified}
                  onFrontImageHeightChange={previews[0] && form.imageMode === "photo" ? (imageHeight) => setForm((f) => ({ ...f, imageHeight })) : undefined}
                  onFrontImagePanChange={previews[0] && form.imageMode === "photo" ? (x, y) => setForm((f) => ({ ...f, imageX: x, imageY: y })) : undefined}
                  onBackImageScaleChange={backPreviews[0] ? (scale) => { setBackImageScale(scale); setForm((value) => ({ ...value, backImageScale: scale })); } : undefined}
                  onBackImagePanChange={backPreviews[0] ? (x, y) => setForm((value) => ({ ...value, backImageX: x, backImageY: y })) : undefined}
                />
              </div>
              {previews[0] && form.imageMode === "photo" ? <small className="img-drag-hint">Drag to reposition · drag corner to resize</small> : null}
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
