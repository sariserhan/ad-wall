const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect fill="#d4cfc4" width="4" height="3"/></svg>`;

// Cream-toned placeholder for remote images — avoids layout shift while loading.
export const BLUR_PLACEHOLDER = `data:image/svg+xml;base64,${toBase64(svg)}`;
