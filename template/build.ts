import { readFileSync, writeFileSync, mkdirSync } from "fs";
import type { VenueData, Showing } from "../scrape/types.js";

interface TodayData {
  date: string;
  dateLabel: string;
  venues: {
    newBeverly: VenueData;
    vista: VenueData;
    cinematheque: VenueData;
    musicBox: VenueData;
    filmForum: VenueData;
    metrograph: VenueData;
  };
}

const data: TodayData = JSON.parse(readFileSync("data/today.json", "utf-8"));

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ROW_STYLE = `display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:6px 0;`;
const BORDER_BOTTOM = `border-bottom:1px solid rgba(255,255,255,.06);`;
const TITLE_STYLE = `font-family:'Oswald';font-weight:500;font-size:15px;letter-spacing:.04em;color:#efe9da;text-transform:uppercase;`;
const TIME_STYLE = `font-family:'Oswald';font-weight:600;font-size:15px;color:#e6b455;white-space:nowrap;`;
const TAG_STYLE = `color:#8f8775;font-weight:300;font-size:11px;`;

function showingRow(s: Showing, last = false): string {
  const border = last ? "" : BORDER_BOTTOM;
  const tag = s.tag ? ` <span style="${TAG_STYLE}">${esc(s.tag)}</span>` : "";
  const times = s.times.join(" · ");
  return `<div style="${ROW_STYLE}${border}">` +
    `<span style="${TITLE_STYLE}">${esc(s.title)}${tag}</span>` +
    `<span style="${TIME_STYLE}">${esc(times)}</span>` +
    `</div>`;
}

function darkLine(): string {
  return `<div style="font-family:'Oswald';font-weight:300;font-size:12px;letter-spacing:.14em;color:#8f8775;text-transform:uppercase;padding:6px 0;">Dark Tonight</div>`;
}

function pendingSlate(): string {
  return `<div style="font-family:'Oswald';font-weight:300;font-size:11px;letter-spacing:.18em;color:#7d7565;text-transform:uppercase;padding:8px 0;line-height:1.7;">Program To Be Posted<br><span style="font-size:10px;letter-spacing:.22em;">— SEE BOX OFFICE —</span></div>`;
}

function showingsBlock(showings: Showing[]): string {
  if (!showings || showings.length === 0) return pendingSlate();
  return showings.map((s, i) => showingRow(s, i === showings.length - 1)).join("");
}

const DIVIDER = `<div style="height:1px;background:linear-gradient(90deg,transparent,#caa24c,transparent);margin:13px 0;"></div>`;
const SUBHEAD = (label: string) =>
  `<div style="font-family:'Oswald';font-weight:600;font-size:9px;letter-spacing:.28em;color:#9c7e44;text-transform:uppercase;margin-bottom:3px;">— ${esc(label)} —</div>`;

// ── Panel builders ────────────────────────────────────────────────────────────

function wrapPanel(inner: string): string {
  return `<div style="background:linear-gradient(150deg,#e6c473,#8d6c2c 60%,#5f4717);padding:9px;border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,.5),inset 0 1px 2px rgba(255,255,255,.45);">
  <div style="background:#0b0b0c;background-image:repeating-linear-gradient(180deg,#0b0b0c 0 26px,#141416 26px 27px);border-radius:3px;padding:18px 20px 20px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;box-shadow:inset 0 0 32px rgba(0,0,0,.7);">
    ${inner}
  </div>
</div>`;
}

function panelNewBeverly(v: VenueData): string {
  return wrapPanel(`
    <div style="font-family:'Cinzel',serif;font-weight:900;font-size:29px;letter-spacing:.05em;color:#ecca7a;line-height:1;text-shadow:0 1px 0 rgba(0,0,0,.7);">NEW BEVERLY</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:5px;">Los Angeles · 35mm Double Feature</div>
    ${DIVIDER}
    <div style="display:flex;flex-direction:column;">
      ${v.status === "open" ? showingsBlock(v.showings) : v.status === "dark" ? darkLine() : pendingSlate()}
    </div>`);
}

function panelVista(v: VenueData): string {
  return wrapPanel(`
    <div style="font-family:'Poiret One',sans-serif;font-weight:700;font-size:13px;letter-spacing:.4em;color:#9fb7b3;padding-left:.4em;">THE</div>
    <div style="font-family:'Poiret One',sans-serif;font-weight:700;font-size:34px;letter-spacing:.24em;color:#e7e1d2;line-height:1;padding-left:.24em;">VISTA</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:6px;">Los Angeles · Los Feliz</div>
    ${DIVIDER}
    <div style="display:flex;flex-direction:column;">
      ${v.status === "open" ? showingsBlock(v.showings) : v.status === "dark" ? darkLine() : pendingSlate()}
    </div>`);
}

function panelCinematheque(v: VenueData): string {
  const aeroBlock = v.aero && v.aero.length > 0
    ? `${SUBHEAD("Aero, Santa Monica")}${showingsBlock(v.aero)}`
    : `${SUBHEAD("Aero, Santa Monica")}${pendingSlate()}`;

  const lfBlock = v.losFeliz && v.losFeliz.length > 0
    ? `<div style="margin-top:13px;">${SUBHEAD("Los Feliz 3")}${showingsBlock(v.losFeliz)}</div>`
    : `<div style="margin-top:13px;">${SUBHEAD("Los Feliz 3")}${darkLine()}</div>`;

  const body = v.status === "pending"
    ? pendingSlate()
    : `${aeroBlock}${lfBlock}`;

  return wrapPanel(`
    <div style="font-family:'Archivo',sans-serif;font-weight:800;font-size:20px;letter-spacing:.01em;color:#f1ede2;line-height:1.02;text-transform:uppercase;">American<br>Cinematheque</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:6px;">Aero · Los Feliz 3 · Los Angeles</div>
    ${DIVIDER}
    <div style="display:flex;flex-direction:column;">${body}</div>`);
}

function panelMusicBox(v: VenueData): string {
  return wrapPanel(`
    <div style="font-family:'Limelight',sans-serif;font-size:28px;letter-spacing:.05em;color:#ffd27a;line-height:1;text-shadow:0 0 8px rgba(255,150,60,.5);">MUSIC BOX</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:6px;">Chicago · Southport Ave</div>
    ${DIVIDER}
    <div style="display:flex;flex-direction:column;">
      ${v.status === "open" ? showingsBlock(v.showings) : v.status === "dark" ? darkLine() : pendingSlate()}
    </div>`);
}

function panelFilmForum(v: VenueData): string {
  // Film Forum uses stacked rows with title on top, times below (different layout)
  const filmRows = v.showings.map(s => {
    const tag = s.tag ? ` <span style="${TAG_STYLE}">${esc(s.tag)}</span>` : "";
    return `<div>
      <div style="font-family:'Oswald';font-weight:500;font-size:14px;letter-spacing:.03em;color:#efe9da;text-transform:uppercase;line-height:1.1;">${esc(s.title)}${tag}</div>
      <div style="font-family:'Oswald';font-weight:600;font-size:13px;letter-spacing:.08em;color:#e6b455;">${esc(s.times.join(" · "))}</div>
    </div>`;
  }).join("");

  return wrapPanel(`
    <div style="font-family:'Archivo',sans-serif;font-weight:900;font-size:31px;letter-spacing:-.01em;color:#f1ede2;line-height:.9;text-transform:uppercase;">Film<br>Forum</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:6px;">New York · W Houston St</div>
    <div style="height:1px;background:linear-gradient(90deg,transparent,#caa24c,transparent);margin:11px 0;"></div>
    <div style="display:flex;flex-direction:column;gap:9px;">
      ${v.status === "open" && v.showings.length > 0 ? filmRows : v.status === "dark" ? darkLine() : pendingSlate()}
    </div>`);
}

function panelMetrograph(v: VenueData): string {
  return wrapPanel(`
    <div style="font-family:'Playfair Display',serif;font-weight:900;font-style:italic;font-size:30px;letter-spacing:.01em;color:#f0ead9;line-height:1;">Metrograph</div>
    <div style="font-family:'Oswald',sans-serif;font-weight:400;font-size:11px;letter-spacing:.22em;color:#b89a5e;text-transform:uppercase;margin-top:5px;">New York · 7 Ludlow</div>
    <div style="height:1px;background:linear-gradient(90deg,transparent,#caa24c,transparent);margin:11px 0;"></div>
    <div style="display:flex;flex-direction:column;">
      ${v.status === "open" ? showingsBlock(v.showings) : v.status === "dark" ? darkLine() : pendingSlate()}
    </div>`);
}

// ── Bulbs (42) ────────────────────────────────────────────────────────────────

function bulbs(): string {
  return Array.from({ length: 42 }, (_, i) =>
    `<span style="width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff6df,#ffd27a 55%,#b97e2c);box-shadow:0 0 9px 2px rgba(255,196,110,.85);animation:bulbChase 1.5s ease-in-out infinite;animation-delay:${(i * 0.08).toFixed(2)}s;"></span>`
  ).join("");
}

// ── Full page ─────────────────────────────────────────────────────────────────

const { dateLabel, venues } = data;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Laevy Repertory Theatre — ${esc(dateLabel)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Oswald:wght@300;400;500;600;700&family=Archivo:wght@600;700;800;900&family=Poiret+One&family=Limelight&display=swap" rel="stylesheet">
<style>
  body{margin:0;}
  @keyframes bulbChase{0%,100%{opacity:.38;}50%{opacity:1;}}
  @keyframes neonFlicker{0%,17%,21%,24%,55%,59%,100%{opacity:1;}19%,23%,57%{opacity:.5;}}
  @keyframes neonBox{0%,100%{filter:brightness(1);}50%{filter:brightness(1.12);}}

  /* ── Responsive overrides ── */
  .stage{width:1520px;margin:0 auto;}
  .marquee-wrap{position:relative;width:1460px;margin:0 auto;}
  .marquee-blade{position:relative;background:linear-gradient(180deg,#84191a 0%,#5d0f10 100%);border-radius:18px;border:3px solid #c9a24c;padding:40px 70px 38px;box-shadow:0 24px 70px rgba(0,0,0,.65),0 0 90px rgba(255,150,60,.16),inset 0 2px 4px rgba(255,255,255,.12);}
  .marquee-title{font-family:'Cinzel',serif;font-weight:900;font-size:66px;letter-spacing:.09em;color:#f5da8c;line-height:1;text-shadow:0 2px 0 #6b4a12,0 0 32px rgba(255,200,90,.5);}
  .marquee-sub{font-family:'Cinzel',serif;font-weight:700;font-size:29px;letter-spacing:.36em;color:#f1e8d1;margin-top:10px;padding-left:.36em;}
  .marquee-date{text-align:center;font-family:'Oswald',sans-serif;font-weight:600;font-size:16px;letter-spacing:.24em;color:#5a3d18;text-transform:uppercase;padding-left:.24em;}
  .panels-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;}
  .facade-base{margin-top:46px;display:grid;grid-template-columns:1fr 1.25fr 1fr;align-items:end;gap:24px;padding-bottom:48px;}
  .facade-plaque{align-self:end;}
  .facade-neon{justify-self:end;align-self:end;}
  .hanger-arms{position:absolute;top:-22px;left:50%;transform:translateX(-50%);display:flex;gap:520px;}
  .bulbs-top{position:absolute;top:11px;left:26px;right:26px;display:flex;justify-content:space-between;}
  .bulbs-bottom{position:absolute;bottom:11px;left:26px;right:26px;display:flex;justify-content:space-between;}

  @media(max-width:900px){
    .stage{width:100%;}
    .marquee-wrap{width:100%;}
    .panels-grid{grid-template-columns:repeat(2,1fr);gap:16px;}
    .marquee-blade{padding:28px 40px 26px;}
    .marquee-title{font-size:44px;}
    .marquee-sub{font-size:18px;letter-spacing:.22em;}
    .marquee-date{font-size:13px;letter-spacing:.14em;}
    .hanger-arms{gap:300px;}
  }

  @media(max-width:560px){
    .stage{width:100%;}
    .marquee-wrap{width:100%;}
    .panels-grid{grid-template-columns:1fr;gap:12px;}
    .marquee-blade{padding:22px 22px 20px;border-radius:12px;}
    .marquee-title{font-size:30px;letter-spacing:.06em;}
    .marquee-sub{font-size:13px;letter-spacing:.18em;margin-top:6px;}
    .marquee-date{font-size:10px;letter-spacing:.1em;}
    .bulbs-top,.bulbs-bottom{display:none;}
    .hanger-arms{display:none;}
    .facade-base{grid-template-columns:1fr;gap:16px;padding-bottom:32px;}
    .facade-plaque{display:none;}
    .facade-neon{justify-self:center;}
  }
</style>
</head>
<body>
<div style="min-height:100vh;box-sizing:border-box;background:radial-gradient(120% 80% at 50% 0%,#2a201a 0%,#140f0c 45%,#0a0807 100%);padding:56px 20px 64px;font-family:'Oswald',sans-serif;">
<div class="stage">

  <!-- MARQUEE SIGN -->
  <div class="marquee-wrap">
    <div class="marquee-blade">
      <!-- top bulbs -->
      <div class="bulbs-top">${bulbs()}</div>
      <!-- bottom bulbs -->
      <div class="bulbs-bottom">${bulbs()}</div>
      <div style="text-align:center;padding:4px 0;">
        <div class="marquee-title">LAEVY</div>
        <div class="marquee-sub">REPERTORY THEATRE</div>
      </div>
      <div style="margin-top:20px;background:linear-gradient(180deg,#f4e8c8,#dbca9f);border-radius:6px;padding:10px 0;box-shadow:inset 0 0 18px rgba(120,90,40,.35);">
        <div class="marquee-date">${esc(dateLabel)} · Six Revival Houses, One Marquee</div>
      </div>
    </div>
    <!-- hanger arms -->
    <div class="hanger-arms">
      <span style="width:5px;height:24px;background:linear-gradient(#caa24c,#7a5c1f);"></span>
      <span style="width:5px;height:24px;background:linear-gradient(#caa24c,#7a5c1f);"></span>
    </div>
  </div>

  <!-- BUILDING FACADE -->
  <div style="margin-top:30px;background-color:#241b15;background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.30) 0 2px,transparent 2px 38px),repeating-linear-gradient(90deg,rgba(0,0,0,.22) 0 2px,transparent 2px 88px),radial-gradient(120% 60% at 50% -10%,rgba(255,170,80,.10),transparent 60%);border-radius:4px;border-left:6px solid rgba(0,0,0,.35);border-right:6px solid rgba(0,0,0,.35);box-shadow:inset 0 36px 70px rgba(0,0,0,.55),0 30px 60px rgba(0,0,0,.5);padding:46px 20px 0;">

    <!-- 6 DISPLAY CASES -->
    <div class="panels-grid">
      ${panelNewBeverly(venues.newBeverly)}
      ${panelVista(venues.vista)}
      ${panelCinematheque(venues.cinematheque)}
      ${panelMusicBox(venues.musicBox)}
      ${panelFilmForum(venues.filmForum)}
      ${panelMetrograph(venues.metrograph)}
    </div>

    <!-- FACADE BASE -->
    <div class="facade-base">
      <!-- brass plaque -->
      <div class="facade-plaque">
        <div style="display:inline-block;background:linear-gradient(150deg,#e6c473,#8a6829);padding:10px 18px;border-radius:4px;box-shadow:0 6px 16px rgba(0,0,0,.5),inset 0 1px 2px rgba(255,255,255,.4);">
          <div style="font-family:'Cinzel',serif;font-weight:700;font-size:12px;letter-spacing:.24em;color:#3a2810;padding-left:.24em;">EST. MCMXXI</div>
        </div>
      </div>
      <!-- BOX OFFICE + doors -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
        <div style="font-family:'Cinzel',serif;font-weight:900;font-size:26px;letter-spacing:.13em;color:#3a2410;background:linear-gradient(180deg,#ffe6a6,#e9c061);padding:13px 36px;border-radius:7px;border:3px solid #b98a2e;padding-left:calc(36px + .13em);box-shadow:0 0 28px rgba(255,200,90,.55),0 8px 22px rgba(0,0,0,.55),inset 0 1px 2px rgba(255,255,255,.6);animation:neonBox 3s ease-in-out infinite;">BOX OFFICE</div>
        <div style="display:flex;gap:10px;">
          <div style="position:relative;width:78px;height:158px;background:linear-gradient(180deg,#1d2b31,#0b1216);border:3px solid #b9912f;border-radius:8px 8px 0 0;box-shadow:inset 0 0 20px rgba(120,180,200,.16);"><span style="position:absolute;top:64px;right:9px;width:4px;height:36px;background:#caa24c;border-radius:2px;"></span></div>
          <div style="position:relative;width:78px;height:158px;background:linear-gradient(180deg,#1d2b31,#0b1216);border:3px solid #b9912f;border-radius:8px 8px 0 0;box-shadow:inset 0 0 20px rgba(120,180,200,.16);"><span style="position:absolute;top:64px;left:9px;width:4px;height:36px;background:#caa24c;border-radius:2px;"></span><span style="position:absolute;top:64px;right:9px;width:4px;height:36px;background:#caa24c;border-radius:2px;"></span></div>
          <div style="position:relative;width:78px;height:158px;background:linear-gradient(180deg,#1d2b31,#0b1216);border:3px solid #b9912f;border-radius:8px 8px 0 0;box-shadow:inset 0 0 20px rgba(120,180,200,.16);"><span style="position:absolute;top:64px;left:9px;width:4px;height:36px;background:#caa24c;border-radius:2px;"></span></div>
        </div>
      </div>
      <!-- NOW SHOWING neon -->
      <div class="facade-neon">
        <div style="background:linear-gradient(180deg,#171210,#0c0a09);border:2px solid #3a2c1e;border-radius:10px;padding:18px 28px;box-shadow:0 12px 32px rgba(0,0,0,.6);transform:rotate(-2.5deg);">
          <div style="font-family:'Limelight',sans-serif;font-size:30px;letter-spacing:.05em;color:#fff0d2;text-shadow:0 0 6px #ff7a4d,0 0 14px #ff5630,0 0 28px #ff3a18;animation:neonFlicker 5s infinite;">NOW SHOWING</div>
          <div style="text-align:center;margin-top:9px;font-family:'Oswald',sans-serif;font-weight:500;letter-spacing:.3em;font-size:11px;color:#e6b455;padding-left:.3em;">↓ TICKETS HERE ↓</div>
        </div>
      </div>
    </div>
  </div>

  <!-- reflection -->
  <div style="height:80px;margin:0 60px;background:linear-gradient(180deg,rgba(255,170,80,.12),transparent);filter:blur(14px);transform:scaleY(-1);border-radius:50%;"></div>

</div>
</div>
</body>
</html>`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
console.log(`Built dist/index.html for ${dateLabel}`);
