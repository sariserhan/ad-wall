import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type ModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
};

const adultTextPattern = /\b(nude|nudity|porn|pornography|xxx|onlyfans|explicit\s+sex|sexual\s+services|escort\s+services)\b/gi;

function findAdultText(field: string, value: string) {
  return Array.from(value.matchAll(adultTextPattern), (match) => ({ field, term: match[0], start: match.index, end: (match.index ?? 0) + match[0].length }));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ safe: false, error: "Invalid moderation request." }, { status: 400 });

  const name = String(formData.get("name") ?? "");
  const line = String(formData.get("line") ?? "");
  const message = String(formData.get("message") ?? "");
  const text = [name, line, message].filter(Boolean).join("\n").trim();
  const images = formData.getAll("images").filter((value): value is File => value instanceof File).slice(0, 2);
  const matches = [...findAdultText("name", name), ...findAdultText("line", line), ...findAdultText("message", message)];
  if (matches.length > 0) {
    return Response.json({ safe: false, error: "Remove the highlighted adult content before continuing.", matches }, { status: 422 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && images.length === 0) return Response.json({ safe: true, mode: "local" });
  if (!apiKey) {
    return Response.json({ safe: false, error: "Image safety checking is not configured. Remove the image or configure OPENAI_API_KEY." }, { status: 503 });
  }
  const input: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];

  if (text) input.push({ type: "text", text });
  for (const image of images) {
    if (!allowedImageTypes.has(image.type)) return Response.json({ safe: false, error: "Images must be JPG, PNG, or WEBP." }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ safe: false, error: "Each image must be smaller than 8MB." }, { status: 400 });
    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    input.push({ type: "image_url", image_url: { url: `data:${image.type};base64,${base64}` } });
  }

  if (input.length === 0) return Response.json({ safe: true });

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
    });
    if (!response.ok) return Response.json({ safe: false, error: "The safety check is temporarily unavailable. Please try again." }, { status: 503 });

    const payload = await response.json() as { results?: ModerationResult[] };
    const results = payload.results ?? [];
    const blocked = results.some((result) => result.flagged || result.categories?.sexual || result.categories?.["sexual/minors"]);
    if (blocked) {
      const blockedField = message ? { field: "message", term: message, start: 0, end: message.length } : line ? { field: "line", term: line, start: 0, end: line.length } : { field: "name", term: name, start: 0, end: name.length };
      return Response.json({ safe: false, error: "Adult, nude, or otherwise unsafe content is not allowed on WALL.", matches: [blockedField] }, { status: 422 });
    }
    return Response.json({ safe: true });
  } catch {
    return Response.json({ safe: false, error: "The safety check is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
