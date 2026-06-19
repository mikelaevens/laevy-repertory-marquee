// American Cinematheque — revivalhouses.com
// Each film: <li class="Movie Media js-m">
//   <div class="Media__body">
//     <p class="Movie__title"><a><cite>Title</cite></a></p>
//     <p class="Movie__time Movie__time--date">Thu, Jun 18</p>
//     <p class="Movie__time"><time>7:00 pm</time></p>
//     <p class="Movie__note"><em>Series note (may include 70mm)</em></p>
//   </div>
// </li>
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

async function scrapeRevival(url: string, date: Date): Promise<Showing[]> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const weekday = date.toLocaleString("en-US", { weekday: "short" }); // "Thu"
  const month   = date.toLocaleString("en-US", { month: "short" });   // "Jun"
  const day     = date.getDate();
  const datePattern = new RegExp(`${weekday},?\\s+${month}\\s+${day}\\b`, "i");

  const showings: Showing[] = [];

  // Walk each film item: find ones whose date cell matches today
  $("li.Movie, [class*='Movie'][class*='Media']").each((_, el) => {
    const $el = $(el);
    const dateText = $el.find(".Movie__time--date").first().text().trim();
    if (!datePattern.test(dateText)) return;

    const title = $el.find("cite").first().text().trim();

    // Time: the .Movie__time that does NOT have --date class
    const timeRaw = $el.find(".Movie__time").not(".Movie__time--date").find("time").text().trim()
                 || $el.find(".Movie__time").not(".Movie__time--date").text().trim();
    const time = cleanTime(timeRaw);

    const noteText = $el.find(".Movie__note").text();
    const tag = /70mm/i.test(noteText) ? "70mm" : /35mm/i.test(noteText) ? "35mm" : "";

    if (title && time) showings.push({ title, times: [time], tag });
  });

  return showings;
}

export async function scrapeCinematheque(date: Date): Promise<VenueData> {
  const [aeroRaw, losFelizRaw] = await Promise.all([
    scrapeRevival("https://www.revivalhouses.com/theaters/aero-theatre/", date),
    scrapeRevival("https://www.revivalhouses.com/theaters/los-feliz-theatre/", date),
  ]);

  const aero     = validateShowings(aeroRaw, "Aero") ?? [];
  const losFeliz = validateShowings(losFelizRaw, "Los Feliz 3") ?? [];
  const hasAny   = aero.length > 0 || losFeliz.length > 0;

  return {
    key: "cinematheque",
    status: hasAny ? "open" : "pending",
    showings: [],
    aero:     aero.length > 0     ? aero     : undefined,
    losFeliz: losFeliz.length > 0 ? losFeliz : undefined,
  };
}
