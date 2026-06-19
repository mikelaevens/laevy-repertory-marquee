// New Beverly: thenewbev.com/schedule/
// Structure: article.event-card elements, each with:
//   .event-card__day ("Thu,") + .event-card__month ("June") + .event-card__numb ("18")
//   .event-card__time ("7:30 pm")
//   .event-card__title ("One Battle After Another")
import * as cheerio from "cheerio";
import { fetchPage, cleanTime, validateShowings } from "./extract.js";
import type { VenueData, Showing } from "./types.js";

export async function scrapeNewBeverly(date: Date): Promise<VenueData> {
  const html = await fetchPage("https://thenewbev.com/schedule/");
  const $ = cheerio.load(html);

  const month = date.toLocaleString("en-US", { month: "long" }); // "June"
  const day   = date.getDate();                                    // 18

  const showings: Showing[] = [];

  $("article.event-card").each((_, el) => {
    const cardMonth = $(el).find(".event-card__month").text().trim();
    const cardDay   = parseInt($(el).find(".event-card__numb").text().trim(), 10);
    if (cardMonth.toLowerCase() !== month.toLowerCase() || cardDay !== day) return;

    const title = $(el).find(".event-card__title").text().trim();
    const timeRaw = $(el).find(".event-card__time, time").first().text().trim();
    const time = cleanTime(timeRaw);

    if (title && time) showings.push({ title, times: [time], tag: "" });
  });

  const valid = validateShowings(showings, "New Beverly");
  return { key: "new_beverly", status: valid ? "open" : "pending", showings: valid ?? [] };
}
