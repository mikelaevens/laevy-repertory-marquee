import * as cheerio from "cheerio";
import type { VenueData, Showing } from "./types.js";

// New Beverly posts a month list. Lines look like:
// "Wed, June 17  7:30 pm / 9:55 pm  Breakfast at Tiffany's / Roman Holiday"
export async function scrapeNewBeverly(date: Date): Promise<VenueData> {
  const res = await fetch("https://thenewbev.com/schedule/");
  const html = await res.text();
  const $ = cheerio.load(html);

  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  // Match day header: "Wed, June 17" or similar
  const dayPattern = new RegExp(`\\b${month}\\s+${day}\\b`, "i");

  const showings: Showing[] = [];

  // The schedule is often in <p> or list items with date + showtime + title
  // Try to find any text node containing today's date
  $("*").each((_, el) => {
    const text = $(el).text().trim();
    if (!dayPattern.test(text)) return;
    // Extract time/title pairs. Times look like "7:30 pm", "9:55 pm"
    // Titles follow " pm " token
    const timeRe = /(\d{1,2}:\d{2})\s*(?:am|pm)/gi;
    const titleRe = /(?:am|pm)\s+(.+?)(?:\s*\/\s*|$)/gi;

    const times: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = timeRe.exec(text)) !== null) {
      // Convert to 24h-style display (strip am/pm, keep as-is per marquee style)
      times.push(m[1]);
    }

    // Titles: everything after the last time token, split by " / "
    const afterTimes = text.replace(/.*?\d{1,2}:\d{2}\s*(?:am|pm)/i, "").trim();
    const titles = afterTimes.split(/\s*\/\s*/).map(t => t.trim()).filter(Boolean);

    if (titles.length === 0 || times.length === 0) return;

    // Pair: if N titles and N times, pair them; if fewer times, assign as multi-time
    if (titles.length === times.length) {
      for (let i = 0; i < titles.length; i++) {
        showings.push({ title: titles[i], times: [times[i]], tag: "" });
      }
    } else if (titles.length > 0) {
      // Double-feature: two titles, two times
      titles.forEach((title, i) => {
        showings.push({ title, times: times[i] ? [times[i]] : [], tag: "" });
      });
    }
  });

  if (showings.length === 0) {
    return { key: "new_beverly", status: "pending", showings: [] };
  }
  return { key: "new_beverly", status: "open", showings };
}
