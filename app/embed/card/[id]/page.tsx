import type { Metadata } from "next";
import { getEmbedCard } from "@/server/public-card";

interface EmbedCardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EmbedCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getEmbedCard(id);
  return {
    title: card ? card.name : "Listing unavailable",
    robots: { index: false },
  };
}

export default async function EmbedCardPage({ params }: EmbedCardPageProps) {
  const { id } = await params;
  const card = await getEmbedCard(id);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  if (!card) {
    return (
      <div className="embed-widget embed-widget-inactive">
        <div className="embed-body embed-unavailable">
          <span className="embed-unavailable-icon" aria-hidden="true">□</span>
          <p className="embed-unavailable-title">This listing is no longer available.</p>
          <a className="embed-cta" href={appUrl || "/"} target="_blank" rel="noopener noreferrer">
            Browse local listings →
          </a>
        </div>
      </div>
    );
  }

  const cardUrl = `${appUrl}/card/${id}`;
  const locationParts = [card.area, card.city, card.state].filter(Boolean).join(", ");
  const isLive = card.status === "live";

  if (!isLive) {
    return (
      <div className="embed-widget embed-widget-inactive">
        <div className={`embed-theme-swatch theme-${card.theme}`} aria-hidden="true" />
        <div className="embed-body embed-unavailable">
          <p className="embed-category">{card.category}</p>
          <h2 className="embed-name embed-name-muted">{card.name}</h2>
          <p className="embed-line embed-line-muted">{locationParts}</p>
          <span className="embed-expired-tag">{card.status === "expired" ? "Listing expired" : "Listing unavailable"}</span>
          <a className="embed-cta embed-cta-sm" href={cardUrl} target="_blank" rel="noopener noreferrer">
            {card.status === "expired" ? "Check for updates →" : "View on WALL →"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="embed-widget">
      {card.images[0] || card.thumbnailImages?.[0] ? (
        <div className="embed-image">
          <img src={card.thumbnailImages?.[0] ?? card.images[0]} alt={card.name} />
        </div>
      ) : (
        <div className={`embed-theme-swatch theme-${card.theme}`} aria-hidden="true" />
      )}
      <div className="embed-body">
        <div className="embed-meta">
          <span className="embed-category">{card.category}</span>
          {card.verified ? <span className="embed-verified">✓ Verified</span> : null}
        </div>
        <h2 className="embed-name">{card.name}</h2>
        <p className="embed-line">{card.line}</p>
        {locationParts ? <p className="embed-location">{locationParts}</p> : null}
        {card.price ? <p className="embed-price">{card.price}</p> : null}
        <div className="embed-actions">
          {card.phone ? (
            <a className="embed-action" href={`tel:${card.phone}`}>
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58z"/></svg>
              Call
            </a>
          ) : null}
          {card.website ? (
            <a className="embed-action" href={card.website} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.96 6.96 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7.03 7.03 0 0 0 2.072 2.472zM3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7.03 7.03 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a6.96 6.96 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.03 7.03 0 0 0-2.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/></svg>
              Website
            </a>
          ) : null}
          {card.email ? (
            <a className="embed-action" href={`mailto:${card.email}`}>
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/></svg>
              Email
            </a>
          ) : null}
        </div>
      </div>
      <a className="embed-cta" href={cardUrl} target="_blank" rel="noopener noreferrer">
        View full listing →
      </a>
    </div>
  );
}
