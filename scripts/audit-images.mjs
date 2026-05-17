#!/usr/bin/env node
/**
 * Audits image licensing status for all puzzles.
 * Run: node scripts/audit-images.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Parse puzzles.ts as text — crude but avoids TypeScript compilation
const raw = readFileSync(resolve("src/data/puzzles.ts"), "utf8");

// Extract puzzleDate, imageFile, imageLicense, imageAttribution via regex
const puzzleBlocks = [...raw.matchAll(/puzzleDate:\s*"([^"]+)"[^}]*?imageFile:\s*"([^"]+)"/gs)];

console.log("\n── BolGuessr Image Audit ──────────────────────────────────────────────────\n");
console.log(`${"DATE".padEnd(12)} ${"FILE".padEnd(22)} ${"IMAGE EXISTS?".padEnd(14)} LICENSE`);
console.log("─".repeat(80));

let issues = 0;

for (const match of puzzleBlocks) {
  const date      = match[1];
  const imageFile = match[2];

  // Check if image exists
  const imgPath   = resolve("public/images/puzzles", imageFile);
  const exists    = existsSync(imgPath);

  // Extract license for this puzzle (after the imageFile line)
  const blockStart = raw.indexOf(`puzzleDate: "${date}"`);
  const blockEnd   = raw.indexOf("}", blockStart + 1);
  const block      = raw.slice(blockStart, blockEnd + 200); // grab a bit extra

  const licenseMatch     = block.match(/imageLicense:\s*"([^"]+)"/);
  const attributionMatch = block.match(/imageAttribution:\s*"([^"]+)"/);

  const license     = licenseMatch?.[1] ?? null;
  const hasAttrib   = !!attributionMatch;

  const existsTag = exists  ? "\x1b[32m✅ yes\x1b[0m  " : "\x1b[31m❌ missing\x1b[0m";

  let licenseTag;
  if (!license) {
    licenseTag = "\x1b[33m⚠  UNKNOWN — needs review\x1b[0m";
    issues++;
  } else if (["CC BY-NC", "CC BY-NC-SA"].some(s => license.toUpperCase().includes(s))) {
    licenseTag = `\x1b[31m❌ ${license} (non-commercial — cannot use with ads)\x1b[0m`;
    issues++;
  } else {
    licenseTag = `\x1b[32m✅ ${license}${hasAttrib ? "" : " (attribution missing)"}\x1b[0m`;
    if (!hasAttrib) issues++;
  }

  console.log(`${date.padEnd(12)} ${imageFile.padEnd(22)} ${existsTag.padEnd(14)} ${licenseTag}`);
}

console.log("\n" + "─".repeat(80));

if (issues === 0) {
  console.log("\x1b[32m✅  All images licensed and accounted for.\x1b[0m\n");
} else {
  console.log(`\x1b[33m⚠  ${issues} image(s) need attention before monetising.\x1b[0m`);
  console.log("   Run: node scripts/find-image.mjs \"search terms\" YYYY-MM-DD\n");
}
