export type FeaturedTierValue = "none" | "boost" | "bronze" | "silver" | "gold";

export type FeaturedTierOption = {
  value: FeaturedTierValue;
  price: string;
  label: string;
  perks: string[];
};

export function getVisibleFeaturedTierOptions(options: ReadonlyArray<FeaturedTierOption>, showLegacyFeaturedTiers: boolean) {
  return options.filter((option) => showLegacyFeaturedTiers || option.value === "none" || option.value === "boost");
}

export function featuredTierWeight(tier?: string) {
  return tier === "boost" ? 4 : tier === "gold" ? 3 : tier === "silver" ? 2 : tier === "bronze" ? 1 : 0;
}

export function activeFilterCount(filters: {
  categoryIsAll: boolean;
  subcategory: string;
  selectedNeighborhood: string;
  fresh: boolean;
  sortByDefault: boolean;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasPhotos: boolean;
  featuredOnly: boolean;
}) {
  return (filters.categoryIsAll ? 0 : 1)
    + (filters.subcategory ? 1 : 0)
    + (filters.selectedNeighborhood ? 1 : 0)
    + (filters.fresh ? 1 : 0)
    + (filters.sortByDefault ? 0 : 1)
    + (filters.hasWebsite ? 1 : 0)
    + (filters.hasPhone ? 1 : 0)
    + (filters.hasEmail ? 1 : 0)
    + (filters.hasPhotos ? 1 : 0)
    + (filters.featuredOnly ? 1 : 0);
}
