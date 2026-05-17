#!/usr/bin/env node
/**
 * BolGuessr image finder
 *
 * Searches two sources for commercially-usable football images:
 *   1. Wikimedia Commons — best for specific players/matches/stadiums
 *   2. Openverse        — broader search across Flickr + many others
 *
 * Usage:
 *   node scripts/find-image.mjs "search terms" [YYYY-MM-DD]
 *
 * Examples:
 *   node scripts/find-image.mjs "jack grealish aston villa" 2026-05-10
 *   node scripts/find-image.mjs "stamford bridge stadium" 2026-05-12
 *   node scripts/find-image.mjs "robin van persie header" 2026-05-18
 *   node scripts/find-image.mjs "azteca stadium mexico"
 *
 * What happens:
 *   - Results from both sources are merged and displayed
 *   - Non-commercial licenses (BY-NC etc.) are flagged red — DO NOT USE with ads
 *   - Pick a number → image downloaded to public/images/puzzles/YYYY-MM-DD.ext
 *     (or just printed if no date given, for manual save)
 *   - Attribution string printed — paste into puzzles.ts
 *
 * Hotlinking option:
 *   If you'd rather hotlink than download, note the URL from the results.
 *   Wikimedia URLs are stable (content-addressed). Flickr URLs can break.
 *   Either way you must show attribution — see imageAttribution field in puzzles.ts.
 *
 * License guide:
 *   CC0 / PD     = public domain, no restrictions  ✅
 *   CC BY        = attribution required             ✅ commercial ok
 *   CC BY-SA     = attribution + share-alike        ✅ commercial ok
 *   CC BY-NC     = NON-COMMERCIAL ONLY              ❌ don't use with ads
 *   CC BY-NC-SA  = NON-COMMERCIAL ONLY              ❌ don't use with ads
 *   CC BY-ND     = no derivatives                   ⚠ technically ok but check
 */

import https from "node:https";
import http  from "node:http";
import fs    from "node:fs";
import path  from "node:path";
import readline from "node:readline";

const OUTPUT_DIR = path.resolve("public/images/puzzles");
const [,, query, puzzleDate] = process.argv;

if (!query) {
  console.error("\nUsage: node scripts/find-image.mjs \"search terms\" [YYYY-MM-DD]\n");
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "BolGuessr/1.0 (bolguessr.com)" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("JSON parse failed: " + data.slice(0, 100))); }
      });
    }).on("error", reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    mod.get(url, { headers: { "User-Agent": "BolGuessr/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

function extFrom(url) {
  const m = url.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif|svg)$/i);
  return m ? m[0].toLowerCase().replace(".jpeg", ".jpg") : ".jpg";
}

// ── License logic ─────────────────────────────────────────────────────────────

const COMMERCIAL_SAFE = ["cc0", "pdm", "public domain", "by", "by-sa", "by-nd"];
const NON_COMMERCIAL  = ["by-nc", "by-nc-sa", "by-nc-nd"];

function licenseStatus(raw = "") {
  const l = raw.toLowerCase().replace(/\s+/g, "-").replace("cc-", "").replace("cc ", "");
  if (NON_COMMERCIAL.some(s => l.includes(s))) return "NO";   // not safe
  if (COMMERCIAL_SAFE.some(s => l.includes(s))) return "OK";
  return "UNKNOWN";
}

function licenseTag(raw = "") {
  const status = licenseStatus(raw);
  const label = (raw || "UNKNOWN").toUpperCase();
  if (status === "OK")      return `\x1b[32m${label}\x1b[0m`;
  if (status === "NO")      return `\x1b[31m${label} ⚠ NON-COMMERCIAL\x1b[0m`;
  return `\x1b[33m${label} ?\x1b[0m`;
}

// ── Wikimedia Commons search ──────────────────────────────────────────────────

async function searchWikimedia(query, limit = 8) {
  const q = encodeURIComponent(query);
  // Step 1: search for matching file titles
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${q}&srnamespace=6&srlimit=${limit}&format=json`;
  const searchData = await get(searchUrl);
  const titles = (searchData?.query?.search ?? []).map(r => r.title);
  if (!titles.length) return [];

  // Step 2: get image info + license metadata for each title
  const titlesParam = encodeURIComponent(titles.join("|"));
  const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url|extmetadata|size&format=json`;
  const infoData = await get(infoUrl);
  const pages = infoData?.query?.pages ?? {};

  return Object.values(pages)
    .filter(p => p.imageinfo)
    .map(p => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata ?? {};
      const artist = (meta.Artist?.value ?? "").replace(/<[^>]*>/g, "").trim();
      const license = meta.LicenseShortName?.value ?? meta.License?.value ?? "";
      const descUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`;
      return {
        source:      "Wikimedia Commons",
        title:       p.title.replace(/^File:/, "").replace(/_/g, " ").replace(/\.[a-z]+$/i, ""),
        url:         info.url,
        landingUrl:  descUrl,
        creator:     artist || "unknown",
        license,
        width:       info.width,
        height:      info.height,
        attribution: meta.Attribution?.value?.replace(/<[^>]*>/g, "").trim()
          || `"${p.title.replace(/^File:/, "")}" from Wikimedia Commons, licensed ${license}. ${descUrl}`,
      };
    });
}

// ── Openverse search ──────────────────────────────────────────────────────────

async function searchOpenverse(query, limit = 8) {
  const q = encodeURIComponent(query);
  const url = `https://api.openverse.org/v1/images/?q=${q}&license_type=commercial&page_size=${limit}&mature=false`;
  const data = await get(url);
  return (data?.results ?? []).map(r => ({
    source:      "Openverse / " + (r.provider ?? "unknown"),
    title:       r.title ?? "(no title)",
    url:         r.url,
    landingUrl:  r.foreign_landing_url,
    creator:     r.creator ?? "unknown",
    license:     r.license ? `CC ${r.license.toUpperCase()} ${r.license_version ?? ""}`.trim() : "",
    width:       r.width,
    height:      r.height,
    attribution: r.attribution,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍  Searching for: "${query}"\n`);

  const [wikiResults, openResults] = await Promise.allSettled([
    searchWikimedia(query),
    searchOpenverse(query),
  ]);

  const all = [
    ...(wikiResults.status === "fulfilled" ? wikiResults.value : []),
    ...(openResults.status === "fulfilled" ? openResults.value : []),
  ];

  if (!all.length) {
    console.log("No results found. Try broader terms:\n");
    console.log('  • Stadium name only: "stamford bridge"');
    console.log('  • Player name only: "robin van persie"');
    console.log('  • City + year: "mexico city 1986 football"\n');
    return;
  }

  console.log(`Found ${all.length} results:\n`);
  all.forEach((r, i) => {
    const dims = r.width && r.height ? `${r.width}×${r.height}` : "";
    console.log(`  ${String(i + 1).padStart(2)}. [${licenseTag(r.license)}] — ${r.source}`);
    console.log(`      ${r.title.slice(0, 70)}`);
    console.log(`      by ${r.creator}  ${dims}`);
    console.log(`      ${r.landingUrl}`);
    console.log();
  });

  const choice = await prompt('Pick a number to download (Enter to skip, "h" for hotlink info): ');

  if (!choice) { console.log("\nNo image selected.\n"); return; }

  if (choice === "h") {
    console.log("\n── Hotlinking ──────────────────────────────────────────────────────────────");
    console.log("You can hotlink any CC-licensed image instead of downloading.");
    console.log("Wikimedia URLs are stable long-term. Flickr URLs can break.");
    console.log("Put the URL in imageFile in puzzles.ts, OR download and self-host.");
    console.log("Either way: show attribution visibly near the image.\n");
    return;
  }

  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= all.length) { console.error("Invalid.\n"); return; }

  const img = all[idx];
  const status = licenseStatus(img.license);

  if (status === "NO") {
    console.log(`\n⚠  This image is ${img.license} — non-commercial only.`);
    console.log("   You cannot use it on an ad-supported site without a separate license.\n");
    const ok = await prompt("Download anyway for testing only? (y/N): ");
    if (ok.toLowerCase() !== "y") return;
  }

  let destPath;
  if (puzzleDate) {
    destPath = path.join(OUTPUT_DIR, `${puzzleDate}${extFrom(img.url)}`);
  } else {
    const safe = img.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50);
    destPath = path.join(OUTPUT_DIR, `${safe}${extFrom(img.url)}`);
  }

  console.log(`\n⬇  Downloading → ${destPath}\n`);
  try {
    await download(img.url, destPath);
    console.log("✅  Saved!\n");
  } catch (err) {
    console.error(`   Download failed: ${err.message}`);
    console.log(`   Manual URL: ${img.url}\n`);
  }

  // Attribution output
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋  Paste into puzzles.ts:\n");
  console.log(`    imageAttribution: ${JSON.stringify(img.attribution)},`);
  console.log(`    imageLicense:     ${JSON.stringify(img.license)},`);
  console.log(`    imageSourceUrl:   ${JSON.stringify(img.landingUrl)},`);
  console.log("\n    Also add to public/images/puzzles/ if not already downloaded.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
