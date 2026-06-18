import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// RevivalHouses.com mirrors AC's plain-HTML calendar.
// Rows contain: title, date string "Wed, Jun 17", time, and an italic series note.
async function scrapeRevivalHouses(url: string, date: Date): Promise<Showing[]> {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const month = date.toLocaleString("en-US", { month: "short" }); // "Jun"
  const day = date.getDate();
  const dayOfWeek = date.toLocaleString("en-US", { weekday: "short" }); // "Wed"
  // Match "Wed, Jun 17" or "Wed Jun 17"
  const datePattern = new RegExp(`${dayOfWeek}[,\\s]+${month}\\s+${day}\\b`, "i");

  const showings: Showing[] = [];

  // Each screening is typically a row/article with date + title + time
  $("[class*='event'], [class*='film'], article, li, tr, .screening").each((_, el) => {
    const text = $(el).text();
    if (!datePattern.test(text)) return;

    // Extract title
    const titleEl = $(el).find("[class*='title'], h2, h3, h4, strong, a").first();
    let title = titleEl.text().trim();
    if (!title) {
      // Try first meaningful text segment
      const textLines = text.split("\n").map(l => l.trim()).filter(Boolean);
      title = textLines[0] || "";
    }

    // Extract time
    const timeMatch = text.match(/\b(\d{1,2}:\d{2})\s*(?:am|pm)?/i);
    const time = timeMatch ? timeMatch[1] : "";

    // Series/format tag (italic or smaller text)
    const tagEl = $(el).find("em, i, small, [class*='series'], [class*='note']").first();
    const tagText = tagEl.text().trim();
    const tag = /70mm/i.test(tagText) ? "70mm" : /35mm/i.test(tagText) ? "35mm" : "";

    if (title && time) {
      showings.push({ title, times: [time], tag });
    }
  });

  return showings;
}

export async function scrapeCinematheque(date: Date): Promise<VenueData> {
  const [aero, losFeliz] = await Promise.all([
    scrapeRevivalHouses("https://www.revivalhouses.com/theaters/aero-theatre/", date),
    scrapeRevivalHouses("https://www.revivalhouses.com/theaters/los-feliz-theatre/", date),
  ]);

  const overallStatus =
    aero.length > 0 || losFeliz.length > 0 ? "open" : "pending";

  return {
    key: "cinematheque",
    status: overallStatus,
    showings: [],
    aero: aero.length > 0 ? aero : undefined,
    losFeliz: losFeliz.length > 0 ? losFeliz : undefined,
  };
}
