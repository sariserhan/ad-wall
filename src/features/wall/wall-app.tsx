"use client";

import {
  Bookmark,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Layers3,
  Link2,
  LocateFixed,
  LogIn,
  MapPin,
  Menu,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { startTransition, useCallback, useDeferredValue, useMemo, useRef, useState, useEffect, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Lazy-loaded to keep ~1MB country-state-city out of the initial bundle.
// All call sites await loadCSC() (async paths) or read `csc` state (render paths).
let _csc: typeof import("country-state-city") | null = null;
async function loadCSC() {
  if (_csc) return _csc;
  _csc = await import("country-state-city");
  return _csc;
}
import { LocationCombobox } from "./location-combobox";

const Composer = dynamic(() => import("./composer").then((m) => ({ default: m.Composer })), { ssr: false, loading: () => null });
const DetailPanel = dynamic(() => import("./detail-panel").then((m) => ({ default: m.DetailPanel })), { ssr: false, loading: () => null });
const PlacementMode = dynamic(() => import("./placement-mode").then((m) => ({ default: m.PlacementMode })), { ssr: false, loading: () => null });
const OwnerDashboard = dynamic(() => import("./owner-dashboard").then((m) => ({ default: m.OwnerDashboard })), { ssr: false, loading: () => null });
import { seedCards } from "./seed-cards";
import { WallCard } from "./wall-card";
import { WallMinimap } from "./wall-minimap";
import { WallSkeletons } from "./wall-skeletons";
import { categories, SUBCATEGORY_OPTIONS, getCardFormat, getImageCardFormat, type CardCategory, type CardDraft, type CardUpdate, type CreateCard, type CreateCardRateLimit, type OwnerCard, type Placement, type RenewalAmount, type WallCard as WallCardModel } from "./types";
import { activeFilterCount, featuredTierWeight } from "./wall-helpers";
import { buildWallPath, toCategorySlug } from "@/lib/wall-slug";
import { BugReportLink } from "@/components/bug-report-link";
import { ContactLink } from "@/components/contact-link";
import { PrivacySettingsLink } from "@/components/privacy-settings-link";
import type { SavedWall } from "./types";
import { toast } from "@/lib/toast";
import { pushDashboardHandler } from "@/lib/dashboard-signal";
import { captureAnalytics } from "@/lib/analytics";

interface WallAppProps {
  mode: "demo" | "connected";
  cards?: WallCardModel[];
  pendingCreatedCards?: WallCardModel[];
  onRefreshWall?: () => void;
  onCreateCard?: CreateCard;
  onCardOpen?: (card: WallCardModel) => void;
  onRequestSignIn?: () => void;
  isSignedIn?: boolean;
  isLoading?: boolean;
  authControl?: ReactNode;
  notice?: string | null;
  ownerCards?: OwnerCard[];
  ownerCardsLoading?: boolean;
  onSetCardStatus?: (card: OwnerCard, status: "published" | "hidden") => Promise<void>;
  onUpdateCard?: (card: OwnerCard, update: CardUpdate) => Promise<void>;
  onDeleteCard?: (card: OwnerCard) => Promise<void>;
  onRenewCard?: (card: OwnerCard, paidAmount: RenewalAmount, autoRenew: boolean) => Promise<void>;
  onCancelAutoRenewCard?: (card: OwnerCard) => Promise<void>;
  onMoveCard?: (card: WallCardModel, placement: Placement) => Promise<void>;
  ownedCardIds?: ReadonlySet<string>;
  likedCardIds?: ReadonlySet<string>;
  onToggleLike?: (card: WallCardModel) => Promise<void>;
  onCardEvent?: (card: WallCardModel, event: "website" | "phone" | "email" | "social" | "save" | "share") => void;
  onReportCard?: (card: WallCardModel, reason: "spam" | "scam" | "inappropriate" | "expired" | "other", details?: string) => Promise<void>;
  initialCardId?: string;
  initialLocation?: { country: string; state: string; city: string };
  initialKeyword?: string;
  initialCategory?: string;
  savedCards?: WallCardModel[];
  onSetSavedCard?: (card: WallCardModel, saved: boolean) => Promise<void>;
  savedWall?: boolean;
  onSetSavedWall?: (label: string, saved: boolean) => Promise<void>;
  savedWalls?: SavedWall[];
  onRemoveSavedWall?: (wall: SavedWall) => Promise<void>;
  profile?: { displayName: string | null; username: string | null; businessName: string | null; verified?: boolean; verificationStatus?: "pending" | "approved" | "rejected" | null } | null;
  onRequestVerification?: (plan: "monthly" | "annual") => Promise<void>;
  cardDailyStats?: { dates: string[]; byCard: Record<string, number[]> } | null;
  wallViewCount?: number;
  onSubscribeDigest?: (email: string, country: string, state: string, city: string) => Promise<{ alreadySubscribed: boolean }>;
}

const MAX_CARD_Y = 1500;

function makeDemoCard(draft: CardDraft, placement: Placement, zIndex: number): WallCardModel {
  const format = draft.imageMode === "business-card" ? getCardFormat("biz", draft.cardShape) : getImageCardFormat(draft.theme, draft.imageMode);
  return {
    id: `demo-${Date.now()}`,
    name: draft.name,
    category: draft.category,
    line: draft.line,
    message: draft.message,
    area: draft.area,
    city: draft.city,
    state: draft.state,
    country: draft.country,
    zipcode: draft.zipcode,
    price: draft.price,
    phone: draft.phone,
    email: draft.email,
    website: draft.website,
    location: draft.location,
    instagram: draft.instagram,
    facebook: draft.facebook,
    tiktok: draft.tiktok,
    linkedin: draft.linkedin,
    theme: draft.theme,
    imageMode: draft.imageMode,
    cardShape: draft.cardShape,
    images: draft.previews,
    x: placement.x,
    y: placement.y,
    rotation: draft.rotation ?? 0,
    width: format.width,
    zIndex,
    positionLockedAt: Date.now(),
    createdAt: Date.now(),
  };
}

const defaultSeedLocation = (() => {
  const seedDefault = seedCards.find((card) => card.country && card.state && card.city) ?? seedCards[0];
  return {
    country: seedDefault?.country ?? "US",
    state: seedDefault?.state ?? "",
    city: seedDefault?.city ?? "",
  };
})();

function EmptyWallCard({
  flag,
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
}: {
  flag?: string;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="nf-card empty-wall-card" role="status" aria-live="polite">
      <div className="nf-tape" aria-hidden="true" />
      <div className="nf-stamp" aria-hidden="true">OPEN</div>
      <div className="empty-wall-kicker">
        {flag ? <div className="empty-wall-flag" aria-hidden="true">{flag}</div> : null}
        <p className="nf-eyebrow">{eyebrow}</p>
      </div>
      <h2 className="nf-headline">{title}</h2>
      <p className="nf-body">{body}</p>

      <div className="nf-actions">
        <button type="button" className="nf-btn-primary" onClick={onAction}>{actionLabel}</button>
      </div>

      <footer className="nf-card-footer">
        <span>LocalWall</span>
        <span>your local bulletin board</span>
      </footer>
    </div>
  );
}

export function WallApp({ mode, cards: remoteCards, pendingCreatedCards = [], onRefreshWall, onCreateCard, onCardOpen, onRequestSignIn, isSignedIn = mode === "demo", isLoading = false, authControl, notice, ownerCards, ownerCardsLoading = false, onSetCardStatus, onUpdateCard, onDeleteCard, onRenewCard, onCancelAutoRenewCard, onMoveCard, ownedCardIds, likedCardIds, onToggleLike, onCardEvent, onReportCard, initialCardId, initialLocation, initialKeyword, initialCategory, savedCards = [], onSetSavedCard, savedWall = false, onSetSavedWall, savedWalls = [], onRemoveSavedWall, profile, onRequestVerification, cardDailyStats, wallViewCount, onSubscribeDigest }: WallAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [demoCards, setDemoCards] = useState<WallCardModel[]>(seedCards);
  const cards = useMemo(() => (mode === "connected" ? (remoteCards ?? []) : demoCards), [demoCards, mode, remoteCards]);
  const [selected, setSelected] = useState<WallCardModel | null>(null);
  const [composer, setComposer] = useState(false);
  const [dashboard, setDashboard] = useState(false);

  useEffect(() => pushDashboardHandler(() => setDashboard(true)), []);

  useEffect(() => {
    const locked = dashboard || composer;
    if (!locked) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const block = (e: WheelEvent | TouchEvent) => {
      let el = e.target as HTMLElement | null;
      while (el) {
        if (el !== document.documentElement && el !== document.body && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }
      e.preventDefault();
    };
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = "";
      document.removeEventListener("wheel", block);
      document.removeEventListener("touchmove", block);
    };
  }, [selected, dashboard, composer]);

  // Preload country-state-city after mount so it's ready before any interaction
  const [csc, setCSC] = useState<typeof import("country-state-city") | null>(null);
  useEffect(() => { void loadCSC().then(setCSC); }, []);

  const [category, setCategory] = useState<(typeof categories)[number]>(() => {
    const cat = initialCategory ?? "";
    return (categories as readonly string[]).includes(cat) ? cat as (typeof categories)[number] : "All";
  });
  const applyCategory = useCallback((cat: (typeof categories)[number]) => {
    setCategory(cat);
  }, []);
  const subcategory = searchParams.get("subcategory") ?? "";
  const [query, setQuery] = useState(searchParams.get("keyword") ?? initialKeyword ?? "");
  const initialLocationRef = useRef(initialLocation);
  const deferredQuery = useDeferredValue(query);
  const [fresh, setFresh] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [positionOverrides, setPositionOverrides] = useState<Record<string, Placement>>({});
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [stackPickerCards, setStackPickerCards] = useState<WallCardModel[] | null>(null);
  const [layers, setLayers] = useState<string[]>(seedCards.map((card) => card.id));
  const [flippedCardIds, setFlippedCardIds] = useState<Set<string>>(() => new Set());

  // Keep layers in sync with new cards arriving from Convex (e.g. other users posting).
  // New IDs are appended so they appear on top of older cards by default.
  useEffect(() => {
    setLayers((prev) => {
      const existing = new Set(prev);
      const incoming = cards.map((c) => c.id).filter((id) => !existing.has(id));
      return incoming.length ? [...prev, ...incoming] : prev;
    });
  }, [cards]);
  const flipUserKey = profile?.username ?? profile?.businessName ?? profile?.displayName ?? "anon";
  const flipStorageKey = `wall-card-flips-v1:${flipUserKey}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(flipStorageKey) ?? "null") as string[] | null;
      setFlippedCardIds(new Set(stored ?? []));
    } catch {
      setFlippedCardIds(new Set());
    }
  }, [flipStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(flipStorageKey, JSON.stringify([...flippedCardIds]));
    } catch {
      /* storage unavailable */
    }
  }, [flipStorageKey, flippedCardIds]);
  const [listView, setListView] = useState(false);
  const [ownCardsOnly, setOwnCardsOnly] = useState(false);
  const [ownCardsOnlyReady, setOwnCardsOnlyReady] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardDraft | null>(null);
  const [placement, setPlacement] = useState<Placement>({ x: 40, y: 170 });
  const [dragging, setDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [digestEmail, setDigestEmail] = useState("");
  const [digestStatus, setDigestStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [digestMessage, setDigestMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationDropdown, setLocationDropdown] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const showSignedOutAuth = !isSignedIn && pathname !== "/";
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapMessage, setMapMessage] = useState("Click on the map to choose a location.");
  const [selectedMapPoint, setSelectedMapPoint] = useState<{
    x: number;
    y: number;
    lat: number;
    lon: number;
    countryCode: string;
    countryName: string;
    stateCode: string;
    stateName: string;
    city: string;
  } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState(defaultSeedLocation.country);
  const [selectedState, setSelectedState] = useState(defaultSeedLocation.state);
  const [selectedCity, setSelectedCity] = useState(defaultSeedLocation.city);
  const selectedNeighborhood = searchParams.get("neighborhood") ?? "";
  // Draft state — only committed when the user clicks Apply
  const [draftCountry, setDraftCountry] = useState(defaultSeedLocation.country);
  const [draftState, setDraftState] = useState(defaultSeedLocation.state);
  const [draftCity, setDraftCity] = useState(defaultSeedLocation.city);
  const [draftNeighborhood, setDraftNeighborhood] = useState(searchParams.get("neighborhood") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<(typeof categories)[number]>("All");
  const [pendingSubcategory, setPendingSubcategory] = useState("");
  const [pendingFresh, setPendingFresh] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "most-viewed" | "most-reviews">("default");
  const [filterHasWebsite, setFilterHasWebsite] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterHasEmail, setFilterHasEmail] = useState(false);
  const [filterHasPhotos, setFilterHasPhotos] = useState(false);
  const [filterFeaturedOnly, setFilterFeaturedOnly] = useState(false);
  const [pendingSortBy, setPendingSortBy] = useState<"default" | "most-viewed" | "most-reviews">("default");
  const [pendingHasWebsite, setPendingHasWebsite] = useState(false);
  const [pendingHasPhone, setPendingHasPhone] = useState(false);
  const [pendingHasEmail, setPendingHasEmail] = useState(false);
  const [pendingHasPhotos, setPendingHasPhotos] = useState(false);
  const [pendingFeaturedOnly, setPendingFeaturedOnly] = useState(false);
  const wallRef = useRef<HTMLElement>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movePositionRef = useRef<Placement | null>(null);
  const closingCardRef = useRef<string | null>(null);
  const syncedCardParamRef = useRef<string | null>(null);
  const autoOpenComposerRef = useRef(searchParams.get("post") === "1");
  const didTriggerSignInRef = useRef(false);
  const currentCardParam = initialCardId ?? searchParams.get("card");
  const savedCardIds = useMemo(() => new Set(savedCards.map((card) => String(card.id))), [savedCards]);
  const ownerExpiryMap = useMemo(() => {
    if (!ownerCards?.length) return null;
    return new Map(ownerCards.map((c) => [String(c.id), c.expiresAt]));
  }, [ownerCards]);
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("localwall-own-cards-only-v1");
      if (stored === "1") setOwnCardsOnly(true);
    } catch {
      // Storage is optional; the toggle still works for the current session.
    }
    setOwnCardsOnlyReady(true);
  }, []);

  useEffect(() => {
    if (!ownCardsOnlyReady) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("localwall-own-cards-only-v1", ownCardsOnly ? "1" : "0");
    } catch {
      // Storage is optional; the toggle still works for the current session.
    }
  }, [ownCardsOnly, ownCardsOnlyReady]);

  useEffect(() => {
    if (cards.length === 0) return;
    const sharedCardId = currentCardParam;
    if (!sharedCardId) return;
    if (closingCardRef.current === sharedCardId) return;
    if (syncedCardParamRef.current === sharedCardId) return;
    const selectedCardId = selected?.id ? String(selected.id) : null;
    if (selectedCardId && (selectedCardId === sharedCardId || selectedCardId.startsWith(sharedCardId) || sharedCardId.startsWith(selectedCardId))) {
      syncedCardParamRef.current = sharedCardId;
      return;
    }
    const sharedCard = cards.find((card) => {
      const fullId = String(card.id);
      return fullId === sharedCardId || fullId.startsWith(sharedCardId);
    });
    if (sharedCard) {
      if (ownCardsOnly && (!ownedCardIds || !ownedCardIds.has(String(sharedCard.id)))) {
        syncedCardParamRef.current = sharedCardId;
        return;
      }
      syncedCardParamRef.current = sharedCardId;
      setSelected(sharedCard);
    }
  }, [cards, currentCardParam, ownCardsOnly, ownedCardIds, selected?.id]);

  useEffect(() => {
    if (!ownCardsOnly || !selected || !ownedCardIds) return;
    if (ownedCardIds.has(String(selected.id))) return;
    setSelected(null);
  }, [ownCardsOnly, ownedCardIds, selected]);

  const syncCardRoute = (cardId: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (cardId) {
      // Strip Convex table discriminant (last 8 chars) to keep URLs clean
      const cleanId = cardId.length > 32 ? cardId.slice(0, 32) : cardId;
      next.set("card", cleanId);
    } else {
      next.delete("card");
    }
    const queryString = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const closeCard = () => {
    closingCardRef.current = currentCardParam;
    syncedCardParamRef.current = currentCardParam;
    setSelected(null);
    const next = new URLSearchParams(window.location.search);
    next.delete("card");
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  useEffect(() => {
    setViewCounts((current) => {
      let changed = false;
      const next = { ...current };
      for (const card of cards) {
        const id = String(card.id);
        const clicks = card.clicks ?? 0;
        if (next[id] !== clicks) {
          next[id] = clicks;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [cards]);

  // Feature flag: hide map picker UI without deleting its code
  const MAP_ENABLED = false;

  const normalizeKey = (value?: string) => value?.trim().toLowerCase() ?? "";

  const countryFlagEmoji = (isoCode?: string) => {
    if (!isoCode) return "";
    const code = isoCode.toUpperCase();
    return code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  };

  const getCountryName = (isoCode?: string) => {
    if (!isoCode) return "";
    return csc?.Country.getAllCountries().find((country) => country.isoCode === isoCode)?.name ?? isoCode;
  };

  const getStateName = (country: string, stateCode: string) => {
    return csc?.State.getStatesOfCountry(country).find((state) => state.isoCode === stateCode)?.name ?? stateCode;
  };

  const locationLabel = () => {
    const stateName = selectedState ? getStateName(selectedCountry, selectedState) : "";
    if (selectedCity) {
      return `${selectedCity}${stateName ? `, ${stateName}` : ""}`;
    }
    if (selectedState) {
      return stateName;
    }
    return getCountryName(selectedCountry);
  };

  const [locationWeather, setLocationWeather] = useState<{ tempC: number; time: string; timezone?: string } | null>(null);

  const persistLocation = (country: string, state: string, city: string) => {
    try {
      window.localStorage.setItem("wallLocation", JSON.stringify({ country, state, city }));
    } catch {
      // ignore storage failures
    }
  };

  const fetchUserLocation = async () => {
    try {
      const { Country, State, City } = await loadCSC();
      const cached = window.sessionStorage.getItem("wall-location-v1");
      const cachedEntry = cached ? JSON.parse(cached) as { expiresAt: number; data: Record<string, unknown> } : null;
      if (cachedEntry && cachedEntry.expiresAt > Date.now()) return cachedEntry.data as { country: string; state: string; city: string };
      const countryCode = Country.getAllCountries().some((country) => country.isoCode === "US") ? "US" : Country.getAllCountries()[0]?.isoCode ?? "";
      if (!countryCode) return null;
      const allCountries = Country.getAllCountries();
      if (!allCountries.some((country) => country.isoCode === countryCode)) return null;
      const states = State.getStatesOfCountry(countryCode);
      const stateCode = states[0]?.isoCode ?? "";
      const cities = stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];
      const cityName = cities[0]?.name ?? "";
      return { country: countryCode, state: stateCode, city: cityName };
    } catch (error) {
      console.debug("Could not fetch user location:", error);
      return null;
    }
  };

  // Fetch local weather/time when selected location changes (use city coordinates when available)
  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const cacheKey = `wall-weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
        const cached = window.sessionStorage.getItem(cacheKey);
        const cachedEntry = cached ? JSON.parse(cached) as { expiresAt: number; value: { tempC: number; time: string; timezone?: string } } : null;
        if (cachedEntry && cachedEntry.expiresAt > Date.now()) { setLocationWeather(cachedEntry.value); return; }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        const cw = data.current_weather;
        if (!cw) {
          setLocationWeather(null);
          return;
        }
        const value = { tempC: Number(cw.temperature), time: String(cw.time || ""), timezone: data.timezone as string | undefined };
        setLocationWeather(value);
        window.sessionStorage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + 15 * 60 * 1000, value }));
      } catch (err) {
        console.debug(err);
        if (!cancelled) setLocationWeather(null);
      }
    };

    const tryFetchForSelected = async () => {
      if (!selectedCountry) return;
      const { City } = await loadCSC();
      const stateCode = selectedState;
      const cityName = selectedCity;
      if (stateCode && cityName) {
        const cities = City.getCitiesOfState(selectedCountry, stateCode);
        const match = cities.find((c) => c.name === cityName) ?? cities[0];
        if (match && match.latitude != null && match.longitude != null) {
          fetchWeather(Number(match.latitude), Number(match.longitude));
          return;
        }
      }
      // fallback: try first city in state
      if (selectedCountry && selectedState) {
        const cities = City.getCitiesOfState(selectedCountry, selectedState);
        const match = cities[0];
        if (match && match.latitude != null && match.longitude != null) {
          fetchWeather(Number(match.latitude), Number(match.longitude));
          return;
        }
      }
      setLocationWeather(null);
    };

    tryFetchForSelected();
    return () => { cancelled = true; };
  }, [selectedCountry, selectedState, selectedCity]);

  // Navigate to the path-based URL for a new location. Start with clean params — don't carry over
  // keyword, subcategory, or other stale filters from the previous wall.
  const updateLocationQuery = (country: string, state: string, city: string, neighborhood = "") => {
    const next = new URLSearchParams();
    if (neighborhood) next.set("neighborhood", neighborhood);
    const newPath = buildWallPath(country, state, city, category !== "All" ? category : undefined);
    const qs = next.toString();
    router.push(`${newPath}${qs ? `?${qs}` : ""}`);
  };

  // Sync category and subcategory from props (path changes on navigation)
  useEffect(() => {
    const cat = (categories as readonly string[]).includes(initialCategory ?? "")
      ? initialCategory as (typeof categories)[number]
      : "All";
    setCategory(cat);
  }, [initialCategory]);

  // Sync location from initialLocation prop (set by the page based on URL path)
  useEffect(() => {
    if (initialLocation?.country) {
      setSelectedCountry(initialLocation.country);
      setSelectedState(initialLocation.state || "");
      setSelectedCity(initialLocation.city || "");
      persistLocation(initialLocation.country, initialLocation.state || "", initialLocation.city || "");
      setLocationReady(true);
      return;
    }

    if (initialLocationRef.current) {
      const loc = initialLocationRef.current;
      setSelectedCountry(loc.country);
      setSelectedState(loc.state);
      setSelectedCity(loc.city);
      setLocationReady(true);
      return;
    }

    // No location in URL — try localStorage, then IP geolocation
    try {
      const raw = window.localStorage.getItem("wallLocation");
      if (raw) {
        const saved = JSON.parse(raw) as { country: string; state: string; city: string };
        if (saved?.country && /^[A-Z]{2,3}$/.test(saved.country)) {
          setSelectedCountry(saved.country);
          setSelectedState(saved.state || "");
          setSelectedCity(saved.city || "");
          updateLocationQuery(saved.country, saved.state || "", saved.city || "");
          setLocationReady(true);
          return;
        }
      }
    } catch { /* ignore */ }

    fetchUserLocation().then((location) => {
      if (location) {
        setSelectedCountry(location.country);
        setSelectedState(location.state);
        setSelectedCity(location.city);
        updateLocationQuery(location.country, location.state, location.city);
        persistLocation(location.country, location.state, location.city);
      }
      setLocationReady(true);
    }).catch(() => { setLocationReady(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation?.country, initialLocation?.state, initialLocation?.city]);

  // Sync pending filter state from applied state whenever the panel opens
  useEffect(() => {
    if (filterOpen) {
      setPendingCategory(category);
      setPendingSubcategory(subcategory);
      setPendingFresh(fresh);
      setPendingSortBy(sortBy);
      setPendingHasWebsite(filterHasWebsite);
      setPendingHasPhone(filterHasPhone);
      setPendingHasEmail(filterHasEmail);
      setPendingHasPhotos(filterHasPhotos);
      setPendingFeaturedOnly(filterFeaturedOnly);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOpen]);

  const availableStates = csc ? csc.State.getStatesOfCountry(draftCountry) : [];
  const availableCities = (csc && draftState) ? csc.City.getCitiesOfState(draftCountry, draftState) : [];
  const hasStateOptions = availableStates.length > 0;
  const hasCityOptions = availableCities.length > 0;

  // Base path for the current location (without category)
  const locationBasePath = selectedCountry
    ? buildWallPath(selectedCountry, selectedState || undefined, selectedCity || undefined)
    : "/";

  const applyLocation = (country: string, state: string, city: string, neighborhood: string) => {
    setSelectedCountry(country);
    setSelectedState(state);
    setSelectedCity(city);
    setQuery("");
    updateLocationQuery(country, state, city, neighborhood);
    persistLocation(country, state, city);
    const stateName = state ? getStateName(country, state) : "";
    const label = city ? `${city}${stateName ? `, ${stateName}` : ""}` : stateName || getCountryName(country);
    setLocationNotice(`Location applied. Showing ${label} wall.`);
    window.setTimeout(() => setLocationNotice(null), 3200);
    setLocationDropdown(false);
    setMobileMenuOpen(false);
  };

  const resetToDefault = () => {
    const defaultCountry = defaultSeedLocation.country;
    const defaultState = defaultSeedLocation.state;
    const defaultCity = defaultSeedLocation.city;
    setSelectedCountry(defaultCountry);
    setSelectedState(defaultState);
    setSelectedCity(defaultCity);
    setQuery("");
    persistLocation(defaultCountry, defaultState, defaultCity);
    updateLocationQuery(defaultCountry, defaultState, defaultCity);
    setLocationNotice("Reset to default wall.");
    window.setTimeout(() => setLocationNotice(null), 3200);
    setLocationDropdown(false);
  };

  const useMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      let location: { country: string; state: string; city: string } | null = null;

      if (navigator.geolocation) {
        location = await new Promise<{ country: string; state: string; city: string } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const res = await fetch(`/api/location/from-coords?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                resolve(await res.json() as { country: string; state: string; city: string } | null);
              } catch {
                resolve(null);
              }
            },
            () => resolve(null),
            { timeout: 8000 },
          );
        });
      }

      if (!location) location = await fetchUserLocation();
      if (!location) {
        setLocationNotice("Could not detect your location.");
        window.setTimeout(() => setLocationNotice(null), 3200);
        return;
      }
      const stateName = location.state ? getStateName(location.country, location.state) : "";
      const locationText = location.city ? `${location.city}${stateName ? `, ${stateName}` : ""}` : stateName || getCountryName(location.country);
      setSelectedCountry(location.country);
      setSelectedState(location.state);
      setSelectedCity(location.city);
      setQuery("");
      persistLocation(location.country, location.state, location.city);
      sessionStorage.setItem("wall-visit-skip", "1");
      updateLocationQuery(location.country, location.state, location.city);
      setLocationNotice(`Using your location: ${locationText}`);
      window.setTimeout(() => setLocationNotice(null), 3200);
      setLocationDropdown(false);
      setMobileMenuOpen(false);
    } finally {
      setLocating(false);
    }
  };

  // Ensure map picker is closed when map UI is disabled
  useEffect(() => {
    if (!MAP_ENABLED) setMapPickerOpen(false);
  }, [MAP_ENABLED]);

  useEffect(() => {
    if (!mapPickerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMapPickerOpen(false);
        setSelectedMapPoint(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mapPickerOpen]);

  useEffect(() => {
    if (!stackPickerCards) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStackPickerCards(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [stackPickerCards]);

  const visible = useMemo(() => {
    if (!locationReady) return cards;
    const needle = deferredQuery.toLowerCase();
    const filtered = cards.filter((card) => {
      if (ownCardsOnly && !ownedCardIds?.has(String(card.id))) return false;
      if (category !== "All" && card.category !== category) return false;
      if (subcategory && card.subcategory !== subcategory) return false;
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      if (selectedNeighborhood && card.neighborhood !== selectedNeighborhood) return false;
      if (filterHasWebsite && !card.website) return false;
      if (filterHasPhone && !card.phone) return false;
      if (filterHasEmail && !card.email) return false;
      if (filterHasPhotos && (!card.images || card.images.length === 0)) return false;
      if (filterFeaturedOnly && !card.featuredTier) return false;
      const text = `${card.name} ${card.line ?? ""} ${card.ownerName ?? ""} ${card.category} ${card.subcategory ?? ""} ${card.area}`.toLowerCase();
      return text.includes(needle);
    });
    if (sortBy === "most-viewed") {
      return [...filtered].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0));
    }
    if (sortBy === "most-reviews") {
      return [...filtered].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    }
    return [...filtered].sort((a, b) => {
      const tierDiff = featuredTierWeight(b.featuredTier) - featuredTierWeight(a.featuredTier);
      if (tierDiff !== 0) return tierDiff;
      return fresh ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    });
  }, [cards, category, subcategory, deferredQuery, fresh, sortBy, filterHasWebsite, filterHasPhone, filterHasEmail, filterHasPhotos, filterFeaturedOnly, selectedCountry, selectedState, selectedCity, selectedNeighborhood, locationReady, ownCardsOnly, ownedCardIds]);

  const similarCards = useMemo(() => {
    if (!selected) return [];
    return visible.filter((c) => String(c.id) !== String(selected.id) && c.category === selected.category).slice(0, 3);
  }, [selected, visible]);
  const ownCardsHint = ownCardsOnly ? "Showing only your cards on this wall." : "Show only your cards on this wall.";

  const pendingCardsOnSelectedWall = useMemo(() => {
    if (!locationReady) return 0;
    return pendingCreatedCards.filter((card) => {
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      return true;
    }).length;
  }, [locationReady, pendingCreatedCards, selectedCity, selectedCountry, selectedState]);
  const activeFilterCountValue = activeFilterCount({
    categoryIsAll: category === "All",
    subcategory,
    selectedNeighborhood,
    fresh,
    sortByDefault: sortBy === "default",
    hasWebsite: filterHasWebsite,
    hasPhone: filterHasPhone,
    hasEmail: filterHasEmail,
    hasPhotos: filterHasPhotos,
    featuredOnly: filterFeaturedOnly,
  });

  const removeSavedCard = async (card: WallCardModel) => {
    if (!onSetSavedCard) return;
    try {
      await onSetSavedCard(card, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the card from saved list.");
    }
  };

  const front = (id: string) => setLayers((current) => [...current.filter((item) => item !== id), id]);
  const flipCard = (card: WallCardModel) => {
    setFlippedCardIds((current) => {
      const next = new Set(current);
      const key = String(card.id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const estimateCardHeight = (card: WallCardModel) => {
    const format = getCardFormat(card.imageMode === "business-card" ? "biz" : card.theme);
    if (card.imageMode === "business-card") return format.minHeight;
    if (card.images.length > 0) return Math.max(format.minHeight, 300);
    return format.minHeight;
  };

  const getCardRect = (card: WallCardModel) => {
    const wallEl = wallRef.current;
    if (wallEl) {
      const el = wallEl.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`);
      if (el) {
        const wallRect = wallEl.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const left = r.left - wallRect.left;
        const top = r.top - wallRect.top;
        return { left, top, right: left + r.width, bottom: top + r.height, width: r.width, height: r.height };
      }
    }
    const wallWidth = wallEl?.getBoundingClientRect().width ?? window.innerWidth;
    const left = (card.x / 100) * wallWidth;
    const top = card.y;
    const width = card.width;
    const height = estimateCardHeight(card);
    return { left, top, right: left + width, bottom: top + height, width, height };
  };

  const overlapRatio = (a: ReturnType<typeof getCardRect>, b: ReturnType<typeof getCardRect>) => {
    const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const overlapArea = overlapWidth * overlapHeight;
    if (!overlapArea) return 0;
    const baseArea = Math.min(a.width * a.height, b.width * b.height);
    return overlapArea / baseArea;
  };

  const visualZIndex = (card: WallCardModel) => {
    const idx = layers.indexOf(card.id);
    return idx >= 0 ? idx + 1 : 1;
  };

  const getStackAtCard = (targetCard: WallCardModel) => {
    const targetRect = getCardRect(targetCard);
    const stack = visible.filter((candidate) => {
      const candidateRect = getCardRect(candidate);
      return overlapRatio(targetRect, candidateRect) >= 0.4;
    });
    return stack.sort((a, b) => visualZIndex(b) - visualZIndex(a));
  };

  const openCard = (cardToOpen: WallCardModel) => {
    closingCardRef.current = null;
    const isAlreadyOpen = selected?.id === cardToOpen.id;
    if (isAlreadyOpen) {
      return;
    }
    const openedId = String(cardToOpen.id);
    const isOwnerView = ownedCardIds?.has(openedId) ?? false;
    const nextViews = (viewCounts[openedId] ?? cardToOpen.clicks ?? 0) + (isOwnerView ? 0 : 1);
    setViewCounts((current) => ({ ...current, [openedId]: nextViews }));
    const openedWithViews = { ...cardToOpen, clicks: nextViews };
    setSelected(openedWithViews);
    syncCardRoute(openedId);
    if (!isOwnerView) onCardOpen?.(openedWithViews);
  };

  const handleCardClick = (cardToOpen: WallCardModel) => {
    const stack = getStackAtCard(cardToOpen);
    if (stack.length > 1) {
      setStackPickerCards(stack);
      return;
    }
    openCard(cardToOpen);
  };

  const startCardMove = (event: PointerEvent<HTMLElement>, card: WallCardModel) => {
    if (!ownedCardIds?.has(String(card.id)) || !wallRef.current) return;
    const wallRect = wallRef.current.getBoundingClientRect();
    const cardLeft = wallRect.left + (card.x / 100) * wallRect.width;
    const cardTop = wallRect.top + card.y;
    moveOffsetRef.current = { x: event.clientX - cardLeft, y: event.clientY - cardTop };
    movePositionRef.current = null;
    setMovingCardId(String(card.id));
    setError(null);
  };

  const moveOwnedCard = (event: PointerEvent<HTMLElement>, card: WallCardModel) => {
    const offset = moveOffsetRef.current;
    const wall = wallRef.current;
    if (!ownedCardIds?.has(String(card.id)) || !offset || !wall) return;
    const wallRect = wall.getBoundingClientRect();
    const format = getCardFormat(card.imageMode === "business-card" ? "biz" : card.theme);
    const left = Math.min(Math.max(0, event.clientX - wallRect.left - offset.x), Math.max(0, wallRect.width - format.width));
    const top = Math.min(
      Math.max(0, event.clientY - wallRect.top - offset.y),
      Math.min(MAX_CARD_Y, Math.max(0, wallRect.height - format.minHeight)),
    );
    const next = { x: (left / wallRect.width) * 100, y: top };
    movePositionRef.current = next;
    setPositionOverrides((current) => ({ ...current, [String(card.id)]: { ...(current[String(card.id)] ?? {}), ...next } }));
  };

  const rotateOwnedCard = async (card: WallCardModel, rotation: number) => {
    const id = String(card.id);
    const next = { x: card.x, y: card.y, rotation };
    setPositionOverrides((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...next } }));
    if (!onMoveCard) return;
    try {
      await onMoveCard(card, next);
    } catch (cause) {
      setPositionOverrides((current) => {
        const copy = { ...current };
        delete copy[id];
        return copy;
      });
      setError(cause instanceof Error ? cause.message : "The card tilt could not be saved.");
    }
  };

  const finishCardMove = async (_event: PointerEvent<HTMLElement>, card: WallCardModel) => {
    const id = String(card.id);
    const next = movePositionRef.current;
    moveOffsetRef.current = null;
    movePositionRef.current = null;
    setMovingCardId(null);
    if (!next || !onMoveCard) return;
    try {
      await onMoveCard(card, next);
    } catch (cause) {
      setPositionOverrides((current) => {
        const copy = { ...current };
        delete copy[id];
        return copy;
      });
      setError(cause instanceof Error ? cause.message : "The card position could not be saved.");
    }
  };

  const openComposer = () => {
    setError(null);
    if (!isSignedIn) {
      onRequestSignIn?.();
      return;
    }
    if (selected) closeCard();
    setComposer(true);
    captureAnalytics("card_composer_opened", {
      location_country: selectedCountry,
      location_state: selectedState,
      location_city: selectedCity,
    });
  };

  // Auto-open composer when redirected from "Post a card" on the homepage (?post=1)
  useEffect(() => {
    if (!autoOpenComposerRef.current) return;
    if (isSignedIn) {
      autoOpenComposerRef.current = false;
      const next = new URLSearchParams(window.location.search);
      next.delete("post");
      const clean = next.toString();
      window.history.replaceState({}, "", clean ? `${window.location.pathname}?${clean}` : window.location.pathname);
      openComposer();
    } else if (!didTriggerSignInRef.current) {
      didTriggerSignInRef.current = true;
      onRequestSignIn?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const createFromDashboard = () => {
    setDashboard(false);
    openComposer();
  };

  const beginPlacement = (draft: CardDraft) => {
    setComposer(false);
    setSelected(null);
    setPendingCard(draft);
    const wallRect = wallRef.current?.getBoundingClientRect();
    const wallWidth = wallRect?.width ?? window.innerWidth;
    const wallHeight = wallRect?.height ?? Math.max(500, window.innerHeight - 66);
    const format = draft.imageMode === "business-card" ? getCardFormat("biz", draft.cardShape) : getImageCardFormat(draft.theme, draft.imageMode);
    const margin = 18;
    const maxLeft = Math.max(margin, wallWidth - format.width - margin);
    const maxTop = Math.max(36, wallHeight - format.minHeight - 36);
    const left = margin + Math.random() * Math.max(0, maxLeft - margin);
    const top = 36 + Math.random() * Math.max(0, maxTop - 36);
    setPlacement({ x: (left / wallWidth) * 100, y: top });
  };

  const movePlacement = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !wallRef.current) return;
    const rect = wallRef.current.getBoundingClientRect();
    const cardWidth = pendingCard ? (pendingCard.imageMode === "business-card" ? getCardFormat("biz", pendingCard.cardShape).width : getImageCardFormat(pendingCard.theme, pendingCard.imageMode).width) : (window.innerWidth < 780 ? 182 : 220);
    const maxLeft = Math.max(12, rect.width - cardWidth - 12);
    const left = Math.min(maxLeft, Math.max(12, event.clientX - rect.left - cardWidth / 2));
    const top = Math.min(rect.height - 250, Math.max(28, event.clientY - rect.top - 90));
    setPlacement({ x: (left / rect.width) * 100, y: top });
  };

  const post = async () => {
    if (!pendingCard) return;
    setIsSaving(true);
    setError(null);
    try {
      let card: WallCardModel | CreateCardRateLimit | void;
      if (mode === "demo") {
        card = makeDemoCard(pendingCard, placement, cards.length + 1);
        setDemoCards((current) => [...current, card as WallCardModel]);
      } else {
        card = await onCreateCard?.(pendingCard, placement);
      }
      if (card && "kind" in card) { toast(card.message, "info"); return; }
      const postedCard = card as WallCardModel | void;
      setPendingCard(null);
      if (postedCard) {
        setLayers((current) => [...current, postedCard.id]);
        setSelected(postedCard);
      }
      setFresh(false);
      toast("Card posted!");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message || "The card could not be posted.");
    } finally {
      setIsSaving(false);
    }
  };

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inlineQR, setInlineQR] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("wall_onboarded")) {
      localStorage.setItem("wall_onboarded", "1");
      setShowTip(true);
    }
  }, []);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) { setInlineQR(null); return; }
    const url = window.location.origin + window.location.pathname;
    import("qrcode").then(({ default: QRCode }) => {
      void QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: "#141414", light: "#ffffff" } }).then(setInlineQR);
    });
  }, [shareOpen]);


  const copyWallLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast("Wall link copied", "info");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const printWallQR = async () => {
    const url = window.location.origin + window.location.pathname;
    const appUrl = window.location.origin;
    const QRCode = (await import("qrcode")).default;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#1a1a18", light: "#ffffff" } });
    const countryName = csc?.Country?.getCountryByCode(selectedCountry.toUpperCase())?.name ?? selectedCountry.toUpperCase();
    const stateName = selectedState ? getStateName(selectedCountry, selectedState) : "";
    const neighborhood = selectedNeighborhood || "";
    // primary = most specific level; meta = everything above it (no repeats)
    const city = selectedCity || stateName || countryName || "Local";
    const metaParts = selectedCity
      ? [stateName, countryName].filter(Boolean)
      : selectedState
        ? [countryName].filter(Boolean)
        : [];
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const win = window.open("", "_blank");
    if (!win) { toast("Allow popups to print the QR poster", "error"); return; }
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LOCALWALL · ${esc(city)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { width: 210mm; min-height: 297mm; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 60px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .bg-fill { position: fixed; inset: 0; z-index: -1; background-color: #747672; background-image: url('${appUrl}/assets/wall-texture.png'); background-size: 1659px auto; background-repeat: repeat; background-position: center top; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .grain { position: fixed; inset: 0; z-index: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.65' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E"); opacity: .08; mix-blend-mode: overlay; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ghost { position: fixed; border-radius: 1px; background: #0002; box-shadow: 1px 3px 8px #0003; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .g1 { width: 200px; height: 240px; top: 8%; left: 5%; transform: rotate(3.5deg); opacity: .55; }
    .g2 { width: 160px; height: 200px; top: 15%; right: 7%; transform: rotate(-2.5deg); opacity: .4; }
    .g3 { width: 180px; height: 160px; bottom: 12%; left: 12%; transform: rotate(1.2deg); opacity: .35; }
    .g4 { width: 140px; height: 120px; bottom: 10%; right: 10%; transform: rotate(-3deg); opacity: .3; }
    .card { position: relative; z-index: 1; width: min(360px, calc(100% - 40px)); background: #edede8; padding: 42px 36px 28px; box-shadow: 3px 6px 2px #0006, 14px 22px 28px #0004; transform: rotate(-1.8deg); }
    .card::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .14; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence baseFrequency='.65' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='.35'/%3E%3C/svg%3E"); mix-blend-mode: multiply; }
    .card::after { content: ''; position: absolute; inset: auto 0 -1px 0; height: 7px; background: #edede8; clip-path: polygon(0 0,8% 35%,17% 0,27% 48%,38% 4%,48% 35%,58% 0,70% 43%,81% 7%,91% 38%,100% 0,100% 60%,0 60%); }
    .tape { position: absolute; top: -13px; left: 50%; width: 88px; height: 26px; transform: translateX(-50%) rotate(-1.5deg); background: #d9d2b7a8; box-shadow: 0 1px #fff5; opacity: .86; }
    .eyebrow { margin: 0 0 10px; font: 800 9px sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #aaa; }
    .card { container-type: inline-size; container-name: card; }
    .logo { font: 900 clamp(40px, 16cqi, 72px)/.82 'Arial Black', 'Helvetica Neue', sans-serif; text-transform: uppercase; letter-spacing: -.01em; color: #1a1a18; margin-bottom: 4px; word-break: break-word; }
    .tagline { font: 700 clamp(8px, 2.5cqi, 11px) sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #aaa; margin-bottom: 20px; }
    .divider { width: 44px; height: 3px; background: #f43d38; margin: 0 0 18px; }
    .city { font: 900 clamp(18px, 11cqi, 42px)/1.05 'Arial Black', 'Helvetica Neue', sans-serif; text-transform: uppercase; letter-spacing: .01em; color: #1a1a18; margin-bottom: 4px; word-break: break-word; overflow-wrap: anywhere; }
    .location-meta { font: 600 clamp(9px, 2.8cqi, 12px) sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 6px; word-break: break-word; }
    .subtitle { font: 400 clamp(10px, 3cqi, 13px)/1.6 sans-serif; color: #666; margin-bottom: 20px; }
    .qr { width: min(200px, 55cqi); height: min(200px, 55cqi); display: block; margin: 0 auto 14px; border: 2px solid #1a1a18; padding: 4px; background: #fff; }
    .url-text { font: 400 clamp(8px, 2.5cqi, 11px) monospace; color: #aaa; text-align: center; margin-bottom: 22px; word-break: break-all; }
    .card-footer { display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid #d4d0c8; font: 700 clamp(7px, 2cqi, 9px) sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #bbb; }
    .brand { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); font: 900 11px sans-serif; letter-spacing: .22em; color: #fff3; text-transform: uppercase; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="bg-fill"></div>
  <div class="grain"></div>
  <div class="ghost g1"></div><div class="ghost g2"></div><div class="ghost g3"></div><div class="ghost g4"></div>
  <div class="card">
    <div class="tape"></div>
    <p class="eyebrow">LocalWall · ${esc(city)}</p>
    <div class="logo">WALL</div>
    <div class="tagline">local bulletin board</div>
    <div class="divider"></div>
    <div class="city">${esc(city)}</div>
    ${neighborhood ? `<p class="location-meta">${esc(neighborhood)}</p>` : ""}
    ${metaParts.length ? `<p class="location-meta">${metaParts.map(esc).join(" · ")}</p>` : ""}
    <p class="subtitle">Scan to see what's on the wall</p>
    <img class="qr" src="${qrDataUrl}" alt="QR code" />
    <p class="url-text">${esc(url)}</p>
    <div class="card-footer"><span>LocalWall</span><span>your local bulletin board</span></div>
  </div>
  <div class="brand">WALL</div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
    win.document.close();
  };

  const handleWallKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const wallEl = wallRef.current;
    if (!wallEl) return;
    const cards = Array.from(wallEl.querySelectorAll<HTMLElement>("[data-card-id]"));
    if (!cards.length) return;
    const focused = document.activeElement as HTMLElement;
    const idx = cards.indexOf(focused);

    if (e.key === "Tab") {
      if (idx === -1) return;
      if (!e.shiftKey && idx < cards.length - 1) {
        e.preventDefault();
        const next = cards[idx + 1];
        next?.focus();
        next?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else if (e.shiftKey && idx > 0) {
        e.preventDefault();
        const prev = cards[idx - 1];
        prev?.focus();
        prev?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    let next: HTMLElement | undefined;
    if (idx === -1) {
      next = cards[0];
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = cards[Math.min(idx + 1, cards.length - 1)];
    } else {
      next = cards[Math.max(idx - 1, 0)];
    }
    next?.focus();
    next?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };

  const resetFilters = () => {
    startTransition(() => {
      applyCategory("All");
      setQuery("");
      setFresh(false);
      setSortBy("default");
      setFilterHasWebsite(false);
      setFilterHasPhone(false);
      setFilterHasEmail(false);
      setFilterHasPhotos(false);
      setFilterFeaturedOnly(false);
      router.replace(pathname || "/");
    });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetFilters}>LocalWall<span>your local bulletin board</span></button>
        <div className="location-wrap">
          <button className="location" onClick={() => { if (locationReady) { if (!locationDropdown) { setDraftCountry(selectedCountry); setDraftState(selectedState); setDraftCity(selectedCity); setDraftNeighborhood(selectedNeighborhood); } setLocationDropdown(!locationDropdown); } }} aria-expanded={locationDropdown}>
            <MapPin />
            <span className="location-inner">
              {locationReady ? <span aria-hidden>{countryFlagEmoji(selectedCountry)}</span> : null}
              <span className="location-label">{locationReady ? locationLabel() : "Locating..."}</span>
            </span>
            <ChevronDown />
          </button>
          {locationDropdown ? (
            <>
              <div className="filter-backdrop" onClick={() => setLocationDropdown(false)} />
              <div className="location-panel" onClick={(e) => e.stopPropagation()}>
                <div className="filter-panel-header">
                  <strong>Choose location</strong>
                  <button className="icon-btn" onClick={() => setLocationDropdown(false)} aria-label="Close"><X /></button>
                </div>
                <div className="location-panel-body">
                  <label className="filter-panel-label">Country
                    <LocationCombobox
                      value={draftCountry}
                      options={csc ? csc.Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })) : []}
                      onChange={(val) => { setDraftCountry(val); setDraftState(""); setDraftCity(""); }}
                      placeholder="Type a country…"
                    />
                  </label>
                  {hasStateOptions ? (
                    <label className="filter-panel-label">State
                      <LocationCombobox
                        value={draftState}
                        options={[{ value: "", label: "— All states —" }, ...availableStates.map((s) => ({ value: s.isoCode, label: s.name }))]}
                        onChange={(val) => { setDraftState(val); setDraftCity(""); setDraftNeighborhood(""); }}
                        placeholder="Type a state…"
                      />
                    </label>
                  ) : null}
                  {hasCityOptions ? (
                    <label className="filter-panel-label">City
                      <LocationCombobox
                        value={draftCity}
                        options={[{ value: "", label: "— All cities —" }, ...availableCities.map((c) => ({ value: c.name, label: c.name }))]}
                        onChange={(val) => { setDraftCity(val); setDraftNeighborhood(""); }}
                        placeholder="Type a city…"
                      />
                    </label>
                  ) : null}
                  {draftCity ? (
                    <label className="filter-panel-label">Neighborhood (optional)<input type="text" value={draftNeighborhood} onChange={(event) => setDraftNeighborhood(event.target.value)} placeholder="e.g. Downtown, Williamsburg" /></label>
                  ) : null}
                </div>
                {locationNotice ? <div className="location-panel-notice">{locationNotice}</div> : null}
                <div className="filter-panel-footer">
                  <button type="button" className="primary" onClick={() => applyLocation(draftCountry, draftState, draftCity, draftNeighborhood)}>Apply</button>
                  <button type="button" className="filter-clear-btn locate-in-panel" onClick={useMyLocation} disabled={locating}><LocateFixed className={locating ? "locate-spin" : ""} />My location</button>
                  <button type="button" className="filter-clear-btn" onClick={resetToDefault}>Reset</button>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <button className="locate-btn" onClick={useMyLocation} disabled={locating} title="Use my location" aria-label="Use my location">
          <LocateFixed className={locating ? "locate-spin" : ""} />
          <span>Locate</span>
        </button>
        {/* Map picker temporarily hidden */}
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <X /> : <Menu />}
          <span>Menu</span>
        </button>
        {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
        <nav className={mobileMenuOpen ? "mobile-open" : ""}>
          {pathname !== "/" ? <Link href="/trending" className="topbar-trending-mobile">Trending</Link> : null}
          <div className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, business or creator" aria-label="Search advertisements" /></div>
          <div className="filter-wrap">
            {filterOpen && <div className="filter-backdrop" onClick={() => setFilterOpen(false)} />}
            <button className="filter-btn" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen} aria-label="Open filters">
              <SlidersHorizontal />
              <span>Filter</span>
              {activeFilterCountValue > 0 && <span className="filter-badge">{activeFilterCountValue}</span>}
              <ChevronDown />
            </button>
            {filterOpen && (
              <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
                <div className="filter-panel-header">
                  <strong>Filter Cards</strong>
                  <button className="icon-btn" onClick={() => setFilterOpen(false)} aria-label="Close filters"><X /></button>
                </div>
                <div className="filter-panel-body">
                  <label className="filter-panel-label">
                    Category
                    <select value={pendingCategory} onChange={(event) => {
                      setPendingCategory(event.target.value as (typeof categories)[number]);
                      setPendingSubcategory("");
                    }}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                  </label>
                  <label className="filter-panel-label">
                    Subcategory
                    <select value={pendingSubcategory} disabled={pendingCategory === "All"} onChange={(event) => setPendingSubcategory(event.target.value)}>
                      {pendingCategory === "All"
                        ? <option value="">Pick a category first</option>
                        : <><option value="">All subcategories</option>{SUBCATEGORY_OPTIONS[pendingCategory as CardCategory].map((sub) => <option key={sub} value={sub}>{sub}</option>)}</>
                      }
                    </select>
                  </label>
                  <label className="filter-panel-label">
                    Sort by
                    <select value={pendingSortBy} onChange={(event) => setPendingSortBy(event.target.value as typeof sortBy)}>
                      <option value="default">Default</option>
                      <option value="most-viewed">Most viewed</option>
                      <option value="most-reviews">Most reviews</option>
                    </select>
                  </label>
                  <div className="filter-panel-toggles">
                    <label className="filter-panel-toggle">
                      <input type="checkbox" checked={pendingFresh} onChange={(event) => setPendingFresh(event.target.checked)} />
                      <span>Newest first</span>
                    </label>
                    <label className="filter-panel-toggle">
                      <input type="checkbox" checked={pendingHasWebsite} onChange={(event) => setPendingHasWebsite(event.target.checked)} />
                      <span>Has website</span>
                    </label>
                    <label className="filter-panel-toggle">
                      <input type="checkbox" checked={pendingHasPhone} onChange={(event) => setPendingHasPhone(event.target.checked)} />
                      <span>Has phone</span>
                    </label>
                    <label className="filter-panel-toggle">
                      <input type="checkbox" checked={pendingHasEmail} onChange={(event) => setPendingHasEmail(event.target.checked)} />
                      <span>Has email</span>
                    </label>
                    <label className="filter-panel-toggle">
                      <input type="checkbox" checked={pendingHasPhotos} onChange={(event) => setPendingHasPhotos(event.target.checked)} />
                      <span>Has photos</span>
                    </label>
                    <label className="filter-panel-toggle filter-featured-toggle">
                      <input type="checkbox" checked={pendingFeaturedOnly} onChange={(event) => setPendingFeaturedOnly(event.target.checked)} />
                      <span>⭐ Featured only</span>
                    </label>
                  </div>
                </div>
                <div className="filter-panel-footer">
                  <button className="primary" onClick={() => {
                    applyCategory(pendingCategory);
                    setFresh(pendingFresh);
                    setSortBy(pendingSortBy);
                    setFilterHasWebsite(pendingHasWebsite);
                    setFilterHasPhone(pendingHasPhone);
                    setFilterHasEmail(pendingHasEmail);
                    setFilterHasPhotos(pendingHasPhotos);
                    setFilterFeaturedOnly(pendingFeaturedOnly);
                    const next = new URLSearchParams(window.location.search);
                    if (pendingSubcategory) next.set("subcategory", pendingSubcategory); else next.delete("subcategory");
                    next.delete("neighborhood");
                    const target = pendingCategory === "All" ? locationBasePath : `${locationBasePath}/${toCategorySlug(pendingCategory)}`;
                    const qs = next.toString();
                    router.push(`${target}${qs ? `?${qs}` : ""}`);
                    setFilterOpen(false);
                  }}>Apply filters</button>
                  {activeFilterCountValue > 0 && (
                    <button className="filter-clear-btn" onClick={() => {
                      applyCategory("All"); setFresh(false);
                      setSortBy("default"); setFilterHasWebsite(false); setFilterHasPhone(false); setFilterHasEmail(false); setFilterHasPhotos(false); setFilterFeaturedOnly(false);
                      const next = new URLSearchParams(window.location.search);
                      next.delete("subcategory"); next.delete("neighborhood");
                      const qs = next.toString();
                      router.push(`${locationBasePath}${qs ? `?${qs}` : ""}`);
                      setFilterOpen(false);
                    }}>Clear all</button>
                  )}
                </div>
              </div>
            )}
          </div>
          {shareOpen && <div className="share-backdrop" onClick={() => setShareOpen(false)} />}
          <div className="share-wall-wrap" ref={shareRef}>
            <button onClick={() => { setShareOpen((p) => !p); setMobileMenuOpen(false); }}><Link2 />Share Wall</button>
            {shareOpen && (
              <div className="share-popover">
                <div className="share-popover-header">
                  <strong>Share</strong>
                  <button className="share-popover-close" onClick={() => setShareOpen(false)}><X size={14} /></button>
                </div>
                <button className="share-option" onClick={() => { void copyWallLink(); }}>
                  <Link2 size={14} /><span>{copied ? "Copied!" : "Copy link"}</span>
                </button>
                <button className="share-option" onClick={() => { void printWallQR(); setShareOpen(false); }}>
                  <QrCode size={14} /><span>QR — print A4 poster</span>
                </button>
                <div className="share-option-qr-row">
                  <div className="share-option-qr-header"><QrCode size={14} /><span>QR — scan from screen</span></div>
                  {inlineQR
                    ? <img src={inlineQR} alt="QR code" className="share-qr-img" />
                  : <div className="share-qr-placeholder" />}
                </div>
              </div>
            )}
          </div>
          {isSignedIn && ownedCardIds ? (
            <button
              className={ownCardsOnly ? "is-active" : ""}
              onClick={() => { setOwnCardsOnly((v) => !v); setMobileMenuOpen(false); }}
              aria-label={ownCardsOnly ? "Show all cards" : "Show only my cards"}
              title={ownCardsHint}
            >
              <Bookmark fill={ownCardsOnly ? "currentColor" : "none"} />
              <span>My cards</span>
            </button>
          ) : null}
          {isSignedIn && pathname && pathname !== "/" ? (
            <button
              className={savedWall ? "save-wall-btn saved" : "save-wall-btn"}
              onClick={() => {
                const wallLabel = [locationLabel(), category !== "All" ? category : null, subcategory || null].filter(Boolean).join(" · ");
                void onSetSavedWall?.(wallLabel, !savedWall);
                setMobileMenuOpen(false);
              }}
              aria-label={savedWall ? "Unsave this wall" : "Save this wall"}
            >
              <Bookmark />{savedWall ? "Wall saved" : "Save wall"}
            </button>
          ) : null}

          <button className="mobile-nav-post" onClick={() => { openComposer(); setMobileMenuOpen(false); }}><Plus />Post your card</button>
        </nav>
        {authControl ? <div className="auth-control">{authControl}</div> : null}
        {showSignedOutAuth ? <span className="topbar-divider" aria-hidden="true" /> : null}
        {showSignedOutAuth ? <Link href="/trending" className="topbar-trending-lite"><TrendingUp size={12} />Trending</Link> : null}
        <button className="primary post-button" onClick={openComposer}><Plus />Post your card</button>
      </header>
      {MAP_ENABLED && mapPickerOpen ? (
        <div className="map-picker-backdrop" onClick={() => setMapPickerOpen(false)}>
          <div className="map-picker-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="map-picker-header">
              <strong>Pick a location on the world map</strong>
              <button className="icon-btn" onClick={() => setMapPickerOpen(false)} aria-label="Close"><X /></button>
            </div>
            <p className="map-picker-instructions">{mapMessage}</p>
            <div className="world-map-wrapper">
              <div className="world-map-container">
                <img
                  className="world-map"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg"
                  alt="Equirectangular world map for location selection"
                  draggable={false}
                  loading="lazy"
                  onClick={async (event) => {
                    const target = event.currentTarget as HTMLImageElement;
                    const rect = target.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    // Account for object-fit: contain scaling
                    const scale = Math.min(rect.width / target.naturalWidth, rect.height / target.naturalHeight);
                    const imgWidth = target.naturalWidth * scale;
                    const imgHeight = target.naturalHeight * scale;
                    const imgLeft = (rect.width - imgWidth) / 2;
                    const imgTop = (rect.height - imgHeight) / 2;
                    
                    // Check if click is within the actual image bounds
                    if (x < imgLeft || x > imgLeft + imgWidth || y < imgTop || y > imgTop + imgHeight) {
                      setMapMessage("Click on the map area.");
                      return;
                    }
                    
                    // Get normalized coordinates [0, 1] relative to the actual image
                    const imgX = (x - imgLeft) / imgWidth;
                    const imgY = (y - imgTop) / imgHeight;
                    
                    // Map to lat/lon
                    const lon = imgX * 360 - 180;
                    const lat = 90 - imgY * 180;
                    
                    setMapLoading(true);
                    setMapMessage("Resolving location...");
                    try {
                      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`);
                      const data = await response.json();
                      const address = data.address ?? {};
                      const countryCode = String(address.country_code || "").toUpperCase();
                      const countryName = String(address.country || "");
                      if (!countryCode || !countryName) {
                        setMapMessage("Could not resolve location. Try another point.");
                        setMapLoading(false);
                        return;
                      }
                      const { State: CSCState, City: CSCCity } = await loadCSC();
                      const states = CSCState.getStatesOfCountry(countryCode);
                      const stateName = String(address.state || address.region || address.county || "");
                      
                      // Improved state matching: try exact match, then partial match, then pick first available
                      let matchedState = states.find((state) => normalizeKey(state.name) === normalizeKey(stateName) || normalizeKey(state.isoCode) === normalizeKey(stateName));
                      if (!matchedState && stateName) {
                        // Try partial match for common variations
                        const stateNameLower = stateName.toLowerCase();
                        matchedState = states.find((state) => state.name.toLowerCase().includes(stateNameLower) || stateNameLower.includes(state.name.toLowerCase()));
                      }
                      const selectedStateCode = matchedState?.isoCode ?? states[0]?.isoCode ?? "";
                      
                      const cityName = String(address.city || address.town || address.village || address.hamlet || address.county || "");
                      const availableCities = CSCCity.getCitiesOfState(countryCode, selectedStateCode);
                      
                      // Improved city matching: try exact match first, then find closest by lat/lon
                      let finalCity = "";
                      if (cityName) {
                        const exactCityMatch = availableCities.find((city) => normalizeKey(city.name) === normalizeKey(cityName));
                        if (exactCityMatch) {
                          finalCity = exactCityMatch.name;
                        } else {
                          // Find closest city by lat/lon
                          let closestCity = availableCities[0];
                          let minDistance = Infinity;
                          availableCities.forEach((city) => {
                            if (city.latitude != null && city.longitude != null) {
                              const dist = Math.sqrt(Math.pow(Number(city.latitude) - lat, 2) + Math.pow(Number(city.longitude) - lon, 2));
                              if (dist < minDistance) {
                                minDistance = dist;
                                closestCity = city;
                              }
                            }
                          });
                          finalCity = closestCity?.name ?? availableCities[0]?.name ?? "";
                        }
                      } else {
                        finalCity = availableCities[0]?.name ?? "";
                      }
                      
                      const xPoint = Math.max(0, Math.min(rect.width, x));
                      const yPoint = Math.max(0, Math.min(rect.height, y));
                      setSelectedMapPoint({
                        x: xPoint,
                        y: yPoint,
                        lat,
                        lon,
                        countryCode,
                        countryName,
                        stateCode: selectedStateCode,
                        stateName,
                        city: finalCity,
                      });
                      setMapMessage(`Selected ${finalCity || stateName || countryName}, ${countryName}. Confirm to show this wall or click again to change.`);
                      setMapLoading(false);
                      return;
                    } catch (error) {
                      console.debug(error);
                      setMapMessage("Map lookup failed. Try another click.");
                    } finally {
                      setMapLoading(false);
                    }
                  }}
                />
                {selectedMapPoint ? (
                  <div className="map-pin" style={{ left: selectedMapPoint.x, top: selectedMapPoint.y }} />
                ) : null}
              </div>
              {selectedMapPoint ? (
                (() => {
                  const hasStates = csc ? csc.State.getStatesOfCountry(selectedMapPoint.countryCode).length > 0 : false;
                  const suppressStateFor = new Set(["TR"]);
                  const showState = hasStates && selectedMapPoint.stateName && !suppressStateFor.has(selectedMapPoint.countryCode);
                  return (
                    <div className="map-selection-summary">
                      <strong>{selectedMapPoint.city || selectedMapPoint.countryName}</strong>
                      <span>{showState ? `${selectedMapPoint.stateName}, ${selectedMapPoint.countryName}` : selectedMapPoint.countryName}</span>
                      <span>{`Lat ${selectedMapPoint.lat.toFixed(2)}, Lon ${selectedMapPoint.lon.toFixed(2)}`}</span>
                    </div>
                  );
                })()
              ) : null}
            </div>
            <div className="map-picker-actions">
              <button className="secondary" type="button" onClick={() => {
                setSelectedMapPoint(null);
                setMapMessage("Click on the map to choose a location.");
              }}>
                Cancel
              </button>
              <button className="primary" type="button" disabled={!selectedMapPoint || mapLoading} onClick={() => {
                if (!selectedMapPoint) return;
                setSelectedCountry(selectedMapPoint.countryCode || selectedCountry);
                setSelectedState(selectedMapPoint.stateCode || selectedState);
                setSelectedCity(selectedMapPoint.city || selectedCity);
                setQuery("");
                updateLocationQuery(selectedMapPoint.countryCode || selectedCountry, selectedMapPoint.stateCode || selectedState, selectedMapPoint.city || selectedCity);
                setMapPickerOpen(false);
                setSelectedMapPoint(null);
                setLocationDropdown(true);
              }}>
                Okay
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section
        className={`wall${pendingCard ? " is-placing" : ""}${listView ? " is-list-view" : ""}`}
        ref={wallRef}
        aria-label="Community advertisement wall"
        style={{ backgroundImage: "linear-gradient(#0001, #0001), url('/assets/wall-texture.png')" }}
        onClick={(e) => { if (e.target === e.currentTarget && selected) closeCard(); }}
        onKeyDown={handleWallKeyDown}
      >
        <div className="wall-grain" />
        {isLoading ? <WallSkeletons listView={listView} /> : (
          listView ? (
            visible.length ? (
              <div className="list-card-list">
                {visible.map((card, index) => (
                  <WallCard
                    key={card.id}
                    card={card}
                    active={selected?.id === card.id}
                    onOpen={openCard}
                    onFront={front}
                    flipped={flippedCardIds.has(String(card.id))}
                    onFlip={flipCard}
                    zIndex={index + 1}
                  />
                ))}
              </div>
            ) : ownCardsOnly ? (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · My cards"
                title="No cards from you on this wall."
                body="Turn off the filter to see everyone again."
                actionLabel="Show all cards"
                onAction={() => setOwnCardsOnly(false)}
              />
            ) : cards.length === 0 ? (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · Empty wall"
                title={`Be the first in ${selectedCity || locationLabel()}!`}
                body="Post the first listing here and take the top spot on this wall."
                actionLabel="Post your card"
                onAction={openComposer}
              />
            ) : (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · No matches"
                title="Nothing matched your filters."
                body="Try broadening your search or reset filters."
                actionLabel="Reset filters"
                onAction={resetFilters}
              />
            )
          ) : (
            visible.length ? (
              visible.map((sourceCard) => {
                const override = positionOverrides[String(sourceCard.id)];
                const card = override ? { ...sourceCard, ...override } : sourceCard;
                const ownerDraggable = Boolean(onMoveCard && ownedCardIds?.has(String(card.id)));
                const ownerExpiry = ownerDraggable ? ownerExpiryMap?.get(String(card.id)) : undefined;
                const expiringSoon = ownerExpiry !== undefined && ownerExpiry <= Date.now() + THREE_DAYS_MS;
                return (
                  <WallCard
                    key={card.id}
                    card={card}
                    active={selected?.id === card.id}
                    onOpen={handleCardClick}
                    onFront={front}
                    flipped={flippedCardIds.has(String(card.id))}
                    onFlip={flipCard}
                    ownerDraggable={ownerDraggable}
                    onRotate={ownerDraggable ? rotateOwnedCard : undefined}
                    expiringSoon={expiringSoon}
                    dragging={movingCardId === String(card.id)}
                    onDragStart={startCardMove}
                    onDragMove={moveOwnedCard}
                    onDragEnd={finishCardMove}
                    zIndex={visualZIndex(card)}
                  />
                );
              })
            ) : ownCardsOnly ? (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · My cards"
                title="No cards from you on this wall."
                body="Turn off the filter to see everyone again."
                actionLabel="Show all cards"
                onAction={() => setOwnCardsOnly(false)}
              />
            ) : cards.length === 0 ? (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · Empty wall"
                title={`Be the first in ${selectedCity || locationLabel()}!`}
                body="Post the first listing here and take the top spot on this wall."
                actionLabel="Post your card"
                onAction={openComposer}
              />
            ) : (
              <EmptyWallCard
                flag={countryFlagEmoji(selectedCountry)}
                eyebrow="Notice · No matches"
                title="Nothing matched your filters."
                body="Try broadening your search or reset filters."
                actionLabel="Reset filters"
                onAction={resetFilters}
              />
            )
          )
        )}
        <div className="wall-tools">
          {showSignedOutAuth ? (
            <button type="button" className="wall-tools-link" aria-label="Open sign in" onClick={() => onRequestSignIn?.()}>
              <LogIn />
            </button>
          ) : null}
          {isSignedIn && ownedCardIds ? (
            <button
              aria-label={ownCardsOnly ? "Show all cards" : "Show only my cards"}
              title={ownCardsHint}
              onClick={() => setOwnCardsOnly((v) => !v)}
              className={ownCardsOnly ? "is-active" : ""}
            >
              <Bookmark fill={ownCardsOnly ? "currentColor" : "none"} />
              <span>My cards</span>
            </button>
          ) : null}
          <button aria-label={listView ? "Switch to wall view" : "Switch to list view"} onClick={() => setListView((v) => !v)}>
            {listView ? <LayoutGrid /> : <LayoutList />}
            <span>{listView ? "Wall" : "List"}</span>
          </button>
          <button aria-label="Show newest cards" onClick={() => setFresh(true)}><Layers3 /><span>Newest</span></button>
          {/* <button aria-label="Reset wall" onClick={resetFilters}><RotateCcw /><span>Reset</span></button> */}
        </div>
        <div className="wall-count">
          {wallViewCount !== undefined && mode === "connected" ? `${wallViewCount.toLocaleString()} WALL VIEWS · ` : ""}
          {locationReady
            ? `${visible.length} CARDS · ${locationLabel()}${locationWeather ? ` · ${Math.round(locationWeather.tempC)}°C / ${Math.round(locationWeather.tempC * 9 / 5 + 32)}°F` : ""}`
            : "LOCATING..."}
        </div>
              {pendingCard ? (
                <PlacementMode
                  card={pendingCard}
                  position={placement}
                  dragging={dragging}
                  onDragStart={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }}
                  onMove={movePlacement}
                  onDragEnd={() => setDragging(false)}
                  onCancel={() => { setPendingCard(null); setDragging(false); }}
                  onRandom={() => setPlacement({ x: 8 + Math.random() * (window.innerWidth < 780 ? 35 : 68), y: Math.max(60, window.scrollY + 60 + Math.random() * 450) })}
                  onConfirm={post}
                  onRotate={(rotation) => setPendingCard((current) => current ? { ...current, rotation } : current)}
                  isSaving={isSaving}
                />
              ) : null}
        {!listView ? <WallMinimap cards={visible} wallRef={wallRef} /> : null}
      </section>
      {notice ? <div className="notice-toast" role="status">{notice}</div> : null}
      <footer className={`app-footer${mode === "connected" && pendingCardsOnSelectedWall > 0 && onRefreshWall ? " has-refresh-notice" : ""}`}>
        <div className="footer-inner">
          {/* left — intentionally empty */}
          <div className="footer-col footer-col-left" />

          {/* center — legal links */}
          <nav className="footer-col footer-col-center footer-legal" aria-label="Legal links">
            <Link href="/terms-and-conditions">Terms & Conditions</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
            <BugReportLink />
            <PrivacySettingsLink />
            <ContactLink />
          </nav>

          {/* right — digest widget */}
          <div className="footer-col footer-col-right">
            {mode === "connected" && locationReady && selectedCountry && onSubscribeDigest ? (
              digestStatus === "done" ? (
                <p className="footer-digest-success">{digestMessage}</p>
              ) : (
                <div className="footer-digest-widget">
                  <div className="footer-digest-copy">
                    <p className="footer-digest-eyebrow">Weekly Digest</p>
                    <h3 className="footer-digest-headline">New in {locationLabel()}, every Monday.</h3>
                  </div>
                  <form
                    className="footer-digest-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!digestEmail.trim()) return;
                      setDigestStatus("submitting");
                      try {
                        const result = await onSubscribeDigest(digestEmail.trim(), selectedCountry, selectedState, selectedCity);
                        setDigestMessage(result.alreadySubscribed
                          ? `Already subscribed for ${locationLabel()}.`
                          : `You're in! Digest for ${locationLabel()} lands every Monday.`);
                        setDigestStatus("done");
                        setDigestEmail("");
                        if (!result.alreadySubscribed) {
      captureAnalytics("digest_subscribed", {
                            location_country: selectedCountry,
                            location_state: selectedState,
                            location_city: selectedCity,
                          });
                        }
                      } catch {
                        setDigestMessage("Could not subscribe. Try again.");
                        setDigestStatus("error");
                        setTimeout(() => setDigestStatus("idle"), 3000);
                      }
                    }}
                  >
                    <input
                      type="email"
                      className="footer-digest-input"
                      placeholder="your@email.com"
                      value={digestEmail}
                      onChange={(e) => setDigestEmail(e.target.value)}
                      disabled={digestStatus === "submitting"}
                      required
                    />
                    <button type="submit" className="footer-digest-btn" disabled={digestStatus === "submitting"}>
                      {digestStatus === "submitting" ? "…" : "Subscribe"}
                    </button>
                  </form>
                </div>
              )
            ) : null}
          </div>
        </div>
      </footer>
      {mode === "connected" && pendingCardsOnSelectedWall > 0 && onRefreshWall ? (
        <button className="wall-refresh-notice" type="button" onClick={onRefreshWall}>
          <RefreshCw />
          <span>{pendingCardsOnSelectedWall === 1 ? "1 new card on this wall" : `${pendingCardsOnSelectedWall} new cards on this wall`}</span>
        </button>
      ) : null}
      {error ? <div className="error-toast" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div> : null}
      {stackPickerCards ? (
        <div className="stack-picker-backdrop" onClick={() => setStackPickerCards(null)}>
          <div className="stack-picker" onClick={(event) => event.stopPropagation()}>
            <div className="stack-picker-header">
              <div className="stack-picker-title-row">
                <span className="stack-picker-count" aria-label={`${stackPickerCards.length} cards`}>{stackPickerCards.length}</span>
                <strong>Stacked cards at this spot</strong>
              </div>
              <button className="icon-btn" onClick={() => setStackPickerCards(null)} aria-label="Close"><X /></button>
            </div>
            <p className="stack-picker-subtitle">Pick which card you want to open.</p>
            <div className="stack-picker-list">
              {stackPickerCards.map((card) => {
                const views = viewCounts[String(card.id)] ?? card.clicks ?? 0;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`stack-picker-card theme-${card.theme}`}
                    onClick={() => {
                      setStackPickerCards(null);
                      openCard(card);
                    }}
                  >
                    <span className="card-tape" aria-hidden="true" />
                    <span className="card-view-counter" aria-label={`${views} views`}>{views} views</span>
                    <div className="stack-picker-copy">
                      <p className="card-category">{card.category}</p>
                      <h2>{card.name}</h2>
                      <p className="card-line">{card.line}</p>
                    </div>
                    {card.thumbnailImages?.[0] || card.images[0] ? <img src={card.thumbnailImages?.[0] ?? card.images[0]} alt="" draggable={false} loading="lazy" decoding="async" /> : null}
                    <footer>
                      <span>{card.area}</span>
                      {card.price ? <strong>{card.price}</strong> : null}
                    </footer>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {selected ? (() => { const isOwnedCard = ownedCardIds?.has(String(selected.id)) ?? false; return <DetailPanel key={String(selected.id)} card={selected} onClose={closeCard} viewCount={viewCounts[String(selected.id)] ?? selected.clicks ?? 0} onEvent={(event) => onCardEvent?.(selected, event)} onReport={onReportCard ? (reason, details) => onReportCard(selected, reason, details) : undefined} canSaveCard={isSignedIn && !isOwnedCard} saved={savedCardIds.has(String(selected.id))} onSetSaved={onSetSavedCard ? (saved) => onSetSavedCard(selected, saved) : undefined} onRequestSignIn={onRequestSignIn} liked={likedCardIds?.has(String(selected.id)) ?? false} canLike={!isOwnedCard} onToggleLike={onToggleLike ? () => onToggleLike(selected) : undefined} similarCards={similarCards} onCardOpen={openCard} />; })() : null}
      {dashboard && ownerCards && onSetCardStatus && onUpdateCard && onDeleteCard && onRenewCard ? (
        <OwnerDashboard
          cards={ownerCards}
          savedCards={savedCards}
          savedWalls={savedWalls}
          loading={ownerCardsLoading}
          onClose={() => setDashboard(false)}
          onCreate={createFromDashboard}
          onView={(card) => { setDashboard(false); openCard(card); }}
          onRemoveSaved={removeSavedCard}
          onRemoveSavedWall={async (wall) => { await onRemoveSavedWall?.(wall); }}
          onNavigateToWall={(wall) => { router.push(wall.path); }}
          onSetVisibility={onSetCardStatus}
          onUpdate={async (card, update) => {
            await onUpdateCard(card, update);
            setSelected((current) => current && String(current.id) === String(card.id) ? { ...current, ...update } : current);
          }}
          onDelete={async (card) => {
            await onDeleteCard(card);
            setSelected((current) => current && String(current.id) === String(card.id) ? null : current);
          }}
          onRenew={onRenewCard}
          onCancelAutoRenew={onCancelAutoRenewCard}
          profile={profile ?? null}
          onRequestVerification={onRequestVerification}
          cardDailyStats={cardDailyStats}
        />
      ) : null}
      {composer ? <Composer onClose={() => setComposer(false)} onReady={beginPlacement} initialLocation={{ country: selectedCountry, state: selectedState, city: selectedCity }} isVerified={profile?.verified ?? false} /> : null}
      {showTip && <div className="onboard-tip" onAnimationEnd={() => setShowTip(false)}>Tap a card to open it · Drag to move it</div>}
    </main>
  );
}
