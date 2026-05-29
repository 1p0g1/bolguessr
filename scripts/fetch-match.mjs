#!/usr/bin/env node
/**
 * BolGuessr match data fetcher
 *
 * Modes:
 *   node scripts/fetch-match.mjs "Liverpool West Ham 2024 Premier League"
 *   node scripts/fetch-match.mjs --url "https://www.uefa.com/.../match/2044857--..."
 *   node scripts/fetch-match.mjs --puzzle 2026-05-23
 *   node scripts/fetch-match.mjs --fill-all
 *   node scripts/fetch-match.mjs --images "Liverpool Salah Man City 2018"
 *
 * Set FOOTBALL_DATA_TOKEN in .env.local for full goal-scorer data (free at football-data.org)
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

// ── football-data.org ─────────────────────────────────────────────────────────
// Competition IDs: PL=2021, UCL=2001, EL=2146, WC=2000, EC=2018
const FD_COMP_MAP = {
  "premier league": 2021,
  "champions league": 2001,
  "ucl": 2001,
  "europa league": 2146,
  "el": 2146,
  "world cup": 2000,
  "euros": 2018,
  "championship": 2016,
  "serie a": 2019,
  "bundesliga": 2002,
  "la liga": 2014,
  "ligue 1": 2015,
};

async function fdMatchesByDate({ dateFrom, dateTo, competitions }) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;

  const ids = competitions?.length
    ? competitions.map((c) => FD_COMP_MAP[c.toLowerCase()] ?? c).filter(Boolean).join(",")
    : Object.values(FD_COMP_MAP).join(",");

  const url = new URL("https://api.football-data.org/v4/matches");
  url.searchParams.set("dateFrom", dateFrom);
  url.searchParams.set("dateTo", dateTo);
  if (ids) url.searchParams.set("competitions", ids);

  const res = await fetch(url.toString(), {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) {
    console.error(`  football-data.org: HTTP ${res.status}`);
    return null;
  }
  return (await res.json()).matches ?? [];
}

async function fdMatchById(matchId) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) return null;
  return res.json();
}

function fdMatchToPuzzle(m) {
  const scorers = (m.goals ?? []).map((g) => ({
    player: g.scorer?.name ?? "Unknown",
    minute: g.minute,
    team: g.team?.id === m.homeTeam?.id ? "home" : "away",
    ...(g.type === "OWN_GOAL" ? { ownGoal: true } : {}),
  }));
  return {
    date: m.utcDate?.slice(0, 10),
    competition: m.competition?.name,
    homeTeam: m.homeTeam?.name,
    awayTeam: m.awayTeam?.name,
    score: {
      home: m.score?.fullTime?.home ?? m.score?.fullTime?.homeTeam,
      away: m.score?.fullTime?.away ?? m.score?.fullTime?.awayTeam,
    },
    stadium: m.venue ?? null,
    goalScorers: scorers,
    _source: "football-data.org",
    _matchId: m.id,
  };
}

// ── TheSportsDB ───────────────────────────────────────────────────────────────
async function sdbSearch(query) {
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${q}`,
  );
  const data = await res.json();
  return data.event ?? [];
}

async function sdbLookup(eventId) {
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`,
  );
  const data = await res.json();
  return data.event?.[0] ?? null;
}

async function sdbByTeamAndSeason(teamId, season) {
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/eventsteam.php?id=${teamId}&s=${season}`,
  );
  const data = await res.json();
  return data.events ?? [];
}

async function sdbTeamId(teamName) {
  const res = await fetch(
    `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
  );
  const data = await res.json();
  return data.teams?.[0]?.idTeam ?? null;
}

function sdbEventToPuzzle(e) {
  return {
    date: e.dateEvent,
    competition: e.strLeague,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    score: {
      home: e.intHomeScore != null ? Number(e.intHomeScore) : null,
      away: e.intAwayScore != null ? Number(e.intAwayScore) : null,
    },
    stadium: e.strVenue ?? null,
    goalScorers: [], // TheSportsDB v1 doesn't include goal scorers
    _source: "thesportsdb",
    _eventId: e.idEvent,
    _note: "⚠ TheSportsDB doesn't include goal scorers — set FOOTBALL_DATA_TOKEN for full data",
  };
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────
async function wikiSearch(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=8`;
  const res = await fetch(url);
  const data = await res.json();
  return data.query?.search ?? [];
}

async function wikiArticle(title) {
  const res = await fetch(
    `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    {
      headers: {
        "User-Agent": "BolGuessr-research/1.0 (football match data research tool)",
        Accept: "text/html",
      },
    },
  );
  if (!res.ok) return null;
  return res.text();
}

// ── URL scraper ───────────────────────────────────────────────────────────────
async function scrapeMatchUrl(url) {
  console.log(`  Fetching ${url}...`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
  });

  if (!res.ok) {
    console.error(`  HTTP ${res.status} from ${new URL(url).hostname}`);
    return null;
  }

  const html = await res.text();

  // 1. JSON-LD structured data (sports sites often use SportsEvent schema)
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "SportsEvent" || item["@type"] === "Event") {
          return { source: "json-ld", data: item };
        }
      }
    } catch {}
  }

  // 2. Next.js __NEXT_DATA__ (UEFA, PL site, etc.)
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      return { source: "__NEXT_DATA__", data };
    } catch {}
  }

  // 3. UEFA-specific: try the hidden JSON API using the match ID from the URL
  const uefaMatchId = url.match(/\/match\/(\d+)[-–]/)?.[1];
  if (uefaMatchId) {
    console.log(`  Detected UEFA match ID: ${uefaMatchId}, trying UEFA API...`);
    const uefaRes = await fetch(
      `https://match.uefa.com/v5/matches/${uefaMatchId}?language=EN`,
      {
        headers: {
          Origin: "https://www.uefa.com",
          Referer: url,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (uefaRes.ok) {
      const uefaData = await uefaRes.json();
      return { source: "uefa-api", data: uefaData };
    }
    console.log(`  UEFA API returned ${uefaRes.status}`);
  }

  // 4. PL website: check for match data in inline scripts
  const plDataMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (plDataMatch) {
    try {
      return { source: "pl-preloaded-state", data: JSON.parse(plDataMatch[1]) };
    } catch {}
  }

  return { source: "html-only", preview: html.slice(0, 2000) };
}

function parseUefaApiMatch(data) {
  const m = data.match ?? data;
  const homeId = String(m.homeTeam?.id);
  const scorers = (m.playerEvents?.scorers ?? []).map((s) => ({
    player: s.player?.internationalName ?? s.player?.translations?.name?.EN,
    minute: s.time?.minute ?? s.matchMinute,
    team: String(s.teamId) === homeId ? "home" : "away",
    ...(s.goalType === "OWN_GOAL" ? { ownGoal: true } : {}),
  }));
  const competition = m.competition?.translations?.name?.EN ?? m.competition?.metaData?.name;
  const round = m.round?.translations?.name?.EN ?? m.round?.metaData?.name;
  const competitionFull = round ? `${competition} ${round}` : competition;
  return {
    date: m.kickOffTime?.date ?? m.kickOffTime?.dateTime?.slice(0, 10),
    competition: competitionFull,
    homeTeam: m.homeTeam?.translations?.displayOfficialName?.EN ?? m.homeTeam?.internationalName,
    awayTeam: m.awayTeam?.translations?.displayOfficialName?.EN ?? m.awayTeam?.internationalName,
    score: {
      home: m.score?.total?.home ?? m.score?.regular?.home,
      away: m.score?.total?.away ?? m.score?.regular?.away,
    },
    stadium: m.stadium?.translations?.sponsorName?.EN ?? m.stadium?.translations?.name?.EN,
    stadiumLat: m.stadium?.geolocation?.latitude,
    stadiumLng: m.stadium?.geolocation?.longitude,
    goalScorers: scorers,
    _source: "uefa-api",
  };
}

// ── Image search URLs ─────────────────────────────────────────────────────────
function imageSearchUrls(query) {
  const q = encodeURIComponent(query);
  const qPlus = query.replace(/\s+/g, "+");
  return {
    "Wikimedia Commons (free)":
      `https://commons.wikimedia.org/w/index.php?search=${q}&title=Special:MediaSearch&type=image`,
    "Getty Images (licensed)":
      `https://www.gettyimages.com/search/2/image?phrase=${q}&sort=best&mediatype=photography`,
    "Alamy (licensed)":
      `https://www.alamy.com/search/imageresults.aspx?qt=${q}&imgt=0&sortby=relevant`,
    "PA Images (licensed)":
      `https://www.paimages.co.uk/results/#/?query=${qPlus}`,
    "Reuters Connect (licensed)":
      `https://www.reutersconnect.com/all?token=&searchQuery=${q}&mediaType=image`,
    "Imago (licensed)":
      `https://www.imago-images.de/st/0${q}`,
  };
}

async function wikiImageSearch(query) {
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=8`,
  );
  const data = await res.json();
  return (data.query?.search ?? []).map((r) => ({
    title: r.title,
    url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    snippet: r.snippet?.replace(/<[^>]+>/g, ""),
  }));
}

// ── Pretty output ─────────────────────────────────────────────────────────────
function printMatchCard(m) {
  const hr = "─".repeat(60);
  console.log(`\n${hr}`);
  console.log(`  ${m.homeTeam ?? "?"} ${m.score?.home ?? "?"} – ${m.score?.away ?? "?"} ${m.awayTeam ?? "?"}`);
  console.log(`  ${m.date ?? "?"} | ${m.competition ?? "?"}`);
  if (m.stadium) console.log(`  📍 ${m.stadium}`);
  if (m._source) console.log(`  source: ${m._source}`);
  if (m._note) console.log(`  ⚠ ${m._note}`);
  if (m.goalScorers?.length) {
    console.log(`\n  Goal scorers:`);
    for (const g of m.goalScorers) {
      console.log(
        `    ${g.minute ?? "?"}' ${g.player}${g.ownGoal ? " (OG)" : ""} [${g.team}]`,
      );
    }
  }
  console.log(hr);
}

function printPuzzleSnippet(m, puzzleDate) {
  const scorers = (m.goalScorers ?? [])
    .map(
      (g) =>
        `        { player: "${g.player}", minute: ${g.minute ?? 0}, team: "${g.team}"${g.ownGoal ? ", ownGoal: true" : ""} },`,
    )
    .join("\n");

  console.log(`\n// ── Paste into puzzles.ts ───────────────────────────────`);
  console.log(`  {
    puzzleDate: "${puzzleDate ?? "YYYY-MM-DD"}",
    imageFile: "${puzzleDate ?? "YYYY-MM-DD"}.jpg",
    event: "TODO — describe the iconic moment",
    difficulty: "medium",
    sourceUrl: "",
    match: {
      date: "${m.date ?? "YYYY-MM-DD"}",
      competition: "${m.competition ?? "TODO"}",
      stadium: "${m.stadium ?? "TODO"}",
      stadiumLat: ${m.stadiumLat ?? "TODO"},
      stadiumLng: ${m.stadiumLng ?? "TODO"},
      location: "TODO",
      homeTeam: "${m.homeTeam ?? "TODO"}",
      awayTeam: "${m.awayTeam ?? "TODO"}",
      score: { home: ${m.score?.home ?? 0}, away: ${m.score?.away ?? 0} },
      goalScorers: [
${scorers}
      ],
    },
  },`);
}

// ── Read stubs from puzzles.ts ────────────────────────────────────────────────
function readPuzzleStubs() {
  const src = readFileSync(resolve(ROOT, "src/data/puzzles.ts"), "utf8");
  const stubs = [];
  // Find puzzleDates with TODO fields
  const dateMatches = [...src.matchAll(/puzzleDate:\s*"(\d{4}-\d{2}-\d{2})"/g)];
  for (const m of dateMatches) {
    const date = m[1];
    const pos = m.index;
    const slice = src.slice(pos, pos + 1200);
    const hasTodo = slice.includes("TODO") || slice.includes("1900-01-01");
    if (!hasTodo) continue;

    const homeTeam = slice.match(/homeTeam:\s*"([^"]+)"/)?.[1];
    const awayTeam = slice.match(/awayTeam:\s*"([^"]+)"/)?.[1];
    const competition = slice.match(/competition:\s*"([^"]+)"/)?.[1];
    const matchDate = slice.match(/date:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
    const sourceUrl = slice.match(/sourceUrl:\s*"([^"]*)"/)?.[1];

    stubs.push({ puzzleDate: date, homeTeam, awayTeam, competition, matchDate, sourceUrl });
  }
  return stubs;
}

// ── Search orchestrator ───────────────────────────────────────────────────────
async function findMatch({ query, dateFrom, dateTo, homeTeam, awayTeam, competitions }) {
  const results = [];

  // 1. football-data.org (best: includes goal scorers)
  if (process.env.FOOTBALL_DATA_TOKEN && (dateFrom || dateTo)) {
    console.log("  Trying football-data.org...");
    const matches = await fdMatchesByDate({
      dateFrom: dateFrom ?? dateTo,
      dateTo: dateTo ?? dateFrom,
      competitions: competitions ?? [],
    });
    if (matches?.length) {
      const filtered = matches.filter((m) => {
        const hn = m.homeTeam?.name?.toLowerCase() ?? "";
        const an = m.awayTeam?.name?.toLowerCase() ?? "";
        if (homeTeam && !hn.includes(homeTeam.toLowerCase()) && !an.includes(homeTeam.toLowerCase())) return false;
        if (awayTeam && !an.includes(awayTeam.toLowerCase()) && !hn.includes(awayTeam.toLowerCase())) return false;
        return true;
      });
      results.push(...filtered.map(fdMatchToPuzzle));
    }
  } else if (!process.env.FOOTBALL_DATA_TOKEN) {
    console.log("  ⚠ FOOTBALL_DATA_TOKEN not set — skipping football-data.org (set it in .env.local for goal scorer data)");
  }

  // 2. TheSportsDB (no key needed, basic data)
  if (results.length === 0 && (homeTeam || query)) {
    const sdbQuery = homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : (query ?? homeTeam);
    console.log(`  Trying TheSportsDB: "${sdbQuery}"...`);
    const events = await sdbSearch(sdbQuery);
    if (events.length) {
      // Filter by approximate date/season if provided
      const filtered = events.filter((e) => {
        if (!dateFrom && !dateTo) return true;
        const d = e.dateEvent;
        if (dateFrom && d < dateFrom.slice(0, 7)) return false;
        if (dateTo && d > dateTo.slice(0, 7)) return false;
        return true;
      });
      results.push(...filtered.slice(0, 5).map(sdbEventToPuzzle));
    }
  }

  // 3. Wikipedia search as reference
  const wikiQ = query ?? [homeTeam, awayTeam, dateFrom?.slice(0, 4)].filter(Boolean).join(" ");
  if (wikiQ) {
    console.log(`  Searching Wikipedia: "${wikiQ}"...`);
    const pages = await wikiSearch(wikiQ);
    if (pages.length) {
      console.log("\n  Wikipedia articles that may help:");
      for (const p of pages.slice(0, 4)) {
        console.log(`    • ${p.title}`);
        console.log(`      https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`);
      }
    }
  }

  return results;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
loadEnv();

const args = process.argv.slice(2);
const mode = args[0];

if (mode === "--url") {
  // ── URL mode: scrape a match page ─────────────────────────────────────────
  const url = args[1];
  if (!url) { console.error("Usage: --url <match-url>"); process.exit(1); }

  const result = await scrapeMatchUrl(url);
  if (!result) { console.error("Failed to fetch URL"); process.exit(1); }

  if (result.source === "uefa-api") {
    const m = parseUefaApiMatch(result.data);
    printMatchCard(m);
    printPuzzleSnippet(m, args[2]);
  } else if (result.source === "json-ld") {
    console.log("\nJSON-LD SportsEvent data found:");
    console.log(JSON.stringify(result.data, null, 2));
  } else if (result.source === "__NEXT_DATA__") {
    console.log("\n__NEXT_DATA__ found. Relevant keys:");
    const keys = Object.keys(result.data?.props?.pageProps ?? result.data);
    console.log(" ", keys.join(", "));
    console.log("\nFull dump:");
    console.log(JSON.stringify(result.data?.props?.pageProps ?? result.data, null, 2).slice(0, 4000));
  } else {
    console.log(`\nResult source: ${result.source}`);
    console.log(JSON.stringify(result, null, 2).slice(0, 3000));
  }

} else if (mode === "--images") {
  // ── Image mode: generate search URLs ──────────────────────────────────────
  const query = args.slice(1).join(" ");
  if (!query) { console.error("Usage: --images <search query>"); process.exit(1); }

  console.log(`\nImage search for: "${query}"\n`);

  // Wikimedia Commons direct API results
  const wikimediaHits = await wikiImageSearch(query);
  if (wikimediaHits.length) {
    console.log("Wikimedia Commons results (free/licensed):");
    for (const img of wikimediaHits) {
      console.log(`  • ${img.title}`);
      console.log(`    ${img.url}`);
    }
  } else {
    console.log("No Wikimedia Commons results found for this query.");
  }

  console.log("\nSearch links for licensed press photos:");
  const urls = imageSearchUrls(query);
  for (const [source, url] of Object.entries(urls)) {
    console.log(`  ${source}`);
    console.log(`    ${url}`);
  }

} else if (mode === "--puzzle") {
  // ── Puzzle mode: search for a specific puzzle date stub ───────────────────
  const puzzleDate = args[1];
  if (!puzzleDate) { console.error("Usage: --puzzle YYYY-MM-DD"); process.exit(1); }

  const stubs = readPuzzleStubs();
  const stub = stubs.find((s) => s.puzzleDate === puzzleDate);
  if (!stub) {
    console.log(`No incomplete stub found for ${puzzleDate}`);
    process.exit(0);
  }

  console.log(`\nSearching for puzzle ${puzzleDate}:`);
  console.log(`  Teams: ${stub.homeTeam} vs ${stub.awayTeam}`);
  console.log(`  Competition: ${stub.competition}`);
  console.log(`  Known date: ${stub.matchDate}`);
  if (stub.sourceUrl) console.log(`  Source URL: ${stub.sourceUrl}`);

  // If there's a source URL, try scraping it first
  if (stub.sourceUrl && stub.sourceUrl.startsWith("http")) {
    console.log("\nTrying to scrape source URL...");
    const scraped = await scrapeMatchUrl(stub.sourceUrl);
    if (scraped && scraped.source !== "html-only") {
      console.log(`  Got data via ${scraped.source}`);
    }
  }

  // Parse approximate date range
  const matchYear = stub.matchDate !== "1900-01-01" ? stub.matchDate?.slice(0, 4) : null;
  const dateFrom = matchYear ? `${matchYear}-01-01` : null;
  const dateTo = matchYear ? `${matchYear}-12-31` : null;

  const results = await findMatch({
    homeTeam: stub.homeTeam !== "TODO" ? stub.homeTeam : null,
    awayTeam: stub.awayTeam !== "TODO" ? stub.awayTeam : null,
    competitions: stub.competition !== "TODO" ? [stub.competition] : [],
    dateFrom,
    dateTo,
    query: [stub.homeTeam, stub.awayTeam, matchYear, stub.competition]
      .filter((v) => v && v !== "TODO")
      .join(" "),
  });

  if (results.length === 0) {
    console.log("\nNo matches found. Try:");
    console.log(`  node scripts/fetch-match.mjs "${stub.homeTeam} ${stub.awayTeam}"`);
    console.log(`  node scripts/fetch-match.mjs --url "${stub.sourceUrl}"`);
  } else {
    for (const m of results) {
      printMatchCard(m);
      printPuzzleSnippet(m, puzzleDate);
    }
  }

  // Image search
  const imgQuery = [stub.homeTeam, stub.awayTeam, matchYear].filter((v) => v && v !== "TODO").join(" ");
  if (imgQuery) {
    console.log(`\nImage search: "${imgQuery}"`);
    const urls = imageSearchUrls(imgQuery);
    for (const [source, url] of Object.entries(urls)) {
      console.log(`  ${source}: ${url}`);
    }
  }

} else if (mode === "--fill-all") {
  // ── Fill-all mode: list all stubs and what we can find ────────────────────
  const stubs = readPuzzleStubs();
  if (stubs.length === 0) {
    console.log("No incomplete puzzle stubs found.");
    process.exit(0);
  }

  console.log(`\nFound ${stubs.length} incomplete puzzle stubs:\n`);
  for (const s of stubs) {
    const teams = [s.homeTeam, s.awayTeam].filter((t) => t && t !== "TODO").join(" vs ");
    console.log(`  ${s.puzzleDate}  ${teams || "(unknown teams)"}  ${s.competition ?? ""}  ${s.matchDate !== "1900-01-01" ? s.matchDate : "(date unknown)"}`);
  }

  console.log("\nRun individual lookups with:");
  for (const s of stubs) {
    console.log(`  node scripts/fetch-match.mjs --puzzle ${s.puzzleDate}`);
  }

} else {
  // ── Text search mode ──────────────────────────────────────────────────────
  const query = args.join(" ");

  if (!query) {
    console.log(`
BolGuessr Match Data Fetcher

Usage:
  node scripts/fetch-match.mjs "Liverpool West Ham 2024 Premier League"
  node scripts/fetch-match.mjs --url "https://www.uefa.com/.../match/2044857--..."
  node scripts/fetch-match.mjs --puzzle 2026-05-23
  node scripts/fetch-match.mjs --fill-all
  node scripts/fetch-match.mjs --images "Mohamed Salah Liverpool 2018"

Set FOOTBALL_DATA_TOKEN in .env.local for goal scorer data:
  Register free at https://www.football-data.org/client/register
`);
    process.exit(0);
  }

  // Parse team names from "Team A vs Team B" or "Team A Team B"
  const vsMatch = query.match(/^(.+?)\s+(?:vs?\.?|v)\s+(.+?)(?:\s+\d{4}.*)?$/i);
  const homeTeam = vsMatch?.[1]?.trim();
  const awayTeam = vsMatch?.[2]?.trim();

  // Parse year
  const yearMatch = query.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch?.[0];

  // Parse competition keywords
  const knownComps = Object.keys(FD_COMP_MAP);
  const competition = knownComps.find((c) => query.toLowerCase().includes(c));

  console.log(`\nSearching: "${query}"`);
  if (homeTeam) console.log(`  Teams: ${homeTeam} vs ${awayTeam ?? "?"}`);
  if (year) console.log(`  Year: ${year}`);
  if (competition) console.log(`  Competition: ${competition}`);

  const results = await findMatch({
    query,
    homeTeam: homeTeam ?? null,
    awayTeam: awayTeam ?? null,
    competitions: competition ? [competition] : [],
    dateFrom: year ? `${year}-01-01` : null,
    dateTo: year ? `${year}-12-31` : null,
  });

  if (results.length === 0) {
    console.log("\nNo matches found.");
  } else {
    console.log(`\nFound ${results.length} match(es):\n`);
    for (const m of results.slice(0, 5)) {
      printMatchCard(m);
      printPuzzleSnippet(m);
    }
  }

  // Image search
  console.log("\n── Image Search ─────────────────────────────────────────");
  const urls = imageSearchUrls(query);
  for (const [source, url] of Object.entries(urls)) {
    console.log(`  ${source}`);
    console.log(`    ${url}`);
  }
}
