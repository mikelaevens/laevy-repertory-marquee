import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// Metrograph accepts ?date=YYYY-MM-DD. Films are in <h4>, info in next sibling,
// then times follow.
export async function scrapeMetrograph(date: Date): Promise<VenueData> {
  const dateStr = date.toISOString().slice(0, 10); // "2026-06-17"
  const res = await fetch(`https://metrograph.com/nyc/?date=${dateStr}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const showings: Showing[] = [];

  // Primary: <h4> holds title, sibling or nearby holds time and format
  $("h4").each((_, el) => {
    const title = $(el).text().trim();
    if (!title || title.length > 80) return;

    // Look for format info (35mm, DCP, etc.) in the nearby text
    const parent = $(el).parent();
    const parentText = parent.text();
    const tag = /35mm/i.test(parentText) ? "35mm" : /70mm/i.test(parentText) ? "70mm" : "";

    // Collect times from siblings/parent
    const times: string[] = [];
    parent.find("[class*='time'], [class*='showtime'], a[href*='ticket']").each((_, t) => {
      const raw = $(t).text().trim();
      const m = raw.match(/\d{1,2}:\d{2}/g);
      if (m) times.push(...m);
    });

    if (times.length === 0) {
      const m = parentText.match(/\b(\d{1,2}:\d{2})\b/g);
      if (m) times.push(...m);
    }

    showings.push({ title, times, tag });
  });

  // Fallback: look for film listing items
  if (showings.length === 0) {
    $("[class*='film-title'], [class*='movie-title'], [class*='screening-title']").each((_, el) => {
      const title = $(el).text().trim();
      if (!title) return;
      const container = $(el).closest("[class*='film'], [class*='screening'], article, li");
      const containerText = container.length ? container.text() : $(el).parent().text();
      const tag = /35mm/i.test(containerText) ? "35mm" : /70mm/i.test(containerText) ? "70mm" : "";
      const m = containerText.match(/\b(\d{1,2}:\d{2})\b/g);
      showings.push({ title, times: m ?? [], tag });
    });
  }

  if (showings.length === 0) return { key: "metrograph", status: "pending", showings: [] };
  return { key: "metrograph", status: "open", showings };
}
