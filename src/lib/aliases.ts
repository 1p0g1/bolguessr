// Strip accents, punctuation, lowercase — the base normaliser
export function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // strip diacritics
    .replace(/[^a-z0-9]/g, "");
}

// ── Competition canonical patterns ────────────────────────────────
// Each entry: canonical form + substrings that identify it.
// Both the GUESS and the PUZZLE answer are passed through this —
// so "2014 FIFA World Cup Group Stage" → "fifaworldcup"
//     "World Cup"                      → "fifaworldcup"  ✓
const COMP_PATTERNS: { canonical: string; match: string[] }[] = [
  { canonical: "premierleague",          match: ["premierleague", "barclay", "barclays"] },
  { canonical: "uefachampionsleague",    match: ["championsleague", "champsleague", "uefacl"] },
  { canonical: "fifaworldcup",           match: ["worldcup", "fifawc"] },
  { canonical: "uefaeuropeanchampionship", match: ["europeanchampionship", "uefaeuro", "euros"] },
  { canonical: "eflchampionship",        match: ["eflchampionship"] },
  { canonical: "footballleaguecupfinal", match: ["leaguecup", "carabaocup", "carlingcup", "eflcup", "leaguecupfinal"] },
  { canonical: "facup",                  match: ["facup"] },
  { canonical: "championshipplayofffinal", match: ["playofffinal", "playoffsfinal", "championshipplayoff"] },
  { canonical: "ligue1",                 match: ["ligue1", "ligueun"] },
  { canonical: "laliga",                 match: ["laliga", "primeradivision"] },
  { canonical: "bundesliga",             match: ["bundesliga"] },
];

// Direct single-word shortcuts (checked before pattern scan)
const COMP_SHORTCUTS: Record<string, string> = {
  "prem": "premierleague", "pl": "premierleague", "epl": "premierleague",
  "premership": "premierleague", "bpl": "premierleague",
  "ucl": "uefachampionsleague", "cl": "uefachampionsleague",
  "worldcup": "fifaworldcup", "wc": "fifaworldcup", "fifawc": "fifaworldcup",
  "euros": "uefaeuropeanchampionship", "euro": "uefaeuropeanchampionship",
  "europeanchampionship": "uefaeuropeanchampionship",
  "championship": "eflchampionship",
  "leaguecup": "footballleaguecupfinal", "carabaocup": "footballleaguecupfinal",
  "carlingcup": "footballleaguecupfinal", "eflcup": "footballleaguecupfinal",
  "facup": "facup", "fac": "facup",
  "playoff": "championshipplayofffinal", "playoffs": "championshipplayofffinal",
  "playofffinal": "championshipplayofffinal",
  "ligue1": "ligue1", "ligueun": "ligue1",
};

export function normaliseCompetition(raw: string): string {
  if (!raw.trim()) return "";
  const n = norm(raw);
  // 1. Direct shortcut table
  if (COMP_SHORTCUTS[n]) return COMP_SHORTCUTS[n];
  // 2. Pattern contains-scan (handles "2014 FIFA World Cup Group Stage" etc.)
  for (const { canonical, match } of COMP_PATTERNS) {
    if (match.some((m) => n.includes(m))) return canonical;
  }
  return n;
}

// Use same function for puzzle answers — both sides normalise identically
export const normalisedPuzzleCompetition = normaliseCompetition;


// ── Scorer name matching ──────────────────────────────────────────
// Returns true if guessed name matches actual name (full or partial)
// "Van Persie" matches "Robin van Persie" via last-name suffix check
export function scorerNamesMatch(guessed: string, actual: string): boolean {
  const g = norm(guessed);
  const a = norm(actual);
  if (!g || g.length < 2) return false;
  if (g === a) return true;
  if (a.endsWith(g)) return true;           // last-name match: "vanpersie" ends "robinvanpersie"
  if (a.includes(g) && g.length >= 4) return true; // substring: "cisse" in "papiscisse"
  return false;
}


// ── Team aliases ──────────────────────────────────────────────────
const TEAM_ALIASES: Record<string, string> = {
  "manutd": "manchesterunited", "manchesterutd": "manchesterunited",
  "manu": "manchesterunited", "manunited": "manchesterunited",
  "manchesterunited": "manchesterunited", "reddevils": "manchesterunited",
  "mancity": "manchestercity", "manchestercity": "manchestercity",
  "cityzens": "manchestercity", "mcfc": "manchestercity",
  "spurs": "tottenhamhotspur", "tottenham": "tottenhamhotspur",
  "thfc": "tottenhamhotspur", "tottenhamhotspur": "tottenhamhotspur",
  "arsenal": "arsenal", "gooners": "arsenal", "gunners": "arsenal", "afc": "arsenal",
  "chelsea": "chelsea", "theblues": "chelsea", "cfc": "chelsea",
  "liverpool": "liverpool", "lfc": "liverpool", "thereds": "liverpool",
  "villa": "astonvilla", "astonvilla": "astonvilla", "avfc": "astonvilla",
  "birmingham": "birminghamcity", "birminghamcity": "birminghamcity",
  "blues": "birminghamcity", "bcfc": "birminghamcity",
  "newcastle": "newcastleunited", "newcastleunited": "newcastleunited",
  "newcastleutd": "newcastleunited", "nufc": "newcastleunited",
  "toon": "newcastleunited", "thetoon": "newcastleunited",
  "leeds": "leedsunited", "leedsunited": "leedsunited",
  "leedsutd": "leedsunited", "lufc": "leedsunited",
  "stoke": "stokecity", "stokecity": "stokecity", "thepotters": "stokecity",
  "sheffieldunited": "sheffieldunited", "sheffieldutd": "sheffieldunited",
  "sheffu": "sheffieldunited", "sufc": "sheffieldunited", "blades": "sheffieldunited",
  "derby": "derbycounty", "derbycounty": "derbycounty",
  "rams": "derbycounty", "dcfc": "derbycounty",
  "qpr": "queensparkrangers", "queensparkrangers": "queensparkrangers",
  "queenspark": "queensparkrangers",
  "england": "england", "threelions": "england",
  "argentina": "argentina", "albiceleste": "argentina",
  "spain": "spain", "larroja": "spain",
  "netherlands": "netherlands", "holland": "netherlands",
  "dutch": "netherlands", "oranje": "netherlands",
  "galatasaray": "galatasaray", "gala": "galatasaray",
};

export function normaliseTeam(raw: string): string {
  const n = norm(raw);
  return TEAM_ALIASES[n] ?? n;
}
