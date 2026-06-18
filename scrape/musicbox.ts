import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// Do312 lists Music Box showings under day headers like "Today Jun 17" / "Tomorrow Jun 18"
export async function scrapeMusicBox(date: Date): Promise<VenueData> {
  const res = await fetch("https://do312.com/venues/music-box-theatre");
  const html = await res.text();
  const $ = cheerio.load(html);

  const month = date.toLocaleString("en-US", { month: "short" }); // "Jun"
  const day = date.getDate();
  // Match "Today Jun 17" or just "Jun 17"
  const datePattern = new RegExp(`(?:Today\\s+)?${month}\\s+${day}\\b`, "i");

  const showings: Showing[] = [];
  let inToday = false;

  $("*").each((_, el) => {
    const text = $(el).clone().children().remove().end().text().trim();
    if (datePattern.test(text) && $(el).children().length === 0) {
      inToday = true;
      return;
    }
  });

  // Find today's day section and collect events under it
  let $dayEl: ReturnType<typeof $> | null = null;
  $("[class*='day'], [class*='date-header'], h2, h3, .date").each((_, el) => {
    if (datePattern.test($(el).text())) {
      $dayEl = $(el);
    }
  });

  if ($dayEl) {
    const $section = ($dayEl as ReturnType<typeof $>).closest("[class*='section'], [class*='day-group']");
    const container = $section.length ? $section : ($dayEl as ReturnType<typeof $>).parent();
    container.find("[class*='event'], [class*='show'], article, li").each((_, el) => {
      const titleEl = $(el).find("[class*='title'], h3, h4, a, strong").first();
      const title = titleEl.text().trim();
      const timeEl = $(el).find("[class*='time'], [class*='start']").first();
      const timeText = timeEl.text().trim();
      const timeMatch = timeText.match(/\b(\d{1,2}:\d{2})/);
      if (title && timeMatch) {
        showings.push({ title, times: [timeMatch[1]], tag: "" });
      }
    });
  }

  // Fallback: text search
  if (showings.length === 0) {
    const bodyText = $("body").text();
    const idx = bodyText.search(datePattern);
    if (idx !== -1) {
      const slice = bodyText.slice(idx, idx + 1000);
      const timeRe = /(\d{1,2}:\d{2})\s*(am|pm)/gi;
      let m: RegExpExecArray | null;
      while ((m = timeRe.exec(slice)) !== null) {
        const before = slice.slice(Math.max(0, m.index - 80), m.index);
        const titleMatch = before.split("\n").filter(Boolean).pop()?.trim();
        if (titleMatch && titleMatch.length > 2) {
          showings.push({ title: titleMatch, times: [m[1]], tag: "" });
        }
      }
    }
  }

  if (showings.length === 0) return { key: "music_box", status: "pending", showings: [] };
  return { key: "music_box", status: "open", showings };
}
