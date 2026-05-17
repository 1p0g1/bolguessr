#!/usr/bin/env node
/**
 * BolGuessr image finder — searches Openverse for CC-licensed, commercially usable images.
 *
 * Usage:
 *   node scripts/find-image.mjs "van persie header spain 2014" 2026-05-18
 *   node scripts/find-image.mjs "grealish birmingham aston villa" 2026-05-10
 *
 * What it does:
 *   1. Queries Openverse API (searches Flickr, Wikimedia Commons, etc.)
 *   2. Filters to commercial-use licenses only (CC BY, CC BY-SA, CC0, PD)
 *   3. Displays results with license, dimensions, creator, URL
 *   4. Lets you pick one to download straight to public/images/puzzles/
 *   5. Prints the attribution string to paste into puzzles.ts
 *
 * License key:
 *   cc0      = Public Domain / no restrictions
 *   pdm      = Public Domain Mark
 *   by       = CC BY (attribution required)
 *   by-sa    = CC BY-SA (attribution + share-alike)
 *   by-nc    = ⚠ Non-commercial only — DO NOT USE WITH ADS
 *   by-nc-sa = ⚠ Non-commercial only — DO NOT USE WITH ADS
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

// ── Config ────────────────────────────────────────────────────────────────────

const OPENVERSE_API = "https://api.openverse.org/v1/images/";
const OUTPUT_DIR    = path.resolve("public/images/puzzles");
const PAGE_SIZE     = 12;

// Only include licenses safe for commercial use (ad-supported site)
const COMMERCIAL_SAFE = ["cc0", "pdm", "by", "by-sa"];

// ── CLI args ──────────────────────────────────────────────────────────────────

const [, , query, puzzleDate] = process.argv;

if (!query) {
  console.error("\nUsage: node scripts/find-image.mjs \"search terms\" [YYYY-MM-DD]\n");
  console.error("Example: node scripts/find-image.mjs \"van persie header spain 2014\" 2026-05-18\n");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "BolGuessr/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Failed to parse JSON: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { "User-Agent": "BolGuessr/1.0" } }, (res) => {
      // Follow redirects (Openverse thumbnails sometimes redirect)
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function licenseLabel(license) {
  const safe = COMMERCIAL_SAFE.includes(license?.toLowerCase());
  const tag = license?.toUpperCase() ?? "UNKNOWN";
  return safe ? `\x1b[32m${tag}\x1b[0m` : `\x1b[31m${tag} ⚠ non-commercial\x1b[0m`;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function extFromUrl(url) {
  const u = url.split("?")[0];
  const match = u.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i);
  return match ? match[0].toLowerCase() : ".jpg";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const encoded = encodeURIComponent(query);
  const apiUrl  = `${OPENVERSE_API}?q=${encoded}&license_type=commercial&page_size=${PAGE_SIZE}&mature=false`;

  console.log(`\n🔍  Searching Openverse for: "${query}"\n`);
  console.log(`    (Flickr + Wikimedia Commons + more — commercial-use licenses only)\n`);

  const data = await httpsGet(apiUrl);

  if (!data.results || data.results.length === 0) {
    console.log("No commercially-usable results found.\n");
    console.log("Tips:");
    console.log("  • Try broader search terms (e.g. 'stadium' instead of specific match)");
    console.log("  • Search for the stadium name instead of the event");
    console.log("  • Consider AI-generated illustrations for famous moments (see IMAGES.md)\n");
    process.exit(0);
  }

  console.log(`Found ${data.result_count} results (showing first ${data.results.length}):\n`);

  data.results.forEach((r, i) => {
    const license = licenseLabel(r.license);
    const dims    = r.width && r.height ? `${r.width}×${r.height}` : "dims unknown";
    const creator = r.creator ? `by ${r.creator}` : "";
    console.log(`  ${String(i + 1).padStart(2)}. [${license}] ${r.title?.slice(0, 55) ?? "(no title)"}`);
    console.log(`      ${creator}  ${dims}`);
    console.log(`      ${r.foreign_landing_url}`);
    console.log(`      Direct: ${r.url}`);
    console.log();
  });

  const choice = await prompt("Pick a number to download (or press Enter to skip): ");

  if (!choice) {
    console.log("\nNo image selected. Exiting.\n");
    return;
  }

  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= data.results.length) {
    console.error("Invalid selection.\n");
    process.exit(1);
  }

  const img = data.results[idx];

  // Determine output path
  let destPath;
  if (puzzleDate) {
    const ext = extFromUrl(img.url);
    destPath = path.join(OUTPUT_DIR, `${puzzleDate}${ext}`);
  } else {
    const safeName = (img.title ?? "image").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    destPath = path.join(OUTPUT_DIR, `${safeName}${extFromUrl(img.url)}`);
  }

  console.log(`\n⬇  Downloading to: ${destPath}\n`);

  try {
    await downloadFile(img.url, destPath);
    console.log("✅  Downloaded!\n");
  } catch (err) {
    console.error(`Download failed: ${err.message}`);
    console.log(`\nManual download URL: ${img.url}\n`);
  }

  // Print attribution
  const attribution = img.attribution ??
    `"${img.title}" by ${img.creator ?? "unknown"} is licensed under CC ${img.license?.toUpperCase() ?? "BY"} ${img.license_version ?? ""}. ${img.license_url ?? ""}`.trim();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋  Attribution string (paste into puzzles.ts):\n");
  console.log(`    imageAttribution: "${attribution}",`);
  console.log(`    imageLicense:     "${img.license?.toUpperCase()}",`);
  console.log(`    imageSourceUrl:   "${img.foreign_landing_url}",`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
