const releaseCheckStorageKey = "robotaxi.release.check";

export function getCurrentReleaseToken(documentLike = globalThis.document) {
  const source = documentLike?.querySelector?.('script[src*="main.bundle.js"]')?.getAttribute("src") || "";
  try {
    return new URL(source, globalThis.location?.href || "http://localhost/").searchParams.get("v");
  } catch {
    return null;
  }
}

export async function ensureLatestRelease({
  locationLike = globalThis.location,
  documentLike = globalThis.document,
  fetchImplementation = globalThis.fetch,
  sessionStorageLike = globalThis.sessionStorage,
  timeoutMs = 1800,
} = {}) {
  if (String(locationLike?.hostname || "").toLowerCase() !== "chizheng4.github.io") return false;
  if (typeof fetchImplementation !== "function") return false;

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = globalThis.setTimeout?.(() => controller?.abort(), timeoutMs);
  try {
    const manifestUrl = new URL("./deployment-manifest.json", locationLike.href);
    manifestUrl.searchParams.set("releaseCheck", String(Date.now()));
    const response = await fetchImplementation(manifestUrl, {
      cache: "no-store",
      signal: controller?.signal,
    });
    if (!response.ok) return false;
    const manifest = await response.json();
    const latestToken = String(manifest?.cache_version || "");
    const currentToken = String(getCurrentReleaseToken(documentLike) || "");
    if (!latestToken || !currentToken || latestToken === currentToken) return false;
    if (sessionStorageLike?.getItem?.(releaseCheckStorageKey) === latestToken) return false;

    sessionStorageLike?.setItem?.(releaseCheckStorageKey, latestToken);
    const nextUrl = new URL(locationLike.href);
    nextUrl.searchParams.set("release", latestToken);
    locationLike.replace(nextUrl.href);
    return true;
  } catch {
    return false;
  } finally {
    if (timeoutId) globalThis.clearTimeout?.(timeoutId);
  }
}
