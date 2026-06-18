import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// Film Forum's now_playing page has day tabs TUE…MON.
// Today's block: titles link to /film/..., times follow.
export async function scrapeFilmForum(date: Date): Promise<VenueData> {
  const res = await fetch("https://filmforum.org/now_playing");
  const html = await res.text();
  const $ = cheerio.load(html);

  const dayAbbr = date.toLocaleString("en-US", { weekday: "short" }).toUpperCase().slice(0, 3);
  // e.g. "WED"

  const showings: Showing[] = [];

  // Try tab-based structure: find the active/today tab
  let $todayTab: ReturnType<typeof $> | null = null;
  $("[class*='tab'], [class*='day'], nav a, .day-tab").each((_, el) => {
    const t = $(el).text().trim().toUpperCase().slice(0, 3);
    if (t === dayAbbr) {
      $todayTab = $(el);
    }
  });

  // Try to find the day's content panel by anchor/id
  const todayPanelSelectors = [
    `#${dayAbbr.toLowerCase()}`,
    `[data-day="${dayAbbr}"]`,
    `[data-day="${dayAbbr.toLowerCase()}"]`,
    `[id*="${dayAbbr.toLowerCase()}"]`,
  ];

  let $panel: ReturnType<typeof $> | null = null;
  for (const sel of todayPanelSelectors) {
    try {
      const found = $(sel);
      if (found.length) { $panel = found; break; }
    } catch {}
  }

  // If we found a panel, extract film entries
  const extractFromContainer = ($container: ReturnType<typeof $>) => {
    $container.find("[class*='film'], [class*='show'], article, li, .now-playing-item").each((_, el) => {
      const titleEl = $(el).find("a[href*='/film'], h2, h3, h4, [class*='title']").first();
      let title = titleEl.text().trim();
      if (!title) return;

      // Check for format tag in title or nearby
      const fullText = $(el).text();
      const tag = /35mm/i.test(fullText) ? "35mm" : /70mm/i.test(fullText) ? "70mm" : "";

      // Strip tag text from title if appended
      title = title.replace(/\s*35mm\s*/i, "").replace(/\s*70mm\s*/i, "").trim();

      // Collect times
      const timeEls = $(el).find("[class*='time'], [class*='showtime'], .time");
      const times: string[] = [];
      timeEls.each((_, t) => {
        const raw = $(t).text().trim();
        const m = raw.match(/\d{1,2}:\d{2}/g);
        if (m) times.push(...m);
      });

      // Fallback: find all time-like strings in the element text
      if (times.length === 0) {
        const m = fullText.match(/\b(\d{1,2}:\d{2})\b/g);
        if (m) times.push(...m);
      }

      if (title) showings.push({ title, times, tag });
    });
  };

  if ($panel) {
    extractFromContainer($panel);
  }

  // Broad fallback: all films on page (Film Forum often renders everything and hides via CSS)
  if (showings.length === 0) {
    extractFromContainer($("body"));
  }

  if (showings.length === 0) return { key: "film_forum", status: "pending", showings: [] };
  return { key: "film_forum", status: "open", showings };
}
