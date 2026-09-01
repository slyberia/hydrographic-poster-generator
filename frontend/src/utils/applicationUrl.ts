function validApplicationOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function applicationUrl(
  path: string,
  requestUrl: string,
  configuredOrigin = process.env.APP_ORIGIN,
): URL {
  const origin = validApplicationOrigin(configuredOrigin);
  return new URL(path, origin ?? requestUrl);
}
