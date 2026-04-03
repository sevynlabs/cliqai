/**
 * Safe fetch wrapper for dashboard API calls.
 * Returns a fallback value on non-OK responses instead of crashing.
 */
export async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) return fallback;
  const data = await r.json();
  if (Array.isArray(fallback) && !Array.isArray(data)) return fallback;
  return data as T;
}
