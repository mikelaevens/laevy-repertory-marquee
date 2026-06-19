import { writeFileSync, mkdirSync } from "fs";
import { scrapeNewBeverly } from "./newbeverly.js";
import { scrapeVista } from "./vista.js";
import { scrapeCinematheque } from "./cinematheque.js";
import { scrapeMusicBox } from "./musicbox.js";
import { scrapeFilmForum } from "./filmforum.js";
import { scrapeMetrograph } from "./metrograph.js";
import type { VenueData } from "./types.js";

const date = new Date();
// Use local calendar date, not UTC — avoids off-by-one after midnight UTC
const dateStr = [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const dateLabel = `${dayNames[date.getDay()]} · ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

async function safeScrape(
  name: string,
  fn: (d: Date) => Promise<VenueData>
): Promise<VenueData> {
  try {
    const result = await fn(date);
    const count = result.showings.length + (result.aero?.length ?? 0) + (result.losFeliz?.length ?? 0);

    // Sanity: more than 8 total entries is a bad parse
    if (count > 8) {
      console.warn(`⚠ ${name}: ${count} entries — too many, falling back to pending`);
      return { key: result.key, status: "pending", showings: [] };
    }

    const icon = result.status === "open" ? "✓" : result.status === "dark" ? "—" : "?";
    console.log(`${icon} ${name}: ${result.status}, ${count} showings`);
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

// Sanity check: if every venue is pending, something is very wrong — fail the build
const allPending = [newBeverly, vista, cinematheque, musicBox, filmForum, metrograph]
  .every(v => v.status === "pending");
if (allPending) {
  console.error("✗ ALL venues returned pending — scrape step failed entirely");
  process.exit(1);
}

const output = {
  date: dateStr,
  dateLabel,
  venues: { newBeverly, vista, cinematheque, musicBox, filmForum, metrograph },
};

mkdirSync("data", { recursive: true });
writeFileSync("data/today.json", JSON.stringify(output, null, 2));
console.log(`\nWrote data/today.json for ${dateLabel}`);
