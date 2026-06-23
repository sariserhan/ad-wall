export const categories = [
  "All",
  "Services",
  "Repairs",
  "Home & Garden",
  "Food & Catering",
  "Pets",
  "Classes & Education",
  "Shops & Retail",
  "Automotive",
  "Health & Fitness",
  "Beauty & Personal Care",
  "Professional Services",
  "Technology",
  "Events & Entertainment",
  "Real Estate",
  "Child & Family",
  "Community",
  "Jobs",
  "Dating",
  "Buy & Sell Marketplace",
  "Vehicles",
] as const;

export const SUBCATEGORY_OPTIONS: Record<Exclude<(typeof categories)[number], "All">, string[]> = {
  "Services": ["Cleaning", "Moving", "Security", "Consulting", "Translation", "Notary", "Virtual Assistant", "Delivery", "Printing", "Marketing"],
  "Repairs": ["Appliances", "Plumbing", "Electrical", "HVAC", "Roofing", "Handyman", "Painting", "Flooring", "Drywall", "Locksmith"],
  "Home & Garden": ["Landscaping", "Lawn Care", "Pest Control", "Pool Services", "Interior Design", "Tree Service", "Gardening", "Pressure Washing", "Fencing", "Decks & Patios"],
  "Food & Catering": ["Restaurants", "Catering", "Food Trucks", "Bakery", "Meal Prep", "Coffee Shops", "Desserts", "Private Chef", "Grocery Delivery", "Specialty Foods"],
  "Pets": ["Grooming", "Boarding", "Training", "Pet Sitting", "Veterinary", "Dog Walking", "Pet Supplies", "Pet Adoption", "Lost & Found Pets", "Breeders"],
  "Classes & Education": ["Tutoring", "Music Lessons", "Language Lessons", "Fitness Training", "Driving Lessons", "Computer Training", "Art Classes", "Dance Classes", "Test Preparation", "Online Courses"],
  "Shops & Retail": ["Clothing", "Electronics", "Furniture", "Gifts", "Jewelry", "Books", "Toys", "Sporting Goods", "Beauty Products", "Home Decor"],
  "Automotive": ["Auto Repair", "Mobile Mechanic", "Car Detailing", "Tires", "Towing", "Oil Change", "Auto Body", "Car Audio", "Window Tinting", "Vehicle Sales"],
  "Health & Fitness": ["Personal Training", "Gym", "Yoga", "Massage", "Nutrition", "Physical Therapy", "Martial Arts", "CrossFit", "Wellness Coaching", "Weight Loss"],
  "Beauty & Personal Care": ["Barber", "Hair Salon", "Nail Salon", "Makeup", "Skincare", "Eyelash Extensions", "Tattoo", "Spa", "Waxing", "Cosmetic Services"],
  "Professional Services": ["Accounting", "Tax Preparation", "Legal Services", "Insurance", "Real Estate", "Mortgage", "Financial Planning", "Business Consulting", "HR Services", "Bookkeeping"],
  "Technology": ["Computer Repair", "Phone Repair", "Web Design", "App Development", "IT Support", "Networking", "Cybersecurity", "Software Training", "AI Services", "Data Recovery"],
  "Events & Entertainment": ["DJ", "Photographer", "Videographer", "Party Rentals", "Event Planning", "Live Music", "Catering", "Wedding Services", "Photo Booth", "Decorations"],
  "Real Estate": ["Homes for Sale", "Rentals", "Commercial Property", "Roommates", "Vacation Rentals", "Property Management", "Real Estate Agents", "Land for Sale", "New Construction", "Open Houses"],
  "Child & Family": ["Daycare", "Babysitting", "Elder Care", "Family Counseling", "Child Activities", "Special Needs Care", "Summer Camps", "After School Programs", "Parenting Services", "Senior Services"],
  "Community": ["Events", "Yard Sales", "Lost & Found", "Volunteer Opportunities", "Announcements", "Local Groups", "Charity", "Church Activities", "Neighborhood Watch", "Community Projects"],
  "Jobs": ["Full-Time", "Part-Time", "Contract", "Remote", "Healthcare", "Technology", "Retail", "Hospitality", "Construction", "Transportation"],
  "Dating": ["Men Seeking Women", "Women Seeking Men", "Men Seeking Men", "Women Seeking Women", "Friendship", "Activity Partners", "Travel Partners", "Networking", "Events", "Groups"],
  "Buy & Sell Marketplace": ["Furniture", "Electronics", "Appliances", "Clothing", "Tools", "Home Decor", "Collectibles", "Sporting Goods", "Musical Instruments", "Miscellaneous"],
  "Vehicles": ["Cars", "Trucks", "SUVs", "Motorcycles", "RVs", "Boats", "Commercial Vehicles", "Parts & Accessories", "Auto Services", "Vehicle Rentals"],
};
export const cardThemes = ["yellow", "paper", "pink", "cyan", "dark", "cream", "biz", "kraft", "blueprint", "photo", "ticket"] as const;

export type CardCategory = Exclude<(typeof categories)[number], "All">;
export type CardTheme = (typeof cardThemes)[number];
export type CardImageMode = "photo" | "business-card";

export const cardFormats: Record<CardTheme, { width: number; minHeight: number }> = {
  yellow: { width: 205, minHeight: 205 },
  paper: { width: 220, minHeight: 245 },
  pink: { width: 220, minHeight: 245 },
  cyan: { width: 220, minHeight: 245 },
  dark: { width: 220, minHeight: 245 },
  cream: { width: 220, minHeight: 245 },
  biz: { width: 300, minHeight: 180 },
  kraft: { width: 215, minHeight: 255 },
  blueprint: { width: 235, minHeight: 235 },
  photo: { width: 205, minHeight: 285 },
  ticket: { width: 300, minHeight: 180 },
};

export function getCardFormat(theme: CardTheme) {
  return cardFormats[theme];
}

import type { Id } from "../../../convex/_generated/dataModel";

export interface WallCard {
  id: string | Id<"cards">;
  name: string;
  category: CardCategory;
  subcategory?: string;
  line: string;
  message?: string;
  area: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  neighborhood?: string;
  ownerName?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  theme: CardTheme;
  imageMode?: CardImageMode;
  images: string[];
  thumbnailImages?: string[];
  x: number;
  y: number;
  rotation: number;
  width: number;
  zIndex: number;
  positionLockedAt?: number;
  updatedAt?: number;
  createdAt: number;
  ownerId?: string;
  paidAmount?: number;
  expiresAt?: number;
  clicks?: number;
  featuredTier?: "bronze" | "silver" | "gold";
  reviewCount?: number;
}

export interface OwnerCard extends WallCard {
  status: "published" | "hidden" | "expired";
  expiresAt: number;
  paidAmount: number;
  clicks: number;
  websiteClicks?: number;
  phoneClicks?: number;
  emailClicks?: number;
  socialClicks?: number;
  saves?: number;
  shares?: number;
}

export type RenewalAmount = 0 | 2.99 | 7.99 | 24.99;

export type CardUpdate = Pick<OwnerCard, "name" | "category" | "subcategory" | "line" | "message" | "area" | "zipcode" | "neighborhood" | "price" | "phone" | "email" | "website" | "location" | "instagram" | "facebook" | "tiktok" | "linkedin" | "theme">;

export interface CardDraft {
  name: string;
  category: CardCategory;
  subcategory?: string;
  line: string;
  message?: string;
  area: string;
  city: string;
  state: string;
  country: string;
  zipcode?: string;
  neighborhood?: string;
  price?: string;
  phone?: string;
  email?: string;
  website?: string;
  location?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  theme: CardTheme;
  imageMode: CardImageMode;
  paymentOption: "free" | "2.99" | "7.99" | "24.99";
  featuredTier: "none" | "bronze" | "silver" | "gold";
  files: File[];
  previews: string[];
}

export interface Placement {
  x: number;
  y: number;
}

export type CreateCard = (draft: CardDraft, placement: Placement) => Promise<WallCard | void>;
