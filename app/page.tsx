import { redirect } from "next/navigation";
import { toCitySlug, toCategorySlug } from "@/lib/wall-slug";
import { WallPageShell } from "@/features/wall/wall-page-shell";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  // Redirect legacy ?country= URLs to path-based routes
  if (params.country) {
    const parts: string[] = [params.country.toLowerCase()];
    if (params.state) parts.push(params.state.toLowerCase());
    if (params.city) parts.push(toCitySlug(params.city));
    if (params.category && params.category !== "All") parts.push(toCategorySlug(params.category));
    const qs = new URLSearchParams();
    if (params.subcategory) qs.set("subcategory", params.subcategory);
    if (params.keyword) qs.set("keyword", params.keyword);
    if (params.card) qs.set("card", params.card);
    if (params.neighborhood) qs.set("neighborhood", params.neighborhood);
    const qStr = qs.toString();
    redirect(`/${parts.join("/")}${qStr ? `?${qStr}` : ""}`);
  }

  return <WallPageShell initialCardId={params.card} initialKeyword={params.keyword} />;
}
