"use client";

import {
  ChevronDown,
  Globe,
  Layers3,
  LayoutDashboard,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useRef, useState, useEffect, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Country, State, City } from "country-state-city";
import { Composer } from "./composer";
import { DetailPanel } from "./detail-panel";
import { PlacementMode } from "./placement-mode";
import { OwnerDashboard } from "./owner-dashboard";
import { seedCards } from "./seed-cards";
import { WallCard } from "./wall-card";
import { categories, getCardFormat, type CardDraft, type CardUpdate, type CreateCard, type OwnerCard, type Placement, type RenewalAmount, type WallCard as WallCardModel } from "./types";

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
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onCardEvent?: (card: WallCardModel, event: "website" | "phone" | "email" | "social" | "save" | "share") => void;
  onReportCard?: (card: WallCardModel, reason: "spam" | "scam" | "inappropriate" | "expired" | "other", details?: string) => Promise<void>;
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

export function WallApp({ mode, cards: remoteCards, pendingCreatedCards = [], onRefreshWall, onCreateCard, onCardOpen, onRequestSignIn, isSignedIn = mode === "demo", isLoading = false, authControl, notice, ownerCards, ownerCardsLoading = false, onSetCardStatus, onUpdateCard, onDeleteCard, onRenewCard, onMoveCard, ownedCardIds, isAdmin = false, onOpenAdmin, onCardEvent, onReportCard }: WallAppProps) {
  const [demoCards, setDemoCards] = useState<WallCardModel[]>(seedCards);
  const cards = mode === "connected" ? (remoteCards ?? []) : demoCards;
  const [selected, setSelected] = useState<WallCardModel | null>(null);
  const [composer, setComposer] = useState(false);
  const [dashboard, setDashboard] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [fresh, setFresh] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [positionOverrides, setPositionOverrides] = useState<Record<string, Placement>>({});
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [stackPickerCards, setStackPickerCards] = useState<WallCardModel[] | null>(null);
  const [layers, setLayers] = useState<string[]>(seedCards.map((card) => card.id));
  const [mobileMenu, setMobileMenu] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardDraft | null>(null);
  const [placement, setPlacement] = useState<Placement>({ x: 40, y: 170 });
  const [dragging, setDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locationDropdown, setLocationDropdown] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
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
  const wallRef = useRef<HTMLElement>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movePositionRef = useRef<Placement | null>(null);
  const currentCardParam = searchParams.get("card");

  useEffect(() => {
    if (cards.length === 0) return;
    const sharedCardId = currentCardParam;
    if (!sharedCardId) return;
    const sharedCard = cards.find((card) => String(card.id) === sharedCardId);
    if (sharedCard && String(selected?.id) !== sharedCardId) {
      setSelected(sharedCard);
    }
  }, [cards, currentCardParam, selected?.id]);

  const syncCardParam = (cardId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (cardId) next.set("card", cardId);
    else next.delete("card");
    router.replace(`${pathname}?${next.toString()}`);
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

  const updateLocationQuery = (country: string, state: string, city: string) => {
    const query: Record<string, string> = { country };
    if (state) query.state = state;
    if (city) query.city = city;
    router.replace(`${pathname}?${new URLSearchParams(query).toString()}`);
  };

  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlState = searchParams.get("state");
    const urlCity = searchParams.get("city");

    const setLocationFromUrl = () => {
      if (!urlCountry) return false;
      const normalizedCountry = String(urlCountry).toUpperCase();
      const allCountries = Country.getAllCountries();
      if (!allCountries.some((country) => country.isoCode === normalizedCountry)) return false;
      const states = State.getStatesOfCountry(normalizedCountry);
      const stateCode = urlState && states.some((state) => state.isoCode === urlState.toUpperCase()) ? urlState.toUpperCase() : states[0]?.isoCode ?? "";
      const cities = stateCode ? City.getCitiesOfState(normalizedCountry, stateCode) : [];
      const cityName = urlCity && cities.some((city) => city.name === urlCity) ? urlCity : cities[0]?.name ?? "";
      setSelectedCountry(normalizedCountry);
      setSelectedState(stateCode);
      setSelectedCity(cityName);
      return true;
    };

    const loadLocalLocation = () => {
      try {
        const raw = window.localStorage.getItem("wallLocation");
        if (!raw) return false;
        const saved = JSON.parse(raw) as { country: string; state: string; city: string };
        if (!saved?.country) return false;
        const allCountries = Country.getAllCountries();
        if (!allCountries.some((country) => country.isoCode === saved.country)) return false;
        const states = State.getStatesOfCountry(saved.country);
        const stateCode = states.some((state) => state.isoCode === saved.state) ? saved.state : states[0]?.isoCode ?? "";
        const cities = stateCode ? City.getCitiesOfState(saved.country, stateCode) : [];
        const cityName = cities.some((city) => city.name === saved.city) ? saved.city : cities[0]?.name ?? "";
        setSelectedCountry(saved.country);
        setSelectedState(stateCode);
        setSelectedCity(cityName);
        return true;
      } catch {
        return false;
      }
    };

    if (setLocationFromUrl()) {
      setLocationReady(true);
      return;
    }

    if (loadLocalLocation()) {
      setLocationReady(true);
      return;
    }

    fetchUserLocation().then((location) => {
      if (!location) {
        setLocationReady(true);
        return;
      }
      setSelectedCountry(location.country);
      setSelectedState(location.state);
      setSelectedCity(location.city);
      updateLocationQuery(location.country, location.state, location.city);
      persistLocation(location.country, location.state, location.city);
      setLocationReady(true);
    }).catch(() => {
      setLocationReady(true);
    });
  }, [pathname, router, searchParams]);

  const availableStates = State.getStatesOfCountry(selectedCountry);
  const availableCities = selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];
  const hasStateOptions = availableStates.length > 0;
  const hasCityOptions = availableCities.length > 0;

  const applyLocation = (country: string, state: string, city: string) => {
    updateLocationQuery(country, state, city);
    persistLocation(country, state, city);
    setLocationNotice(`Location applied. Showing ${locationLabel()} wall.`);
    window.setTimeout(() => setLocationNotice(null), 3200);
    setLocationDropdown(false);
  };

  const resetToDefault = () => {
    const defaultCountry = defaultSeedLocation.country;
    const defaultState = defaultSeedLocation.state;
    const defaultCity = defaultSeedLocation.city;
    setSelectedCountry(defaultCountry);
    setSelectedState(defaultState);
    setSelectedCity(defaultCity);
    persistLocation(defaultCountry, defaultState, defaultCity);
    updateLocationQuery(defaultCountry, defaultState, defaultCity);
    setLocationNotice("Reset to default wall.");
    window.setTimeout(() => setLocationNotice(null), 3200);
    setLocationDropdown(false);
  };

  const useMyLocation = async () => {
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
    persistLocation(location.country, location.state, location.city);
    updateLocationQuery(location.country, location.state, location.city);
    setLocationNotice(`Using your location: ${locationText}`);
    window.setTimeout(() => setLocationNotice(null), 3200);
    setLocationDropdown(false);
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
    const result = cards.filter((card) => {
      if (category !== "All" && card.category !== category) return false;
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      const text = `${card.name}`.toLowerCase();
      return text.includes(needle);
    });
    return fresh ? result.toReversed() : result;
  }, [cards, category, deferredQuery, fresh, selectedCountry, selectedState, selectedCity, locationReady]);

  const pendingCardsOnSelectedWall = useMemo(() => {
    if (!locationReady) return 0;
    return pendingCreatedCards.filter((card) => {
      if (selectedCountry && card.country !== selectedCountry) return false;
      if (selectedState && card.state !== selectedState) return false;
      if (selectedCity && card.city !== selectedCity) return false;
      return true;
    }).length;
  }, [locationReady, pendingCreatedCards, selectedCity, selectedCountry, selectedState]);

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
    syncCardParam(openedId);
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

  const resetFilters = () => {
    startTransition(() => {
      setCategory("All");
      setQuery("");
      setFresh(false);
      const defaultCountry = defaultSeedLocation.country;
      const defaultState = defaultSeedLocation.state;
      const defaultCity = defaultSeedLocation.city;
      setSelectedCountry(defaultCountry);
      setSelectedState(defaultState);
      setSelectedCity(defaultCity);
    });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetFilters}><center>WALL</center><span>LOCAL ADS, STUCK HERE</span></button>
        <button className="location" onClick={() => { if (locationReady) setLocationDropdown(!locationDropdown); }}>
          <MapPin />
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
            {locationReady ? <span aria-hidden>{countryFlagEmoji(selectedCountry)}</span> : null}
            <span>{locationReady ? locationLabel() : "Locating..."}</span>
          </span>
          <ChevronDown />
        </button>
        {/* Map picker temporarily hidden */}
        <nav className={mobileMenu ? "open" : ""}>
          <div className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by card" aria-label="Search advertisements" /></div>
          <label className="filter-select">Browse<select value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
          {ownerCards ? <button onClick={() => { setDashboard(true); setMobileMenu(false); }}><LayoutDashboard /> My cards</button> : null}
          {isAdmin && onOpenAdmin ? <button className="admin-nav-button" onClick={() => { onOpenAdmin(); setMobileMenu(false); }}><ShieldCheck /> Admin</button> : null}
          <button className="mobile-nav-post" onClick={openComposer}><Plus />Post your card</button>
        </nav>
        {authControl ? <div className="auth-control">{authControl}</div> : null}
        <button className="primary post-button" onClick={openComposer}><Plus />Post your card</button>
        <button className="icon-btn mobile-menu" onClick={() => setMobileMenu((value) => !value)} aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu}><Menu /></button>
      </header>
      {locationDropdown ? (
        <div className="location-dropdown-backdrop" onClick={() => setLocationDropdown(false)}>
          <div className="location-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="location-dropdown-header">
              <strong>Choose your location</strong>
              <button className="icon-btn" onClick={() => setLocationDropdown(false)} aria-label="Close"><X /></button>
            </div>
            <div className="location-dropdown-body">
              <label>Country<select value={selectedCountry} onChange={(event) => {
                const countryCode = event.target.value;
                const nextStates = State.getStatesOfCountry(countryCode);
                const nextState = nextStates[0]?.isoCode ?? "";
                const nextCities = nextState ? City.getCitiesOfState(countryCode, nextState) : [];
                const nextCity = nextCities[0]?.name ?? "";
                setSelectedCountry(countryCode);
                setSelectedState(nextState);
                setSelectedCity(nextCity);
              }}>
                {Country.getAllCountries().map((country) => <option key={country.isoCode} value={country.isoCode}>{country.name}</option>)}
              </select></label>
              {hasStateOptions ? (
                <label>State<select value={selectedState} onChange={(event) => {
                  const stateCode = event.target.value;
                  const nextCities = City.getCitiesOfState(selectedCountry, stateCode);
                  setSelectedState(stateCode);
                  setSelectedCity(nextCities[0]?.name ?? "");
                }}>
                  {availableStates.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
                </select></label>
              ) : null}
              {hasCityOptions ? (
                <label>City<select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
                  {availableCities.map((city) => <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>{city.name}</option>)}
                </select></label>
              ) : null}
            </div>
            {locationNotice ? <div className="location-dropdown-notice">{locationNotice}</div> : null}
            <div className="location-dropdown-actions">
              <button type="button" className="secondary" onClick={useMyLocation}>Use my location</button>
              <button type="button" className="secondary" onClick={resetToDefault}>Reset wall</button>
              <button type="button" className="primary location-dropdown-select" onClick={() => applyLocation(selectedCountry, selectedState, selectedCity)}>Apply location</button>
            </div>
          </div>
        </div>
      ) : null}
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
        className={`wall ${pendingCard ? "is-placing" : ""}`}
        ref={wallRef}
        aria-label="Community advertisement wall"
        style={{ backgroundImage: "linear-gradient(#0001, #0001), url('/assets/wall-texture.png')" }}
      >
        <div className="wall-grain" />
        {!isLoading ? (
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
          ) : (
            <div className="empty-note"><strong>Nothing stuck here yet.</strong><span>Try another corner of the wall.</span><button onClick={resetFilters}>Reset filters</button></div>
          )
        ) : null}
        <div className="wall-tools">
          <button aria-label="Show newest cards" onClick={() => setFresh(true)}><Layers3 /></button>
          <button aria-label="Reset wall" onClick={resetFilters}><RotateCcw /></button>
        </div>
        <div className="wall-count">
          {locationReady
            ? `${visible.length} CARDS · ${locationLabel()}${locationWeather ? ` · ${Math.round(locationWeather.tempC)}°C/${Math.round(locationWeather.tempC * 9 / 5 + 32)}°F` : ""}`
            : "LOCATING WALL..."}
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
                    {card.images[0] ? <img src={card.images[0]} alt="" draggable={false} /> : null}
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
      {selected ? <DetailPanel card={selected} onClose={() => { setSelected(null); syncCardParam(null); }} viewCount={viewCounts[String(selected.id)] ?? selected.clicks ?? 0} onEvent={(event) => onCardEvent?.(selected, event)} onReport={onReportCard ? (reason, details) => onReportCard(selected, reason, details) : undefined} /> : null}
      {dashboard && ownerCards && onSetCardStatus && onUpdateCard && onDeleteCard && onRenewCard ? (
        <OwnerDashboard
          cards={ownerCards}
          loading={ownerCardsLoading}
          onClose={() => setDashboard(false)}
          onCreate={createFromDashboard}
          onView={(card) => { setDashboard(false); setSelected(card); }}
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
        />
      ) : null}
      {composer ? <Composer onClose={() => setComposer(false)} onReady={beginPlacement} initialLocation={{ country: selectedCountry, state: selectedState, city: selectedCity }} /> : null}
    </main>
  );
}
