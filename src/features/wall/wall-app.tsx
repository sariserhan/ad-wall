"use client";

import {
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Layers3,
  Link2,
  LocateFixed,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { startTransition, useCallback, useDeferredValue, useMemo, useRef, useState, useEffect, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Country, State, City } from "country-state-city";
import { LocationCombobox } from "./location-combobox";

const Composer = dynamic(() => import("./composer").then((m) => ({ default: m.Composer })), { ssr: false, loading: () => null });
const DetailPanel = dynamic(() => import("./detail-panel").then((m) => ({ default: m.DetailPanel })), { ssr: false, loading: () => null });
const PlacementMode = dynamic(() => import("./placement-mode").then((m) => ({ default: m.PlacementMode })), { ssr: false, loading: () => null });
const OwnerDashboard = dynamic(() => import("./owner-dashboard").then((m) => ({ default: m.OwnerDashboard })), { ssr: false, loading: () => null });
import { seedCards } from "./seed-cards";
import { WallCard } from "./wall-card";
import { categories, SUBCATEGORY_OPTIONS, getCardFormat, type CardCategory, type CardDraft, type CardUpdate, type CreateCard, type OwnerCard, type Placement, type RenewalAmount, type WallCard as WallCardModel } from "./types";
import { buildWallPath, toCategorySlug } from "@/lib/wall-slug";
import type { SavedWall } from "./types";

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
  onRenewCard?: (card: OwnerCard, paidAmount: RenewalAmount) => Promise<void>;
  onMoveCard?: (card: WallCardModel, placement: Placement) => Promise<void>;
  ownedCardIds?: ReadonlySet<string>;
  likedCardIds?: ReadonlySet<string>;
  onToggleLike?: (card: WallCardModel) => Promise<void>;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
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
  onUpdateProfile?: (username: string | undefined, businessName: string | undefined) => Promise<void>;
  onRequestVerification?: (plan: "monthly" | "annual") => Promise<void>;
  cardDailyStats?: { dates: string[]; byCard: Record<string, number[]> } | null;
  wallViewCount?: number;
  onCategoryChange?: (category: string) => void;
}

const MAX_CARD_Y = 1500;

function makeDemoCard(draft: CardDraft, placement: Placement, zIndex: number): WallCardModel {
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
    images: draft.previews,
    x: placement.x,
    y: placement.y,
    rotation: -3 + Math.random() * 6,
    width: getCardFormat(draft.imageMode === "business-card" ? "biz" : draft.theme).width,
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

export function WallApp({ mode, cards: remoteCards, pendingCreatedCards = [], onRefreshWall, onCreateCard, onCardOpen, onRequestSignIn, isSignedIn = mode === "demo", isLoading = false, authControl, notice, ownerCards, ownerCardsLoading = false, onSetCardStatus, onUpdateCard, onDeleteCard, onRenewCard, onMoveCard, ownedCardIds, likedCardIds, onToggleLike, isAdmin = false, onOpenAdmin, onCardEvent, onReportCard, initialCardId, initialLocation, initialKeyword, initialCategory, savedCards = [], onSetSavedCard, savedWall = false, onSetSavedWall, savedWalls = [], onRemoveSavedWall, profile, onUpdateProfile, onRequestVerification, cardDailyStats, wallViewCount, onCategoryChange }: WallAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [demoCards, setDemoCards] = useState<WallCardModel[]>(seedCards);
  const cards = mode === "connected" ? (remoteCards ?? []) : demoCards;
  const [selected, setSelected] = useState<WallCardModel | null>(null);
  const [composer, setComposer] = useState(false);
  const [dashboard, setDashboard] = useState(false);

  useEffect(() => {
    const locked = !!selected || dashboard || composer;
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
  const [category, setCategory] = useState<(typeof categories)[number]>(() => {
    const cat = initialCategory ?? "";
    return (categories as readonly string[]).includes(cat) ? cat as (typeof categories)[number] : "All";
  });
  const applyCategory = useCallback((cat: (typeof categories)[number]) => {
    setCategory(cat);
    onCategoryChange?.(cat);
  }, [onCategoryChange]);
  const [subcategory, setSubcategory] = useState(searchParams.get("subcategory") ?? "");
  const [query, setQuery] = useState(searchParams.get("keyword") ?? initialKeyword ?? "");
  const initialLocationRef = useRef(initialLocation);
  const deferredQuery = useDeferredValue(query);
  const [fresh, setFresh] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [positionOverrides, setPositionOverrides] = useState<Record<string, Placement>>({});
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [stackPickerCards, setStackPickerCards] = useState<WallCardModel[] | null>(null);
  const [layers, setLayers] = useState<string[]>(seedCards.map((card) => card.id));
  const [listView, setListView] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardDraft | null>(null);
  const [placement, setPlacement] = useState<Placement>({ x: 40, y: 170 });
  const [dragging, setDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDropdown, setLocationDropdown] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locating, setLocating] = useState(false);
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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(searchParams.get("neighborhood") ?? "");
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
  const [filterHasPhotos, setFilterHasPhotos] = useState(false);
  const [filterFeaturedOnly, setFilterFeaturedOnly] = useState(false);
  const [pendingSortBy, setPendingSortBy] = useState<"default" | "most-viewed" | "most-reviews">("default");
  const [pendingHasWebsite, setPendingHasWebsite] = useState(false);
  const [pendingHasPhotos, setPendingHasPhotos] = useState(false);
  const [pendingFeaturedOnly, setPendingFeaturedOnly] = useState(false);
  const wallRef = useRef<HTMLElement>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movePositionRef = useRef<Placement | null>(null);
  const closingCardRef = useRef<string | null>(null);
  const currentCardParam = initialCardId ?? searchParams.get("card");
  const savedCardIds = useMemo(() => new Set(savedCards.map((card) => String(card.id))), [savedCards]);

  useEffect(() => {
    if (cards.length === 0) return;
    const sharedCardId = currentCardParam;
    if (!sharedCardId) return;
    if (closingCardRef.current === sharedCardId) return;
    const sharedCard = cards.find((card) => {
      const fullId = String(card.id);
      return fullId === sharedCardId || fullId.startsWith(sharedCardId);
    });
    if (sharedCard && String(selected?.id) !== sharedCardId) {
      setSelected(sharedCard);
    }
  }, [cards, currentCardParam, selected?.id]);

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
    return Country.getAllCountries().find((country) => country.isoCode === isoCode)?.name ?? isoCode;
  };

  const getStateName = (country: string, stateCode: string) => {
    return State.getStatesOfCountry(country).find((state) => state.isoCode === stateCode)?.name ?? stateCode;
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
      const cached = window.sessionStorage.getItem("wall-ip-location-v1");
      const cachedEntry = cached ? JSON.parse(cached) as { expiresAt: number; data: Record<string, unknown> } : null;
      const data = cachedEntry && cachedEntry.expiresAt > Date.now()
        ? cachedEntry.data
        : await fetch("https://ipapi.co/json/").then((response) => response.json());
      if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) window.sessionStorage.setItem("wall-ip-location-v1", JSON.stringify({ expiresAt: Date.now() + 30 * 60 * 1000, data }));
      const countryCode = String(data.country_code || "US").toUpperCase();
      const allCountries = Country.getAllCountries();
      if (!allCountries.some((country) => country.isoCode === countryCode)) return null;
      const states = State.getStatesOfCountry(countryCode);
      const regionCode = String(data.region_code || data.region || "").trim();
      const cityNameRaw = String(data.city || "").trim();
      const ipLat = Number(data.latitude);
      const ipLon = Number(data.longitude);
      let stateCode = "";

      if (regionCode) {
        const candidate = states.find((state) => state.isoCode.toUpperCase() === regionCode.toUpperCase());
        if (candidate) {
          stateCode = candidate.isoCode;
        } else {
          const normalizedRegion = normalizeKey(regionCode);
          const matchedState = states.find((state) => normalizeKey(state.name) === normalizedRegion || normalizeKey(state.isoCode) === normalizedRegion || normalizedRegion.includes(normalizeKey(state.name)) || normalizeKey(state.name).includes(normalizedRegion));
          stateCode = matchedState?.isoCode ?? "";
        }
      }

      const cities = stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];
      let cityName = "";
      if (cityNameRaw && cities.length > 0) {
        const normalizedCity = normalizeKey(cityNameRaw);
        const exactCity = cities.find((city) => normalizeKey(city.name) === normalizedCity);
        const fuzzyCity = cities.find((city) => normalizeKey(city.name).includes(normalizedCity) || normalizedCity.includes(normalizeKey(city.name)));
        if (exactCity || fuzzyCity) {
          cityName = exactCity?.name ?? fuzzyCity?.name ?? "";
        } else if (Number.isFinite(ipLat) && Number.isFinite(ipLon)) {
          let best = cities[0];
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const city of cities) {
            if (city.latitude == null || city.longitude == null) continue;
            const dLat = Number(city.latitude) - ipLat;
            const dLon = Number(city.longitude) - ipLon;
            const distance = dLat * dLat + dLon * dLon;
            if (distance < bestDistance) {
              best = city;
              bestDistance = distance;
            }
          }
          cityName = best?.name ?? cities[0]?.name ?? "";
        } else {
          cityName = cities[0]?.name ?? "";
        }
      } else {
        if (Number.isFinite(ipLat) && Number.isFinite(ipLon) && cities.length > 0) {
          let best = cities[0];
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const city of cities) {
            if (city.latitude == null || city.longitude == null) continue;
            const dLat = Number(city.latitude) - ipLat;
            const dLon = Number(city.longitude) - ipLon;
            const distance = dLat * dLat + dLon * dLon;
            if (distance < bestDistance) {
              best = city;
              bestDistance = distance;
            }
          }
          cityName = best?.name ?? cities[0]?.name ?? "";
        } else {
          cityName = cities[0]?.name ?? "";
        }
      }
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

    const tryFetchForSelected = () => {
      if (!selectedCountry) return;
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
    applyCategory(cat);
    setSubcategory("");
  }, [initialCategory]);

  // Sync subcategory/neighborhood from query params (these stay as params)
  useEffect(() => {
    setSubcategory(searchParams.get("subcategory") ?? "");
    setSelectedNeighborhood(searchParams.get("neighborhood") ?? "");
  }, [searchParams]);

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
        if (saved?.country && Country.getAllCountries().some((c) => c.isoCode === saved.country)) {
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
      setPendingHasPhotos(filterHasPhotos);
      setPendingFeaturedOnly(filterFeaturedOnly);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOpen]);

  const availableStates = State.getStatesOfCountry(draftCountry);
  const availableCities = draftState ? City.getCitiesOfState(draftCountry, draftState) : [];
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
    setSelectedNeighborhood(neighborhood);
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
      const location = await fetchUserLocation();
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
      if (category !== "All" && card.category !== category) return false;
      if (subcategory && card.subcategory !== subcategory) return false;
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      if (selectedNeighborhood && card.neighborhood !== selectedNeighborhood) return false;
      if (filterHasWebsite && !card.website) return false;
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
    const tierWeight = (t?: string) => t === "gold" ? 3 : t === "silver" ? 2 : t === "bronze" ? 1 : 0;
    return [...filtered].sort((a, b) => {
      const tierDiff = tierWeight(b.featuredTier) - tierWeight(a.featuredTier);
      if (tierDiff !== 0) return tierDiff;
      return fresh ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    });
  }, [cards, category, subcategory, deferredQuery, fresh, sortBy, filterHasWebsite, filterHasPhotos, filterFeaturedOnly, selectedCountry, selectedState, selectedCity, selectedNeighborhood, locationReady]);

  const similarCards = useMemo(() => {
    if (!selected) return [];
    return visible.filter((c) => String(c.id) !== String(selected.id) && c.category === selected.category).slice(0, 3);
  }, [selected, visible]);

  const pendingCardsOnSelectedWall = useMemo(() => {
    if (!locationReady) return 0;
    return pendingCreatedCards.filter((card) => {
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      return true;
    }).length;
  }, [locationReady, pendingCreatedCards, selectedCity, selectedCountry, selectedState]);

  const removeSavedCard = async (card: WallCardModel) => {
    if (!onSetSavedCard) return;
    try {
      await onSetSavedCard(card, false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the card from saved list.");
    }
  };

  const front = (id: string) => setLayers((current) => [...current.filter((item) => item !== id), id]);

  const estimateCardHeight = (card: WallCardModel) => {
    if (card.imageMode === "business-card") return getCardFormat("biz").minHeight;
    if (card.images.length > 0) return 300;
    return 220;
  };

  const getCardRect = (card: WallCardModel) => {
    const wallWidth = wallRef.current?.getBoundingClientRect().width ?? window.innerWidth;
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

  const visualZIndex = (card: WallCardModel) => Math.max(card.zIndex, layers.indexOf(card.id) + 1);

  const getStackAtCard = (targetCard: WallCardModel) => {
    const targetRect = getCardRect(targetCard);
    const substantialOverlapThreshold = 0.9;
    const stack = visible.filter((candidate) => {
      const candidateRect = getCardRect(candidate);
      return overlapRatio(targetRect, candidateRect) >= substantialOverlapThreshold;
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
    setPositionOverrides((current) => ({ ...current, [String(card.id)]: next }));
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
  };

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
    const format = getCardFormat(draft.theme);
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
    const cardWidth = window.innerWidth < 780 ? 182 : 220;
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
      let card: WallCardModel | void;
      if (mode === "demo") {
        card = makeDemoCard(pendingCard, placement, cards.length + 1);
        setDemoCards((current) => [...current, card as WallCardModel]);
      } else {
        card = await onCreateCard?.(pendingCard, placement);
      }
      setPendingCard(null);
      if (card) {
        setLayers((current) => [...current, card.id]);
        setSelected(card);
      }
      setFresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The card could not be posted.");
    } finally {
      setIsSaving(false);
    }
  };

  const [shareNotice, setShareNotice] = useState(false);

  const shareWall = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice(true);
      window.setTimeout(() => setShareNotice(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const resetFilters = () => {
    startTransition(() => {
      applyCategory("All");
      setSubcategory("");
      setQuery("");
      setFresh(false);
      setSelectedNeighborhood("");
      setSortBy("default");
      setFilterHasWebsite(false);
      setFilterHasPhotos(false);
      setFilterFeaturedOnly(false);
      router.push("/");
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
                      options={Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name }))}
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
          <div className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, business or creator" aria-label="Search advertisements" /></div>
          <div className="filter-wrap">
            {filterOpen && <div className="filter-backdrop" onClick={() => setFilterOpen(false)} />}
            <button className="filter-btn" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen} aria-label="Open filters">
              <SlidersHorizontal />
              <span>Filter</span>
              {((category !== "All" ? 1 : 0) + (subcategory ? 1 : 0) + (selectedNeighborhood ? 1 : 0) + (fresh ? 1 : 0) + (sortBy !== "default" ? 1 : 0) + (filterHasWebsite ? 1 : 0) + (filterHasPhotos ? 1 : 0) + (filterFeaturedOnly ? 1 : 0)) > 0 && (
                <span className="filter-badge">{(category !== "All" ? 1 : 0) + (subcategory ? 1 : 0) + (selectedNeighborhood ? 1 : 0) + (fresh ? 1 : 0) + (sortBy !== "default" ? 1 : 0) + (filterHasWebsite ? 1 : 0) + (filterHasPhotos ? 1 : 0) + (filterFeaturedOnly ? 1 : 0)}</span>
              )}
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
                    setSubcategory(pendingSubcategory);
                    setFresh(pendingFresh);
                    setSortBy(pendingSortBy);
                    setFilterHasWebsite(pendingHasWebsite);
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
                  {((category !== "All" ? 1 : 0) + (subcategory ? 1 : 0) + (selectedNeighborhood ? 1 : 0) + (fresh ? 1 : 0) + (sortBy !== "default" ? 1 : 0) + (filterHasWebsite ? 1 : 0) + (filterHasPhotos ? 1 : 0) + (filterFeaturedOnly ? 1 : 0)) > 0 && (
                    <button className="filter-clear-btn" onClick={() => {
                      applyCategory("All"); setSubcategory(""); setSelectedNeighborhood(""); setFresh(false);
                      setSortBy("default"); setFilterHasWebsite(false); setFilterHasPhotos(false); setFilterFeaturedOnly(false);
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
          <button onClick={() => { void shareWall(); setMobileMenuOpen(false); }}><Link2 />{shareNotice ? "Copied!" : "Share Wall"}</button>
          {pathname && pathname !== "/" ? (
            <button
              className={savedWall ? "save-wall-btn saved" : "save-wall-btn"}
              onClick={() => {
                if (!isSignedIn) { onRequestSignIn?.(); return; }
                const wallLabel = [locationLabel(), category !== "All" ? category : null, subcategory || null].filter(Boolean).join(" · ");
                void onSetSavedWall?.(wallLabel, !savedWall);
                setMobileMenuOpen(false);
              }}
              aria-label={savedWall ? "Unsave this wall" : "Save this wall"}
            >
              <Bookmark />{savedWall ? "Wall saved" : "Save wall"}
            </button>
          ) : null}
          {ownerCards ? <button onClick={() => { setDashboard(true); setMobileMenuOpen(false); }}><LayoutDashboard /> My Board</button> : null}
          {isAdmin && onOpenAdmin ? <button className="admin-nav-button" onClick={() => { onOpenAdmin(); setMobileMenuOpen(false); }}><ShieldCheck /> Admin</button> : null}
          <button className="mobile-nav-post" onClick={() => { openComposer(); setMobileMenuOpen(false); }}><Plus />Post your card</button>
        </nav>
        {authControl ? <div className="auth-control">{authControl}</div> : null}
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
                      const states = State.getStatesOfCountry(countryCode);
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
                      const availableCities = City.getCitiesOfState(countryCode, selectedStateCode);
                      
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
                  const hasStates = State.getStatesOfCountry(selectedMapPoint.countryCode).length > 0;
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
      >
        <div className="wall-grain" />
        {!isLoading ? (
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
                    zIndex={index + 1}
                  />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="empty-note empty-note-first">
                <strong>Be the first in {selectedCity || locationLabel()}!</strong>
                <span>Get 10× more visibility as the first listing on this wall.</span>
                <button className="primary" onClick={openComposer}>Post your card</button>
              </div>
            ) : (
              <div className="empty-note"><strong>Nothing matched your filters.</strong><span>Try broadening your search or reset filters.</span><button onClick={resetFilters}>Reset filters</button></div>
            )
          ) : (
            visible.length ? (
              visible.map((sourceCard) => {
                const override = positionOverrides[String(sourceCard.id)];
                const card = override ? { ...sourceCard, ...override } : sourceCard;
                const ownerDraggable = Boolean(onMoveCard && ownedCardIds?.has(String(card.id)));
                return (
                  <WallCard
                    key={card.id}
                    card={card}
                    active={selected?.id === card.id}
                    onOpen={handleCardClick}
                    onFront={front}
                    ownerDraggable={ownerDraggable}
                    dragging={movingCardId === String(card.id)}
                    onDragStart={startCardMove}
                    onDragMove={moveOwnedCard}
                    onDragEnd={finishCardMove}
                    zIndex={Math.max(card.zIndex, layers.indexOf(card.id) + 1)}
                  />
                );
              })
            ) : cards.length === 0 ? (
              <div className="empty-note empty-note-first">
                <strong>Be the first in {selectedCity || locationLabel()}!</strong>
                <span>Get 10× more visibility as the first listing on this wall.</span>
                <button className="primary" onClick={openComposer}>Post your card</button>
              </div>
            ) : (
              <div className="empty-note"><strong>Nothing matched your filters.</strong><span>Try broadening your search or reset filters.</span><button onClick={resetFilters}>Reset filters</button></div>
            )
          )
        ) : null}
        <div className="wall-tools">
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
        {pendingCard ? <PlacementMode card={pendingCard} position={placement} dragging={dragging} onDragStart={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }} onMove={movePlacement} onDragEnd={() => setDragging(false)} onCancel={() => { setPendingCard(null); setDragging(false); }} onRandom={() => setPlacement({ x: 8 + Math.random() * (window.innerWidth < 780 ? 35 : 68), y: Math.max(60, window.scrollY + 60 + Math.random() * 450) })} onConfirm={post} isSaving={isSaving} /> : null}
      </section>
      {notice ? <div className="notice-toast" role="status">{notice}</div> : null}
      <footer className={`app-footer${mode === "connected" && pendingCardsOnSelectedWall > 0 && onRefreshWall ? " has-refresh-notice" : ""}`}>
        <nav className="legal-links" aria-label="Legal links">
          <Link href="/terms-and-conditions">Terms & Conditions</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </nav>
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
              <strong>Stacked cards at this spot</strong>
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
          profile={profile ?? null}
          onUpdateProfile={onUpdateProfile}
          onRequestVerification={onRequestVerification}
          cardDailyStats={cardDailyStats}
        />
      ) : null}
      {composer ? <Composer onClose={() => setComposer(false)} onReady={beginPlacement} initialLocation={{ country: selectedCountry, state: selectedState, city: selectedCity }} /> : null}
    </main>
  );
}
