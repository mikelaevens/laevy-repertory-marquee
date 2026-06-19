// The Vista: ticketing.uswest.veezi.com (Veezi)
// Structure: div.date > h3.date-title ("Thursday 18, June") + div.film (one per film)
// Each div.film: h3.title ("Disclosure Day (70mm)") + .sessions .session-times a time
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

export async function scrapeVista(date: Date): Promise<VenueData> {
  const html = await fetchPage(
    "https://ticketing.uswest.veezi.com/sessions/?siteToken=20xhpa3yt2hhkwt4zjvfcwsaww"
  );
  const $ = cheerio.load(html);

  const weekday = date.toLocaleString("en-US", { weekday: "long" }); // "Thursday"
  const day     = date.getDate();                                      // 18
  // Veezi heading format: "Thursday 18, June"
  const headingPattern = new RegExp(`${weekday}\\s+${day},`, "i");

  const showings: Showing[] = [];

  // Find the date block for today
  let $dateBlock: ReturnType<typeof $> | null = null;
  $("div.date").each((_, el) => {
    const heading = $(el).find("h3.date-title, .date-title").first().text().trim();
    if (headingPattern.test(heading) && !$dateBlock) {
      $dateBlock = $(el) as ReturnType<typeof $>;
    }
  });

  if (!$dateBlock) return { key: "vista", status: "pending", showings: [] };

  ($dateBlock as ReturnType<typeof $>).find("div.film").each((_, filmEl) => {
    const rawTitle = $(filmEl).find("h3.title").text().trim();
    if (!rawTitle) return;

    // Extract format tag from title parens, e.g. "Disclosure Day (70mm)"
    const tagMatch = rawTitle.match(/\((\d+mm|Video Archives)\)/i);
    const tag = tagMatch ? tagMatch[1] : "";
    const title = rawTitle.replace(/\s*\([^)]*\)\s*/g, "").trim();

    // Times: look in the sessions block — there may be multiple date-containers;
    // pick only those matching today (in case a film spans days)
    const times: string[] = [];
    $(filmEl).find(".date-container").each((_, dc) => {
      const dcDate = $(dc).find("h4.date").text().trim();
      if (!headingPattern.test(dcDate)) return; // different day
      $(dc).find(".session-times a time, .session-times time, li time").each((_, t) => {
        const raw = $(t).text().trim();
        if (/sold out/i.test($(t).parent().text())) return; // skip sold-out marker
        const cleaned = cleanTime(raw);
        if (/^\d{1,2}:\d{2}$/.test(cleaned)) times.push(cleaned);
      });
    });

    if (title && times.length > 0) showings.push({ title, times, tag });
  });

  const valid = validateShowings(showings, "Vista");
  return { key: "vista", status: valid ? "open" : "pending", showings: valid ?? [] };
}
