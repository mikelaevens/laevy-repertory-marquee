// Film Forum: filmforum.org/now_playing
// #tabs ul has <li class="thu"><a href="#tabs-0">THU</a></li> etc.
// Today's panel: find li.{weekday} → get href → read that div.
// Each film in the panel: <p><strong><a>TITLE</a></strong><br><span>12:15</span>...</p>
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

export async function scrapeFilmForum(date: Date): Promise<VenueData> {
  const html = await fetchPage("https://filmforum.org/now_playing");
  const $ = cheerio.load(html);

  const dayClass = date.toLocaleString("en-US", { weekday: "short" }).toLowerCase(); // "thu"

  // Find today's tab href: <li class="thu"><a href="#tabs-0">
  const tabHref = $(`#tabs ul li.${dayClass} a`).attr("href"); // "#tabs-0"
  if (!tabHref) return { key: "film_forum", status: "pending", showings: [] };

  const panelId = tabHref.replace("#", ""); // "tabs-0"
  const $panel = $(`#${panelId}`);
  if (!$panel.length) return { key: "film_forum", status: "pending", showings: [] };

  const showings: Showing[] = [];

  // Each film: <p><strong><a>TITLE</a></strong><br><span>12:15</span><span>2:20</span>...</p>
  $panel.find("p").each((_, el) => {
    const $p = $(el);
    const title = $p.find("strong a, strong").first().text().trim();
    if (!title || title.length < 2) return;

    const tag = /35mm/i.test(title) ? "35mm" : /70mm/i.test(title) ? "70mm" : "";
    const cleanTitle = title.replace(/\s*35mm\s*/i, "").replace(/\s*70mm\s*/i, "").trim();

    const times = $p.find("span").map((_, s) => {
      const t = $(s).text().trim();
      return /^\d{1,2}:\d{2}$/.test(t) ? t : null;
    }).get().filter(Boolean) as string[];

    if (cleanTitle && times.length > 0) {
      showings.push({ title: cleanTitle, times, tag });
    }
  });

  const valid = validateShowings(showings, "Film Forum");
  return { key: "film_forum", status: valid ? "open" : "pending", showings: valid ?? [] };
}
