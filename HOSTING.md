# Hosting & Daily Updates — plain-English guide

You have two questions: **(1) how do friends see it?** and **(2) how does it refresh every day?** The setup below answers both at once and is **free**. It assumes Claude Code does the building — you mostly click through account setup.

---

## Recommended: GitHub Pages + GitHub Actions (free, auto-daily)

This hosts the page **and** updates it every morning, with no server to run.

**One-time setup (with Claude Code doing the work):**
1. **Make a free GitHub account** at github.com (if you don't have one).
2. In Claude Code, in the project folder, let it create a repository and push the code. It can run the `git` and `gh` commands for you.
3. In the repo on github.com: **Settings → Pages →** set Source to "GitHub Actions". This gives you a public URL like `https://yourname.github.io/laevy-marquee/`.
4. Claude Code adds a **scheduled workflow** (`.github/workflows/daily.yml`) with a cron line, e.g. run at 13:00 UTC daily (≈ 6am Pacific). Each run scrapes today's listings, rebuilds the page, and publishes it.

**After that:** nothing. The page updates itself daily. **Share the `github.io` link** with friends — that's the whole thing.

Notes:
- GitHub Actions is free for public repos. A daily run is tiny.
- Cron on GitHub can lag a few minutes and occasionally skips under heavy load — fine for a once-a-day marquee. You can also click "Run workflow" manually anytime.
- Pick the cron hour to be *after* the theaters post the day's schedule (early morning local time is safe).

---

## Simplest share, no auto-update: Netlify Drop

If you just want friends to see **today's** snapshot right now and don't need it to refresh automatically:
1. Ask me (in the design tool) to export a **standalone HTML file**.
2. Go to **app.netlify.com/drop** and drag the file onto the page.
3. You get a public link instantly. Share it.

This never changes on its own — re-drop a new file when you want to update. Good as a stopgap while the automated version gets built.

---

## Alternative auto-update hosts (if you prefer)

All free; Claude Code can target any of them. The pattern is identical — a daily job rebuilds the page and pushes it.

- **Vercel** or **Netlify (Git-connected)** — connect the GitHub repo; they redeploy on each commit. Pair with a daily GitHub Action that commits the fresh `index.html`, or use the host's own scheduled-function/cron feature to run the scrape.
- **Cloudflare Pages** — same idea; Cloudflare Workers Cron can run the daily scrape.

GitHub Pages + Actions is recommended only because it keeps **everything in one free place** with the least account-juggling.

---

## Custom domain (optional, ~$10–15/yr)
Any of the above lets you point a domain like `laevyrep.com` at the site (buy from Namecloud/Cloudflare/Porkbun, add it in the host's Domains settings). Purely cosmetic — the free `github.io` / `netlify.app` link works the same.

---

## The one honest caveat
Scrapers read other people's websites. When a theater **redesigns its site**, that venue's scraper can break and its panel will fall back to "Program To Be Posted" until it's fixed. That's normal and expected — keep Claude Code handy to patch a scraper when a panel goes blank. The build is designed so **one broken venue never takes down the other five.**
