// Metrograph: metrograph.com/nyc/?date=YYYY-MM-DD
// Today's film group is at: #calendar-list-day-YYYY-MM-DD
// Each film: .item.film-thumbnail > h4 a.title + .film-metadata (discard) + .showtimes a (times)
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

export async function scrapeMetrograph(date: Date): Promise<VenueData> {
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-"); // "2026-06-18" in local timezone
  const html = await fetchPage(`https://metrograph.com/nyc/?date=${dateStr}`);
  const $ = cheerio.load(html);

  const $dayGroup = $(`#calendar-list-day-${dateStr}`);
  if (!$dayGroup.length) {
    return { key: "metrograph", status: "pending", showings: [] };
  }

  const showings: Showing[] = [];

  $dayGroup.find(".item, [class*='film-thumbnail']").each((_, el) => {
    const title = $(el).find("h4 a.title, h4").first().text().trim();
    if (!title) return;

    const tag = /35mm/i.test($(el).find(".film-metadata").text()) ? "35mm"
              : /70mm/i.test($(el).find(".film-metadata").text()) ? "70mm" : "";

    const times = $(el).find(".showtimes a").map((_, t) => {
      return cleanTime($(t).text().trim());
    }).get().filter(t => /^\d{1,2}:\d{2}$/.test(t));

    if (title && times.length > 0) showings.push({ title, times, tag });
  });

  const valid = validateShowings(showings, "Metrograph");
  return { key: "metrograph", status: valid ? "open" : "pending", showings: valid ?? [] };
}
