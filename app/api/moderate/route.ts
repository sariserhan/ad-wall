import type { NextRequest } from "next/server";
import path from "node:path";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import { rateLimit } from "../_rate-limit";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

let safetyModelPromise: Promise<ort.InferenceSession> | null = null;
let ocrWorkerPromise: Promise<Worker> | null = null;
let ocrQueue = Promise.resolve("");

const blockedTextPattern = /\b(nude|nudity|porn|pornography|xxx|onlyfans|explicit\s+sex|sexual\s+services|escort\s+services|white\s+power|racial\s+purity|race\s+war|kill\s+(?:all\s+)?(?:black|white|asian|jewish|muslim|gay)\s+people|f+[\W_]*[u*]+[\W_]*c+[\W_]*k+(?:ing|ed|er|s)?|sh[i1*]+t+(?:ty|s)?|bullsh[i1*]t|b[i1*]tch(?:es)?|a+s+s+h+o+l+e+s?|bastards?|cunts?|motherf+[\W_]*[u*]+[\W_]*c+[\W_]*k+(?:er|ing|ed|s)?|sluts?|whores?|damn|crap)\b/gi;

function findBlockedText(field: string, value: string) {
  return Array.from(value.matchAll(blockedTextPattern), (match) => ({ field, term: match[0], start: match.index, end: (match.index ?? 0) + match[0].length }));
}

function getSafetyModel() {
  safetyModelPromise ??= ort.InferenceSession.create(path.join(process.cwd(), "models", "image-safety.onnx"), {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  return safetyModelPromise;
}

function getOcrWorker() {
  ocrWorkerPromise ??= createWorker("eng", undefined, {
    langPath: path.join(process.cwd(), "models"),
    cachePath: path.join(process.cwd(), ".next", "cache", "tesseract"),
  });
  return ocrWorkerPromise;
}

function readImageText(image: Buffer) {
  const job = ocrQueue.then(async () => {
    const worker = await getOcrWorker();
    const result = await worker.recognize(image);
    return result.data.text;
  });
  ocrQueue = job.catch(() => "");
  return job;
}

async function classifyImage(image: Buffer) {
  const pixels = await sharp(image)
    .rotate()
    .resize(224, 224, { fit: "fill" })
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer();
  const planeSize = 224 * 224;
  const input = new Float32Array(3 * planeSize);
  for (let pixel = 0; pixel < planeSize; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      input[channel * planeSize + pixel] = pixels[pixel * 3 + channel];
    }
  }

  const model = await getSafetyModel();
  const output = await model.run({ image: new ort.Tensor("float32", input, [1, 3, 224, 224]) });
  const probabilities = output.probabilities.data as Float32Array;
  return { gore: probabilities[0], adult: probabilities[1], safe: probabilities[2] };
}

async function moderateImage(image: File, imageIndex: number) {
  const buffer = Buffer.from(await image.arrayBuffer());
  const [visual, extractedText] = await Promise.all([classifyImage(buffer), readImageText(buffer)]);
  const flags: Array<{ image: number; label: string; score?: number }> = [];
  if (visual.adult >= 0.6) flags.push({ image: imageIndex + 1, label: "adult or sexual content", score: visual.adult });
  if (visual.gore >= 0.55) flags.push({ image: imageIndex + 1, label: "violent or gory content", score: visual.gore });
  if (findBlockedText("image", extractedText).length > 0) flags.push({ image: imageIndex + 1, label: "abusive, hateful, or racist text" });
  return flags;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "moderate", 12, 5 * 60 * 1000);
  if (limited) return limited;
  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ safe: false, error: "Invalid moderation request." }, { status: 400 });

  const name = String(formData.get("name") ?? "");
  const line = String(formData.get("line") ?? "");
  const message = String(formData.get("message") ?? "");
  const text = [name, line, message].filter(Boolean).join("\n").trim();
  const images = formData.getAll("images").filter((value): value is File => value instanceof File).slice(0, 2);
  const matches = [...findBlockedText("name", name), ...findBlockedText("line", line), ...findBlockedText("message", message)];
  if (matches.length > 0) {
    return Response.json({ safe: false, error: "Remove the highlighted profanity or adult content before continuing.", matches }, { status: 422 });
  }

  for (const image of images) {
    if (!allowedImageTypes.has(image.type)) return Response.json({ safe: false, error: "Images must be JPG, PNG, or WEBP." }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ safe: false, error: "Each image must be smaller than 8MB." }, { status: 400 });
  }

  if (!text && images.length === 0) return Response.json({ safe: true, mode: "local" });

  try {
    const results = await Promise.all(images.map(moderateImage));
    const blocked = results.flat();
    if (blocked.length > 0) {
      const categories = [...new Set(blocked.map(({ label }) => label))];
      return Response.json({ safe: false, error: `Image blocked for: ${categories.join(", ")}.`, imageFlags: blocked }, { status: 422 });
    }
    return Response.json({ safe: true, mode: "local" });
  } catch (cause) {
    console.error("Local image moderation failed", cause);
    return Response.json({ safe: false, error: "The local image safety check could not run. Please try another image." }, { status: 503 });
  }
}
