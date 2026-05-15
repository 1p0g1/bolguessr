// Normalise a string for comparison — strips accents, punctuation, lowercases
export function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip diacritics (é→e, ü→u, etc.)
    .replace(/[^a-z0-9]/g, "");
}

// ── Competition aliases ────────────────────────────────────────────
// Maps normalised guesses → normalised canonical answer
const COMP_ALIASES: Record<string, string> = {
  // Premier League
  "prem":                     "premierleague",
  "pl":                       "premierleague",
  "epl":                      "premierleague",
  "premierleague":            "premierleague",
  "barclayspremierleague":    "premierleague",
  "barclaysprem":             "premierleague",
  "barclayspremership":       "premierleague",
  "bpl":                      "premierleague",
  "premership":               "premierleague",

  // Champions League
  "ucl":                      "uefachampionsleague",
  "championsleague":          "uefachampionsleague",
  "champsleague":             "uefachampionsleague",
  "uefacl":                   "uefachampionsleague",
  "europeanup":               "uefachampionsleague",
  "cl":                       "uefachampionsleague",
  "uefachampionsleague":      "uefachampionsleague",
  "uefachampionleague":       "uefachampionsleague",

  // World Cup
  "worldcup":                 "fifaworldcup",
  "fifawc":                   "fifaworldcup",
  "wc":                       "fifaworldcup",
  "fifaworldcup":             "fifaworldcup",
  "worldcupquarterfinal":     "fifaworldcup",
  "worldcupgroupstage":       "fifaworldcup",

  // Euros
  "euros":                    "uefaeuropeanchampionship",
  "euro":                     "uefaeuropeanchampionship",
  "europeanchampionship":     "uefaeuropeanchampionship",
  "europeans":                "uefaeuropeanchampionship",
  "uefaeuros":                "uefaeuropeanchampionship",
  "uefaeuropeanchampionship": "uefaeuropeanchampionship",

  // EFL Championship
  "championship":             "eflchampionship",
  "thechampionship":          "eflchampionship",
  "eflchampionship":          "eflchampionship",
  "2ndtier":                  "eflchampionship",

  // League Cup
  "leaguecup":                "footballleaguecupfinal",
  "eflcup":                   "footballleaguecupfinal",
  "carlingcup":               "footballleaguecupfinal",
  "carabaocup":               "footballleaguecupfinal",
  "leaguecupfinal":           "footballleaguecupfinal",
  "footballleaguecupfinal":   "footballleaguecupfinal",
  "caraboocup":               "footballleaguecupfinal",

  // FA Cup
  "facup":                    "facup",
  "fac":                      "facup",

  // Play-offs
  "playofffinal":             "championshipplayofffinal",
  "playoff":                  "championshipplayofffinal",
  "playoffs":                 "championshipplayofffinal",
  "playoffsfinal":            "championshipplayofffinal",
  "championshipplayoff":      "championshipplayofffinal",
  "championshipplayofffinal": "championshipplayofffinal",

  // Ligue 1 (future-proofing)
  "ligue1":                   "ligue1",
  "ligueun":                  "ligue1",
  "ligue un":                 "ligue1",
  "french top flight":        "ligue1",
  "french league":            "ligue1",
};

export function normaliseCompetition(raw: string): string {
  const n = norm(raw);
  return COMP_ALIASES[n] ?? n;
}

export function normalisedPuzzleCompetition(competition: string): string {
  // Reduce the puzzle's competition string to the same canonical form
  const n = norm(competition);
  return COMP_ALIASES[n] ?? n;
}

// ── Team name aliases ──────────────────────────────────────────────
const TEAM_ALIASES: Record<string, string> = {
  // Manchester United
  "manutd":           "manchesterunited",
  "manchesterutd":    "manchesterunited",
  "manu":             "manchesterunited",
  "manunited":        "manchesterunited",
  "manchesterunited": "manchesterunited",
  "reddevils":        "manchesterunited",

  // Manchester City
  "mancity":          "manchestercity",
  "manchestercity":   "manchestercity",
  "cityzens":         "manchestercity",
  "mcfc":             "manchestercity",
  "cityofmanchesterstadium": "manchestercity",

  // Tottenham
  "spurs":            "tottenhamhotspur",
  "tottenham":        "tottenhamhotspur",
  "thfc":             "tottenhamhotspur",
  "tottenhamhotspur": "tottenhamhotspur",

  // Arsenal
  "arsenal":          "arsenal",
  "gooners":          "arsenal",
  "gunners":          "arsenal",
  "afc":              "arsenal",

  // Chelsea
  "chelsea":          "chelsea",
  "theblues":         "chelsea",
  "cfc":              "chelsea",

  // Liverpool
  "liverpool":        "liverpool",
  "lfc":              "liverpool",
  "thereds":          "liverpool",

  // Aston Villa
  "villa":            "astonvilla",
  "astonvilla":       "astonvilla",
  "avfc":             "astonvilla",

  // Birmingham City
  "birmingham":       "birminghamcity",
  "birminghamcity":   "birminghamcity",
  "blues":            "birminghamcity",
  "bcfc":             "birminghamcity",

  // Newcastle United
  "newcastle":        "newcastleunited",
  "newcastleunited":  "newcastleunited",
  "newcastleutd":     "newcastleunited",
  "nufc":             "newcastleunited",
  "toon":             "newcastleunited",
  "thetoon":          "newcastleunited",

  // Leeds United
  "leeds":            "leedsunited",
  "leedsunited":      "leedsunited",
  "leedsutd":         "leedsunited",
  "lufc":             "leedsunited",

  // Stoke City
  "stoke":            "stokecity",
  "stokecity":        "stokecity",
  "thepotters":       "stokecity",

  // Sheffield United
  "sheffieldunited":  "sheffieldunited",
  "sheffieldutd":     "sheffieldunited",
  "sheffu":           "sheffieldunited",
  "sufc":             "sheffieldunited",
  "blades":           "sheffieldunited",

  // Derby County
  "derby":            "derbycounty",
  "derbycounty":      "derbycounty",
  "rams":             "derbycounty",
  "dcfc":             "derbycounty",

  // Queens Park Rangers
  "qpr":              "queensparkrangers",
  "queensparkrangers":"queensparkrangers",
  "queenspark":       "queensparkrangers",

  // International
  "england":          "england",
  "threelions":       "england",
  "argentina":        "argentina",
  "albiceleste":      "argentina",
  "spain":            "spain",
  "larroja":          "spain",
  "netherlands":      "netherlands",
  "holland":          "netherlands",
  "dutch":            "netherlands",
  "oranje":           "netherlands",
  "galatasaray":      "galatasaray",
  "gala":             "galatasaray",
};

export function normaliseTeam(raw: string): string {
  const n = norm(raw);
  return TEAM_ALIASES[n] ?? n;
}
