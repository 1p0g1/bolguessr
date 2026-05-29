#!/usr/bin/env node
/**
 * hunt-images.mjs — Wikimedia Commons image search for BolGuessr puzzles
 *
 * Usage:
 *   node scripts/hunt-images.mjs "Germany Brazil 2014 World Cup"
 *   node scripts/hunt-images.mjs "Germany Brazil 2014 World Cup" --download
 *   node scripts/hunt-images.mjs --batch                         # process KNOWN_MATCHES list
 *   node scripts/hunt-images.mjs --preview <url>                 # show a single Wikimedia file
 *
 * Output:
 *   - Ranked list of CC-licensed images with dimensions, license, author
 *   - Optional: download top candidate to /tmp/hunt-preview/
 *   - --download: interactively save to public/images/puzzles/ with puzzle date
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUZZLES_DIR = join(ROOT, "public/images/puzzles");

// ─── Matches we know have good Wikimedia coverage ────────────────────────────
const KNOWN_MATCHES = [
  // ── 2014 World Cup — copa2014.gov.br / Agência Brasil (CC BY 3.0 BR) ──────
  // All Brazil games + knockout rounds have 20-70+ press photos each
  { query: "Brazil Croatia 2014 World Cup opening São Paulo", match: "Brazil 3-1 Croatia", date: "2014-06-12", competition: "FIFA World Cup" },
  { query: "Brazil Mexico 2014 World Cup Fortaleza", match: "Brazil 0-0 Mexico", date: "2014-06-17", competition: "FIFA World Cup" },
  { query: "Brazil Cameroon 2014 World Cup", match: "Brazil 4-1 Cameroon", date: "2014-06-23", competition: "FIFA World Cup" },
  { query: "Brazil Chile Mineirão 2014 World Cup", match: "Brazil 1-1 Chile (pens)", date: "2014-06-28", competition: "FIFA World Cup R16" },
  { query: "Brazil Colombia FIFA World Cup 2014-07-04", match: "Brazil 2-1 Colombia", date: "2014-07-04", competition: "FIFA World Cup QF" },
  { query: "Germany Brazil Belo Horizonte 2014", match: "Brazil 1-7 Germany", date: "2014-07-08", competition: "FIFA World Cup SF" },
  { query: "Brazil Netherlands 2014 World Cup third place", match: "Brazil 0-3 Netherlands", date: "2014-07-12", competition: "FIFA World Cup 3rd" },
  { query: "Germany Argentina final World Cup 2014", match: "Germany 1-0 Argentina (AET)", date: "2014-07-13", competition: "FIFA World Cup Final" },
  // Other knockout round games with probable Agência Brasil coverage
  { query: "France Germany 2014 World Cup quarter", match: "Germany 1-0 France", date: "2014-07-04", competition: "FIFA World Cup QF" },
  { query: "Netherlands Argentina 2014 World Cup semi São Paulo", match: "Argentina 0-0 Netherlands (pens)", date: "2014-07-09", competition: "FIFA World Cup SF" },
  { query: "Colombia Uruguay 2014 World Cup", match: "Colombia 2-0 Uruguay", date: "2014-06-28", competition: "FIFA World Cup R16" },
  { query: "Algeria Germany 2014 World Cup", match: "Germany 2-1 Algeria (AET)", date: "2014-06-30", competition: "FIFA World Cup R16" },
  // ── 2018 World Cup ─────────────────────────────────────────────────────────
  { query: "Croatia France 2018 World Cup Final Moscow Luzhniki", match: "France 4-2 Croatia", date: "2018-07-15", competition: "FIFA World Cup Final" },
  { query: "Belgium France 2018 World Cup semi-final", match: "France 1-0 Belgium", date: "2018-07-10", competition: "FIFA World Cup SF" },
  { query: "France Belgium 2018 World Cup", match: "France 1-0 Belgium", date: "2018-07-10", competition: "FIFA World Cup SF" },
  { query: "England Croatia 2018 World Cup semi Moscow", match: "Croatia 2-1 England (AET)", date: "2018-07-11", competition: "FIFA World Cup SF" },
  { query: "France Uruguay 2018 World Cup quarter", match: "France 2-0 Uruguay", date: "2018-07-06", competition: "FIFA World Cup QF" },
  // ── 2022 World Cup ─────────────────────────────────────────────────────────
  { query: "Argentina France 2022 World Cup Final Qatar Lusail", match: "Argentina 3-3 France (pens)", date: "2022-12-18", competition: "FIFA World Cup Final" },
  { query: "Morocco France 2022 World Cup semi-final Qatar", match: "France 2-0 Morocco", date: "2022-12-14", competition: "FIFA World Cup SF" },
  { query: "Argentina Croatia 2022 World Cup semi Qatar", match: "Argentina 3-0 Croatia", date: "2022-12-13", competition: "FIFA World Cup SF" },
];

// ─── Wikimedia Commons API ────────────────────────────────────────────────────

async function wikiFetch(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "BolGuessr/1.0 (https://bolguessr.com)" },
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.includes("too many requests") || text.includes("rate")) {
        const wait = (attempt + 1) * 4000;
        console.log(`  ⏳  Rate limited, waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw new Error(`Bad JSON: ${text.slice(0, 100)}`);
    }
  }
  throw new Error("Failed after 3 retries");
}

async function searchWikimedia(query, limit = 20) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srnamespace", "6"); // File namespace
  url.searchParams.set("srlimit", String(limit));
  url.searchParams.set("srprop", "snippet");
  url.searchParams.set("format", "json");

  const data = await wikiFetch(url);
  return (data.query?.search || []).map((r) => r.title.replace(/^File:/, ""));
}

async function getFileInfo(filenames) {
  if (filenames.length === 0) return [];
  const titles = filenames.map((f) => `File:${f}`).join("|");
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", titles);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata|size");
  url.searchParams.set("format", "json");

  const data = await wikiFetch(url);
  const pages = Object.values(data.query?.pages || {});

  return pages
    .map((page) => {
      const ii = page.imageinfo?.[0];
      if (!ii) return null;
      const meta = ii.extmetadata || {};
      const license = meta.LicenseShortName?.value || meta.License?.value || "unknown";
      const author =
        meta.Artist?.value?.replace(/<[^>]+>/g, "").trim() ||
        meta.Credit?.value?.replace(/<[^>]+>/g, "").trim() ||
        "unknown";
      const desc =
        meta.ImageDescription?.value?.replace(/<[^>]+>/g, "").slice(0, 120) || "";
      return {
        filename: page.title.replace(/^File:/, ""),
        url: ii.url,
        width: ii.width,
        height: ii.height,
        license,
        author,
        desc,
      };
    })
    .filter(Boolean);
}

// ─── License scoring (commercial usability) ──────────────────────────────────

function licenseScore(license) {
  const l = license.toLowerCase();
  if (l.includes("cc0") || l.includes("public domain")) return 10;
  if (l.includes("cc by 1") || l.includes("cc by 2") || l.includes("cc by 3") || l.includes("cc by 4")) return 9;
  if (l.includes("cc by-sa")) return 8;
  if (l.includes("cc by-nc")) return 0; // no commercial use
  if (l === "unknown") return 0;
  return 5;
}

function isCommerciallyUsable(license) {
  return licenseScore(license) >= 8;
}

// ─── Image quality scoring ────────────────────────────────────────────────────

function qualityScore(file) {
  const megapixels = (file.width * file.height) / 1_000_000;
  const pixelScore = Math.min(megapixels / 10, 1) * 50; // up to 50 pts for 10MP+
  const licSc = licenseScore(file.license) * 3; // up to 30 pts
  const descBonus = file.desc.length > 20 ? 10 : 0;
  return Math.round(pixelScore + licSc + descBonus);
}

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "BolGuessr/1.0 (https://bolguessr.com; contact@bolguessr.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

// ─── Interactive prompt ───────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// ─── Main search flow ─────────────────────────────────────────────────────────

async function hunt(query, opts = {}) {
  console.log(`\n🔍  Searching Wikimedia Commons: "${query}"\n`);

  const names = await searchWikimedia(query, 30);
  if (names.length === 0) {
    console.log("  ❌  No results found.");
    return [];
  }

  // Fetch info in batches of 10 (API limit per request)
  const batches = [];
  for (let i = 0; i < names.length; i += 10) batches.push(names.slice(i, i + 10));
  const allInfo = (await Promise.all(batches.map(getFileInfo))).flat();

  // Filter to commercially usable and reasonably sized
  const usable = allInfo
    .filter((f) => isCommerciallyUsable(f.license) && f.width >= 800)
    .sort((a, b) => qualityScore(b) - qualityScore(a));

  if (usable.length === 0) {
    console.log("  ⚠️  Found results but none are commercially usable / large enough.");
    // Show what was blocked
    allInfo.slice(0, 5).forEach((f) => {
      console.log(`     ${f.filename.slice(0, 60)} — ${f.license} — ${f.width}×${f.height}`);
    });
    return [];
  }

  console.log(`  Found ${usable.length} commercially usable images (of ${allInfo.length} total)\n`);

  usable.slice(0, 10).forEach((f, i) => {
    const mp = ((f.width * f.height) / 1_000_000).toFixed(1);
    const score = qualityScore(f);
    console.log(`  [${i + 1}] ${f.filename.slice(0, 65)}`);
    console.log(`      ${f.width}×${f.height} (${mp}MP) · ${f.license} · ${f.author.slice(0, 40)}`);
    if (f.desc) console.log(`      "${f.desc.slice(0, 100)}"`);
    console.log(`      🔗 ${f.url}`);
    console.log();
  });

  if (!opts.download) {
    console.log(`  Run with --download to interactively save to puzzles directory.\n`);
    return usable;
  }

  // Interactive download
  const pick = await prompt("  Enter number to download (or q to skip): ");
  if (pick === "q" || pick === "") return usable;

  const idx = parseInt(pick, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= usable.length) {
    console.log("  Invalid choice.");
    return usable;
  }

  const chosen = usable[idx];
  const previewDir = "/tmp/hunt-preview";
  const ext = chosen.url.split(".").pop().split("?")[0].toLowerCase();
  const tmpPath = join(previewDir, `preview.${ext}`);
  console.log(`\n  ⬇️  Downloading to ${tmpPath}…`);
  const bytes = await downloadFile(chosen.url, tmpPath);
  console.log(`  ✅  ${bytes} bytes saved.\n`);
  console.log(`  Open to preview: open "${tmpPath}"\n`);

  const save = await prompt("  Save to puzzles? Enter puzzle date YYYY-MM-DD (or q to skip): ");
  if (save === "q" || !save.match(/^\d{4}-\d{2}-\d{2}$/)) return usable;

  const dest = join(PUZZLES_DIR, `${save}.${ext}`);
  if (existsSync(dest)) {
    const overwrite = await prompt(`  ${dest} already exists. Overwrite? (y/n): `);
    if (overwrite !== "y") return usable;
  }

  const finalBytes = await downloadFile(chosen.url, dest);
  console.log(`\n  ✅  Saved ${finalBytes} bytes to ${dest}`);
  console.log(`\n  📋  Attribution to add to puzzle:`);
  console.log(`      imageAttribution: "${chosen.author}",`);
  console.log(`      imageLicense: "${chosen.license}",`);
  console.log(`      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:${encodeURIComponent(chosen.filename)}",`);

  return usable;
}

// ─── Batch mode ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runBatch() {
  console.log(`\n🏆  BolGuessr — Batch Wikimedia Image Hunt`);
  console.log(`    Checking ${KNOWN_MATCHES.length} known matches with good CC coverage\n`);
  console.log("─".repeat(70));

  const results = [];
  for (const m of KNOWN_MATCHES) {
    const usable = await hunt(m.query, { download: false });
    await sleep(3000); // respect Wikimedia rate limits (~20 req/min)
    results.push({
      ...m,
      imageCount: usable.length,
      best: usable[0] || null,
    });
  }

  console.log("\n\n📊  SUMMARY\n" + "─".repeat(70));
  for (const r of results) {
    const best = r.best;
    if (!best) {
      console.log(`  ❌  ${r.match} — no usable images found`);
      continue;
    }
    const mp = ((best.width * best.height) / 1_000_000).toFixed(1);
    console.log(`  ✅  ${r.match} (${r.date})`);
    console.log(`      ${r.imageCount} images · best: ${best.width}×${best.height} (${mp}MP) · ${best.license}`);
    console.log(`      ${best.url}`);
  }
}

// ─── Single file preview ──────────────────────────────────────────────────────

async function previewFile(wikimediaUrl) {
  // Accept either a commons URL or a filename
  let filename = wikimediaUrl;
  if (wikimediaUrl.startsWith("http")) {
    filename = decodeURIComponent(wikimediaUrl.split("/").pop());
  }
  const [info] = await getFileInfo([filename]);
  if (!info) { console.log("Not found"); return; }
  console.log(JSON.stringify(info, null, 2));
  const tmpPath = `/tmp/hunt-preview/preview.jpg`;
  await downloadFile(info.url, tmpPath);
  execSync(`open "${tmpPath}"`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args[0] === "--batch") {
  await runBatch();
} else if (args[0] === "--preview") {
  await previewFile(args[1]);
} else if (args.length === 0) {
  console.log(`Usage:
  node scripts/hunt-images.mjs "match description"           Search & list
  node scripts/hunt-images.mjs "match description" --download  Interactive save
  node scripts/hunt-images.mjs --batch                         All known matches
  node scripts/hunt-images.mjs --preview <wikimedia-url>       Preview one file
`);
} else {
  const query = args.filter((a) => !a.startsWith("--")).join(" ");
  const download = args.includes("--download");
  await hunt(query, { download });
}
