"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LocateFixed, Loader2, Plus, X } from "lucide-react";
import { Country, State, City } from "country-state-city";
import { buildWallPath } from "@/lib/wall-slug";

const CACHE_KEY = "wall-ip-location-v2";
type Loc = { country: string; state: string; city: string };

async function resolveIpLocation(): Promise<Loc | null> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const entry = JSON.parse(raw) as { expiresAt: number; data: Loc };
      if (entry.expiresAt > Date.now() && entry.data.country) return entry.data;
    }
    const ipData = (await fetch("https://ipapi.co/json/").then((r) => r.json())) as Record<string, unknown>;
    const res = await fetch("/api/location/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: String(ipData.country_code ?? "US").toUpperCase(),
        regionCode: String(ipData.region_code ?? "").trim(),
        cityNameRaw: String(ipData.city ?? "").trim(),
      }),
    });
    const resolved = (await res.json()) as Loc;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + 30 * 60 * 1000, data: resolved }));
    return resolved;
  } catch {
    return null;
  }
}

export function HomePostButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Pre-fill from IP cache
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const entry = JSON.parse(raw) as { expiresAt: number; data: Loc };
        if (entry.expiresAt > Date.now() && entry.data.country) {
          setCountry(entry.data.country);
          setState(entry.data.state ?? "");
          setCity(entry.data.city ?? "");
        }
      }
    } catch {}
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLocate = async () => {
    setLocating(true);
    setLocateError("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude: lat, longitude: lon } = pos.coords;
            const res = await fetch(`/api/location/from-coords?lat=${lat}&lon=${lon}`);
            const data = (await res.json()) as Loc | null;
            if (data?.country) {
              setCountry(data.country); setState(data.state ?? ""); setCity(data.city ?? "");
            }
          } catch {
            // fall back to IP
            const loc = await resolveIpLocation();
            if (loc) { setCountry(loc.country); setState(loc.state ?? ""); setCity(loc.city ?? ""); }
            else setLocateError("Could not detect location.");
          } finally { setLocating(false); }
        },
        async () => {
          const loc = await resolveIpLocation();
          if (loc) { setCountry(loc.country); setState(loc.state ?? ""); setCity(loc.city ?? ""); }
          else setLocateError("Location permission denied.");
          setLocating(false);
        },
        { timeout: 8000 },
      );
    } else {
      const loc = await resolveIpLocation();
      if (loc) { setCountry(loc.country); setState(loc.state ?? ""); setCity(loc.city ?? ""); }
      else setLocateError("Could not detect location.");
      setLocating(false);
    }
  };

  const goPost = () => {
    setOpen(false);
    sessionStorage.setItem("wall-visit-skip", "1");
    router.push(buildWallPath(country, state, city) + "?post=1");
  };

  const allCountries = useMemo(() => {
    const all = Country.getAllCountries();
    const us = all.find((c) => c.isoCode === "US");
    return us ? [us, ...all.filter((c) => c.isoCode !== "US")] : all;
  }, []);

  const states = useMemo(() => (country ? State.getStatesOfCountry(country) : []), [country]);
  const cities = useMemo(() => (country && state ? City.getCitiesOfState(country, state) : []), [country, state]);

  const locationLabel = useMemo(() => {
    const parts = [city, state, !state ? country : ""].filter(Boolean);
    return parts.join(", ");
  }, [city, state, country]);

  return (
    <div className="home-post-wrap" ref={wrapRef}>
      <button className="home-nav-post" onClick={() => setOpen((o) => !o)}>
        <Plus size={16} />
        Post a card
      </button>

      {open && (
        <div className="home-post-picker">
          {/* Header */}
          <div className="home-post-picker-head">
            <span>Where are you posting?</span>
            <button type="button" className="home-post-picker-x" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          {/* Use my location */}
          <div className="home-post-picker-locate-row">
            <button
              type="button"
              className="home-post-locate-btn"
              onClick={() => void handleLocate()}
              disabled={locating}
            >
              {locating ? <Loader2 size={13} className="locate-spin" /> : <LocateFixed size={13} />}
              Use my location
            </button>
            {locateError ? <span className="home-post-locate-err">{locateError}</span> : null}
          </div>

          <div className="home-post-picker-divider">
            <span>or choose manually</span>
          </div>

          {/* Selects */}
          <div className="home-post-selects">
            <div className="home-post-select-wrap">
              <select
                className="home-post-select"
                value={country}
                onChange={(e) => { setCountry(e.target.value); setState(""); setCity(""); }}
              >
                {allCountries.map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="home-post-select-chevron" />
            </div>

            {states.length > 0 && (
              <div className="home-post-select-wrap">
                <select
                  className="home-post-select"
                  value={state}
                  onChange={(e) => { setState(e.target.value); setCity(""); }}
                >
                  <option value="">All of {allCountries.find((c) => c.isoCode === country)?.name ?? country}</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="home-post-select-chevron" />
              </div>
            )}

            {cities.length > 0 && (
              <div className="home-post-select-wrap">
                <select
                  className="home-post-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">All of {states.find((s) => s.isoCode === state)?.name ?? state}</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="home-post-select-chevron" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="home-post-picker-foot">
            {locationLabel ? (
              <span className="home-post-picker-loc-label">{locationLabel}</span>
            ) : null}
            <button className="primary home-post-picker-go" onClick={goPost}>
              Go post →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
