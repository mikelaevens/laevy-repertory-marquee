# Handoff: Laevy Repertory Theatre — Daily Auto-Updating Marquee

## Goal
Turn the existing one-off marquee design into a **website that rebuilds itself every day**: each morning it scrapes six repertory cinemas' schedules for *today*, drops them into the marquee design, and redeploys to a public URL the owner can share.

There are two jobs here:
1. **Templating** — convert the static design (`design/Laevy Repertory Theatre.dc.html`) into a template with six fillable panel slots.
2. **Automation** — a scheduled job that scrapes → fills the template → deploys, once per day.

## About the design file
`design/Laevy Repertory Theatre.dc.html` is a **design reference**, not production code to ship as-is. It's a snapshot: the six panels currently contain hand-entered listings for Wednesday, June 17 2026. It was authored as a "Design Component" (a streaming HTML format) — for this project you can **flatten it into one plain `index.html`**: copy the markup from inside the `<x-dc>` body, inline the small logic (the marquee bulbs are generated from a JS array — just emit ~42 `<span>` bulbs, or keep a tiny script), and keep the Google Fonts `<link>` and the `<style>` keyframes from the `<helmet>`. No framework required; it's static HTML/CSS. Recreate it faithfully (it's high-fidelity — see Design Tokens below), then replace the six panels' listing rows with template variables.

## The six panels (data model)
Each panel is one venue. Model the day's data as:

```json
{
  "date": "2026-06-17",
  "dateLabel": "Wednesday · June 17, 2026",
  "venues": [
    {
      "key": "new_beverly",
      "name": "New Beverly",          // rendered in its own typeface (see below)
      "sub": "Los Angeles · 35mm Double Feature",
      "status": "open",                // "open" | "dark" | "pending"
      "showings": [
        { "title": "Breakfast at Tiffany's", "time": "7:30", "tag": "" },
        { "title": "Roman Holiday", "time": "9:55", "tag": "" }
      ]
    }
    // ... 5 more
  ]
}
```

- `tag` is the small grey qualifier shown after a title (e.g. `35mm`, `70mm`, `Video Archives`, `YFF Archive Dive`).
- `status: "dark"` → render the muted "Dark Tonight" line instead of showings (used when a venue has no screening that day).
- `status: "pending"` → render the "Program To Be Posted / — SEE BOX OFFICE —" slate (fallback if a scraper returns nothing).
- The American Cinematheque panel is a **combined** venue (Aero + Los Feliz 3) — see notes. It renders a small "— Aero, Santa Monica —" / "— Los Feliz 3 —" subhead before each sub-list.

Keep each venue's header **typeface** fixed (it's part of the visual identity), only the listings change daily. Header treatments:
| Venue | Font | Notes |
|---|---|---|
| New Beverly | Cinzel 900 | gold `#ecca7a` |
| The Vista | Poiret One 700 | "THE" small kicker above "VISTA" |
| American Cinematheque | Archivo 800 | stacked two lines, white `#f1ede2` |
| Music Box | Limelight | amber `#ffd27a`, neon glow |
| Film Forum | Archivo 900 | stacked "Film / Forum" |
| Metrograph | Playfair Display 900 italic | bone `#f0ead9` |

## Data sources (verified working) + scraping notes
**Critical finding:** most of these venues publish their official calendars as **JavaScript-rendered** pages — fetching the raw HTML returns an empty shell. Use the plain-HTML sources below where noted; the rest need a **headless browser (Playwright/Puppeteer)**.

| Venue | Use this source | Type | Notes |
|---|---|---|---|
| New Beverly | `https://thenewbev.com/schedule/` | **plain HTML** | Month list; lines like "Wed, June 17 7:30 pm / 9:55 pm Breakfast at Tiffany's / Roman Holiday". Parse date + title(s) + time(s). |
| The Vista | `https://ticketing.uswest.veezi.com/sessions/?siteToken=20xhpa3yt2hhkwt4zjvfcwsaww` | **plain HTML** (Veezi) | Grouped by "Wednesday 17, June" headings → film title + times. Note "Video Archives" microcinema tag in the subtitle line. |
| American Cinematheque — Aero | `https://www.revivalhouses.com/theaters/aero-theatre/` | **plain HTML** | Official AC site is JS-gated; Revival Houses mirrors it as HTML. Rows: title, "Wed, Jun 17", time, italic series note. |
| American Cinematheque — Los Feliz 3 | `https://www.revivalhouses.com/theaters/los-feliz-theatre/` | **plain HTML** | Same format. If no row matches today's date → `status: "dark"`. |
| Music Box (Chicago) | `https://do312.com/venues/music-box-theatre` | **plain HTML** | Official site + Moviefone/Showtimes are JS-gated; Do312 lists titles+times under "Today Jun 17" / "Tomorrow Jun 18" day headers. |
| Film Forum (NY) | `https://filmforum.org/now_playing` | **plain HTML** | "Playing This Week" has day tabs TUE…MON; pick today's block. Titles link to `/film/...`, times follow. Note `35mm` when a title says so. |
| Metrograph (NY) | `https://metrograph.com/nyc/?date=YYYY-MM-DD` | **plain HTML** | Accepts a `?date=` param. The day's films are the first cluster (title in `<h4>`, then "Director / year / runtime / format", then a time). |

Two more facts to encode:
- **The Egyptian Theatre is closed June 8 – Sept 23, 2026** for renovation — that's why American Cinematheque uses Aero + Los Feliz, not the Egyptian. After it reopens, it could be added/swapped.
- Times on the marquee are shown without am/pm (e.g. `7:30`, `9:55`) to match the reader-board look.

## Suggested architecture
```
/marquee
  scrape/
    newbeverly.ts      # fetch + parse → {showings} for a given date
    vista.ts
    cinematheque.ts    # Aero + Los Feliz, merged
    musicbox.ts
    filmforum.ts
    metrograph.ts
    index.ts           # runs all, writes data/today.json (with per-venue try/catch → status:"pending" on failure)
  template/
    index.html         # the flattened marquee with {{slots}}
    build.ts           # reads data/today.json, renders → dist/index.html
  .github/workflows/
    daily.yml          # cron: build + deploy
```
- Plain-HTML sources: `fetch` + `cheerio`.
- JS-gated fallback (if a source above ever goes JS-only): `playwright` headless, `page.goto`, wait for the listing selector, read `innerText`.
- **Resilience:** wrap each scraper in try/catch. If one fails, set that venue `status:"pending"` and still publish the other five — never let one broken site blank the whole board.
- Cache the previous day's `today.json`; if a scrape returns empty but the site is up, prefer "pending" over wiping good data.

## Scheduling + hosting
See **HOSTING.md** — it covers the recommended free path (GitHub Pages + GitHub Actions cron) step by step, plus simpler and alternative options, written for a non-developer.

## Design Tokens
**Fonts (Google Fonts):** Cinzel (400/700/900), Playfair Display (700/900, italics), Oswald (300–700), Archivo (600–900), Poiret One, Limelight.

**Colors:**
- Night background: radial `#2a201a → #140f0c → #0a0807`
- Marquee body (oxblood): `#84191a → #5d0f10`; trim/bulbs gold `#c9a24c`
- Bulbs: radial `#fff6df → #ffd27a → #b97e2c`, glow `rgba(255,196,110,.85)`
- Cream reader band: `#f4e8c8 → #dbca9f`, text `#5a3d18`
- Brick wall: `#241b15` with repeating-linear-gradient mortar lines
- Brass case frame: `#e6c473 → #8d6c2c → #5f4717`
- Letterboard: `#0b0b0c` with `repeating-linear-gradient(180deg,#0b0b0c 0 26px,#141416 26px 27px)` grooves
- Film title (bone): `#efe9da`; showtime (gold): `#e6b455`; sub-line gold: `#b89a5e`; muted: `#7d7565`/`#8f8775`
- Box Office sign: `#ffe6a6 → #e9c061`, border `#b98a2e`, text `#3a2410`
- Now Showing neon: text `#fff0d2`, glow `#ff7a4d / #ff5630 / #ff3a18`

**Keyframes:** `bulbChase` (opacity .38↔1, staggered delay per bulb), `neonFlicker` (Now Showing), `neonBox` (Box Office brightness pulse).

**Layout:** 1520px fixed-width stage centered on the night background. Marquee blade on top (full width). Six brass display cases in a 3×2 grid (`repeat(3,1fr)`, gap 26px). Facade base strip below: brass "EST. MCMXXI" plaque (left), "BOX OFFICE" sign over three glass doors (center), "NOW SHOWING" neon (right). Optional floor reflection at the bottom.

## Files in this bundle
- `design/Laevy Repertory Theatre.dc.html` — the marquee design reference (snapshot).
- `README.md` — this file.
- `HOSTING.md` — step-by-step publish + daily-update guide.

## How to start (in Claude Code)
Open this folder in Claude Code and say: *"Read README.md and HOSTING.md, flatten the design into a static template with six fillable panels, write the six scrapers per the data-sources table, wire a daily GitHub Action that rebuilds and deploys to GitHub Pages, and walk me through connecting my repo."*
