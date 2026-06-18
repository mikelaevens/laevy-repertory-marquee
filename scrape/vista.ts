import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// Veezi ticketing page: grouped by day headings like "Wednesday 17, June"
// Film title + times listed below each heading
export async function scrapeVista(date: Date): Promise<VenueData> {
  const res = await fetch(
    "https://ticketing.uswest.veezi.com/sessions/?siteToken=20xhpa3yt2hhkwt4zjvfcwsaww"
  );
  const html = await res.text();
  const $ = cheerio.load(html);

  const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });

  // Heading pattern: "Wednesday 17, June" or "Wednesday 17 June"
  const headingPattern = new RegExp(`${dayOfWeek}\\s+${day}[,\\s]+${month}`, "i");

  const showings: Showing[] = [];
  let inToday = false;

  // Walk heading-level elements
  $("[class*='date'], h2, h3, h4, .session-date, .listing-date").each((_, el) => {
    const text = $(el).text().trim();
    if (headingPattern.test(text)) {
      inToday = true;
      return;
    }
    // Next date heading ends today's block
    if (inToday && /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(text)) {
      inToday = false;
    }
  });

  // Alternative: find the heading then grab siblings
  let $todaySection: ReturnType<typeof $> | null = null;
  $("[class*='date'], h2, h3, h4, .session-date").each((_, el) => {
    if (headingPattern.test($(el).text())) {
      $todaySection = $(el);
    }
  });

  if ($todaySection) {
    let $cur = ($todaySection as ReturnType<typeof $>).next();
    while ($cur.length && !/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test($cur.text())) {
      const filmTitle = $cur.find("[class*='title'], [class*='film'], h3, h4, strong").first().text().trim();
      const timesText = $cur.find("[class*='time'], [class*='session']").map((_, t) => $(t).text().trim()).get();
      if (filmTitle) {
        // Detect tag in subtitle
        const subtitle = $cur.find("[class*='subtitle'], [class*='format'], small").text();
        const tag = /70mm/i.test(subtitle) ? "70mm" : /35mm/i.test(subtitle) ? "35mm" : /Video Archives/i.test(subtitle) ? "Video Archives" : "";
        const cleanTimes = timesText.map(t => t.replace(/\s*(am|pm)\s*/i, "").trim()).filter(Boolean);
        showings.push({ title: filmTitle, times: cleanTimes, tag });
      }
      $cur = $cur.next();
    }
  }

  // Fallback: search all text for today's date block
  if (showings.length === 0) {
    const bodyText = $("body").text();
    const todayIdx = bodyText.search(headingPattern);
    if (todayIdx !== -1) {
      const slice = bodyText.slice(todayIdx, todayIdx + 800);
      const lines = slice.split("\n").map(l => l.trim()).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Stop at next day heading
        if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line) && i > 1) break;
        const timeMatch = line.match(/\d{1,2}:\d{2}/g);
        if (timeMatch && i > 0) {
          const title = lines[i - 1].replace(/\d{1,2}:\d{2}.*$/, "").trim();
          if (title) showings.push({ title, times: timeMatch, tag: "" });
        }
      }
    }
  }

  if (showings.length === 0) return { key: "vista", status: "pending", showings: [] };
  return { key: "vista", status: "open", showings };
}
