import type { Showing } from "./types.js";

export const BAD_TITLE_WORDS = [
  "buy tickets", "more info", "membership", "newsletter", "sign up",
  "about", "schedule", "tickets", "trailers", "googleanalytics",
  "function(", "sold out", "click here", "learn more", "see all",
  "subscribe", "donate", "support", "gift card", "press", "login",
  "log in", "register", "home", "search", "menu", "nav",
];

export function isBadTitle(t: string): boolean {
  const lower = t.toLowerCase();
  return (
    !t ||
    t.length > 80 ||
    t.length < 2 ||
    BAD_TITLE_WORDS.some(w => lower.includes(w)) ||
    /^\d+$/.test(t) // pure numbers
  );
}

// Parse "7:30 pm" / "7:30pm" / "7:30" → "7:30"
export function cleanTime(raw: string): string {
  return raw.trim().replace(/\s*(am|pm)\s*/gi, "").trim();
}

// Validate and cap a showings list — rejects the whole batch if clearly bad
export function validateShowings(showings: Showing[], venueName: string): Showing[] | null {
  if (showings.length > 12) {
    console.warn(`  ⚠ ${venueName}: ${showings.length} entries (too many) — rejecting`);
    return null;
  }
  const clean = showings.filter(s => !isBadTitle(s.title) && s.times.length > 0);
  return clean.length > 0 ? clean : null;
}

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
