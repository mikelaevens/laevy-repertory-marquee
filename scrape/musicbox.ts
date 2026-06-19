// Music Box Theatre — do312.com/venues/music-box-theatre
// Events listed under day headers: "Today Jun 18" / "Tomorrow Jun 19" / "Sat Jun 20" etc.
// We grab only the "Today" group (or match today's month+day explicitly).
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

export async function scrapeMusicBox(date: Date): Promise<VenueData> {
  const html = await fetchPage("https://do312.com/venues/music-box-theatre");
  const $ = cheerio.load(html);

  const monthShort = date.toLocaleString("en-US", { month: "short" }); // "Jun"
  const day = date.getDate();

  // Match "Today Jun 18" or just "Jun 18" in a heading
  const todayPattern = new RegExp(`(?:Today\\s+)?${monthShort}\\s+${day}\\b`, "i");

  const showings: Showing[] = [];

  // Do312 wraps each day in a section/div with a date heading
  // Strategy: find the heading matching today, then collect sibling event elements until next heading

  // Try to find today's heading element
  let $todaySection: ReturnType<typeof $> | null = null;

  $("[class*='date'], [class*='day-header'], h2, h3, h4, .listing-date, [class*='heading']").each((_, el) => {
    if (todayPattern.test($(el).text()) && !$todaySection) {
      $todaySection = $(el) as ReturnType<typeof $>;
    }
  });

  if ($todaySection) {
    // Collect event elements that follow this heading (siblings or children of parent)
    const $heading = $todaySection as ReturnType<typeof $>;
    const $parent = $heading.parent();

    // Try: heading's container has event children
    const $events = $parent.find("[class*='event'], [class*='show'], [class*='listing'], article");
    if ($events.length > 0) {
      $events.each((_, el) => {
        const title = $(el).find("[class*='title'], h3, h4, a[href*='event'], strong").first().text().trim();
        const timeEl = $(el).find("[class*='time'], [class*='start'], time").first().text().trim();
        const timeMatch = timeEl.match(/\b(\d{1,2}:\d{2})/);
        if (title && timeMatch) {
          showings.push({ title, times: [cleanTime(timeMatch[0])], tag: "" });
        }
      });
    }

    // Fallback: walk next siblings of the heading
    if (showings.length === 0) {
      let $cur = $heading.next();
      while ($cur.length) {
        const text = $cur.text().trim();
        // Stop at next date heading
        if (/\b(Today|Tomorrow|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(text) &&
            !todayPattern.test(text)) break;

        const title = $cur.find("[class*='title'], h3, h4, strong, a").first().text().trim();
        const timeMatch = text.match(/\b(\d{1,2}:\d{2})\s*(?:am|pm)?/i);
        if (title && timeMatch) {
          showings.push({ title, times: [cleanTime(timeMatch[0])], tag: "" });
        }
        $cur = $cur.next();
      }
    }
  }

  // Broad fallback: find any event whose surrounding text mentions today
  if (showings.length === 0) {
    $("[class*='event'], article, [class*='show']").each((_, el) => {
      const ctx = $(el).closest("[class*='day'], [class*='date-group']").text()
                + $(el).parent().text();
      if (!todayPattern.test(ctx)) return;
      const title = $(el).find("[class*='title'], h3, h4, a, strong").first().text().trim();
      const timeMatch = $(el).text().match(/\b(\d{1,2}:\d{2})\s*(?:am|pm)?/i);
      if (title && timeMatch) {
        showings.push({ title, times: [cleanTime(timeMatch[0])], tag: "" });
      }
    });
  }

  const valid = validateShowings(showings, "Music Box");
  return { key: "music_box", status: valid ? "open" : "pending", showings: valid ?? [] };
}
