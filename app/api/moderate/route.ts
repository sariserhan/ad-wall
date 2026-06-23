import type { NextRequest } from "next/server";
import path from "node:path";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import { auth } from "@clerk/nextjs/server";
import { durableUserRateLimit } from "../_distributed-rate-limit";
import { isSameOriginRequest, rateLimit } from "../_rate-limit";
import { log } from "@/lib/logger";
import { observe } from "../_observe";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 17 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_CONCURRENT_IMAGE_REQUESTS = 2;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

let safetyModelPromise: Promise<ort.InferenceSession> | null = null;
let ocrWorkerPromise: Promise<Worker> | null = null;
let ocrQueue = Promise.resolve("");
let activeImageRequests = 0;

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
  const pixels = await sharp(image, { limitInputPixels: MAX_IMAGE_PIXELS })
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
  const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error("Image dimensions are too large.");
  }
  const ocrImage = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const t0 = performance.now();
  const [visualResult, ocrResult] = await Promise.all([
    (async () => { const t = performance.now(); const r = await classifyImage(buffer); return { r, ms: Math.round(performance.now() - t) }; })(),
    (async () => { const t = performance.now(); const r = await readImageText(ocrImage); return { r, ms: Math.round(performance.now() - t) }; })(),
  ]);
  void t0;

  const flags: Array<{ image: number; label: string; score?: number }> = [];
  if (visualResult.r.adult >= 0.6) flags.push({ image: imageIndex + 1, label: "adult or sexual content", score: visualResult.r.adult });
  if (visualResult.r.gore >= 0.55) flags.push({ image: imageIndex + 1, label: "violent or gory content", score: visualResult.r.gore });
  if (findBlockedText("image", ocrResult.r).length > 0) flags.push({ image: imageIndex + 1, label: "abusive, hateful, or racist text" });
  return { flags, classifyMs: visualResult.ms, ocrMs: ocrResult.ms };
}

async function handleModerate(request: NextRequest): Promise<Response> {
  if (!isSameOriginRequest(request)) return Response.json({ safe: false, error: "Cross-site moderation requests are not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return Response.json({ safe: false, error: "The moderation request is too large." }, { status: 413 });
  const ipLimit = rateLimit(request, "moderate:ip:5m", 20, 5 * 60 * 1000);
  if (ipLimit) return ipLimit;
  const { userId, getToken } = await auth();
  if (!userId) return Response.json({ safe: false, error: "Sign in before checking a card." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const durableLimit = await durableUserRateLimit(await getToken({ template: "convex" }), ["moderation_5m", "moderation_day"]);
  if (durableLimit) return durableLimit;

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ safe: false, error: "Invalid moderation request." }, { status: 400 });

  const name = String(formData.get("name") ?? "");
  const line = String(formData.get("line") ?? "");
  const message = String(formData.get("message") ?? "");
  const text = [name, line, message].filter(Boolean).join("\n").trim();
  if (name.length > 60 || line.length > 90 || message.length > 300) return Response.json({ safe: false, error: "Card text is too long." }, { status: 400 });
  const images = formData.getAll("images").filter((value): value is File => value instanceof File);
  if (images.length > 2) return Response.json({ safe: false, error: "A card can include at most two images." }, { status: 400 });

  const textStart = performance.now();
  const matches = [...findBlockedText("name", name), ...findBlockedText("line", line), ...findBlockedText("message", message)];
  const textMs = Math.round(performance.now() - textStart);
  if (matches.length > 0) {
    log({ event: "moderation.blocked", reason: "text", textMs, hasImages: images.length > 0 });
    return Response.json({ safe: false, error: "Remove the highlighted profanity or adult content before continuing.", matches }, { status: 422 });
  }

  for (const image of images) {
    if (!allowedImageTypes.has(image.type)) return Response.json({ safe: false, error: "Images must be JPG, PNG, or WEBP." }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ safe: false, error: "Each image must be smaller than 8MB." }, { status: 400 });
  }

  if (!text && images.length === 0) return Response.json({ safe: true, mode: "local" });
  if (images.length > 0 && activeImageRequests >= MAX_CONCURRENT_IMAGE_REQUESTS) {
    return Response.json({ safe: false, error: "Image moderation is busy. Please try again shortly." }, { status: 503, headers: { "Retry-After": "5" } });
  }

  if (images.length > 0) activeImageRequests += 1;
  try {
    const results = await Promise.all(images.map(moderateImage));
    const totalClassifyMs = results.reduce((s, r) => s + r.classifyMs, 0);
    const totalOcrMs = results.reduce((s, r) => s + r.ocrMs, 0);
    const blocked = results.flatMap((r) => r.flags);
    if (blocked.length > 0) {
      const categories = [...new Set(blocked.map(({ label }) => label))];
      log({ event: "moderation.blocked", reason: "image", textMs, classifyMs: totalClassifyMs, ocrMs: totalOcrMs, imageCount: images.length });
      return Response.json({ safe: false, error: `Image blocked for: ${categories.join(", ")}.`, imageFlags: blocked }, { status: 422 });
    }
    log({ event: "moderation.complete", safe: true, textMs, classifyMs: totalClassifyMs, ocrMs: totalOcrMs, imageCount: images.length });
    return Response.json({ safe: true, mode: "local" });
  } catch (cause) {
    log({ event: "moderation.error", level: "error", error: cause instanceof Error ? cause.message : String(cause), imageCount: images.length });
    return Response.json({ safe: false, error: "The local image safety check could not run. Please try another image." }, { status: 503 });
  } finally {
    if (images.length > 0) activeImageRequests -= 1;
  }
}

export const POST = observe("/api/moderate", handleModerate);
