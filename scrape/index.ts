import { writeFileSync, mkdirSync } from "fs";
import { scrapeNewBeverly } from "./newbeverly.js";
import { scrapeVista } from "./vista.js";
import { scrapeCinematheque } from "./cinematheque.js";
import { scrapeMusicBox } from "./musicbox.js";
import { scrapeFilmForum } from "./filmforum.js";
import { scrapeMetrograph } from "./metrograph.js";
import type { VenueData } from "./types.js";

const date = new Date();
// Force to today in the local timezone; for GitHub Actions (UTC) this is fine.
const dateStr = date.toISOString().slice(0, 10);

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const dow = dayNames[date.getDay()];
const mon = monthNames[date.getMonth()];
const dateLabel = `${dow} · ${mon} ${date.getDate()}, ${date.getFullYear()}`;

async function safeScrape(
  name: string,
  fn: (d: Date) => Promise<VenueData>
): Promise<VenueData> {
  try {
    const result = await fn(date);
    console.log(`✓ ${name}: ${result.status}, ${result.showings.length + (result.aero?.length ?? 0) + (result.losFeliz?.length ?? 0)} showings`);
    return result;
  } catch (err) {
    console.error(`✗ ${name} failed: ${err}`);
    return { key: name, status: "pending", showings: [] };
  }
}

const [newBeverly, vista, cinematheque, musicBox, filmForum, metrograph] =
  await Promise.all([
    safeScrape("new_beverly", scrapeNewBeverly),
    safeScrape("vista", scrapeVista),
    safeScrape("cinematheque", scrapeCinematheque),
    safeScrape("music_box", scrapeMusicBox),
    safeScrape("film_forum", scrapeFilmForum),
    safeScrape("metrograph", scrapeMetrograph),
  ]);

const output = {
  date: dateStr,
  dateLabel,
  venues: { newBeverly, vista, cinematheque, musicBox, filmForum, metrograph },
};

mkdirSync("data", { recursive: true });
writeFileSync("data/today.json", JSON.stringify(output, null, 2));
console.log(`\nWrote data/today.json for ${dateLabel}`);
