"use client";

import type { ComponentType, MouseEvent, PointerEvent, SVGProps } from "react";
import { MapPin } from "lucide-react";
import type { WallCard } from "./types";

type SocialKey = "instagram" | "facebook" | "tiktok" | "linkedin";

const InstagramIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
const FacebookIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M13.7 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5V13h2.8v8h3.4Z" /></svg>;
const TikTokIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 4c.5 2.7 2 4.2 4.5 4.6" /><path d="M15 4v11.2a4.2 4.2 0 1 1-3.5-4.1" /></svg>;
const LinkedinIcon = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M5.2 8.3H2.3V21h2.9V8.3ZM3.7 3A1.8 1.8 0 1 0 3.7 6.6 1.8 1.8 0 0 0 3.7 3ZM21.7 13.7c0-3.8-2-5.6-4.7-5.6-2.2 0-3.1 1.2-3.7 2V8.3h-2.9V21h2.9v-7c0-1.8.4-3.6 2.7-3.6 2.3 0 2.3 2.1 2.3 3.7V21h3.4v-7.3Z" /></svg>;

const socialConfig: Array<{ key: SocialKey; label: string; baseUrl: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { key: "instagram", label: "Instagram", baseUrl: "https://instagram.com/", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", baseUrl: "https://facebook.com/", Icon: FacebookIcon },
  { key: "tiktok", label: "TikTok", baseUrl: "https://tiktok.com/@", Icon: TikTokIcon },
  { key: "linkedin", label: "LinkedIn", baseUrl: "https://linkedin.com/in/", Icon: LinkedinIcon },
];

function socialHref(value: string, baseUrl: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return `${baseUrl}${trimmed.replace(/^@/, "").replace(/^\/+|\/+$/g, "")}`;
}

type SocialCard = Pick<WallCard, "name" | "location" | "instagram" | "facebook" | "tiktok" | "linkedin">;

function mapsHref(location: string) {
  const trimmed = location.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

export function SocialLinks({ card, onVisit }: { card: SocialCard; onVisit?: () => void }) {
  const profiles = socialConfig.flatMap(({ key, ...config }) => card[key] ? [{ ...config, key, value: card[key] }] : []);
  if (profiles.length === 0 && !card.location) return null;

  const stopPointer = (event: PointerEvent<HTMLAnchorElement>) => event.stopPropagation();
  const stopClick = (event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation();

  return (
    <div className="detail-socials" aria-label={`${card.name} social media`}>
      {profiles.map(({ key, label, baseUrl, Icon, value }) => (
        <a
          key={key}
          href={socialHref(value, baseUrl)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${card.name} on ${label}`}
          title={label}
          onPointerDown={stopPointer}
          onClick={(event) => { stopClick(event); onVisit?.(); }}
        >
          <Icon aria-hidden="true" />
        </a>
      ))}
      {card.location ? (
        <a href={mapsHref(card.location)} target="_blank" rel="noreferrer" aria-label={`View ${card.name} location in Google Maps`} title="Google Maps" onPointerDown={stopPointer} onClick={(event) => { stopClick(event); onVisit?.(); }}>
          <MapPin aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
