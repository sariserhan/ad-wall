export function normalizePostHogHost(host: string | undefined) {
  const value = host?.trim();
  if (!value) return undefined;
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}
