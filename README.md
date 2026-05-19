# BolGuessr

A daily football trivia game. One image. One famous moment. How much do you know?

Players see a still image from a famous match and must identify:
- The **year** it happened
- The **competition**
- The **stadium**
- The **home and away teams**
- The **final score**
- Optionally, the **goal scorers** (in order)

One puzzle per day. Score out of 100.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | Framer Motion |
| Fonts | Orbitron (LED display) · Share Tech Mono (body) |
| Hosting | Cloudflare Pages (planned) |
| Data | Static TypeScript file (`src/data/puzzles.ts`) |

---

## Scoring system

Total maximum: **100 points** (75 for a 0–0 match).

### Year — 15 pts max

| Accuracy | Points |
|---|---|
| Exact year | 15 |
| Within 1 year | 10 |
| Within 2–3 years | 5 |
| More than 3 years off | 0 |

### Teams — 20 pts max (10 each)

| Result | Points | Display |
|---|---|---|
| Correct team, correct side | 10 | 🟢 green |
| Both teams correct but **home/away swapped** | 5 each (10 total) | 🟡 amber |
| Wrong team | 0 | 🔴 red |

### Competition — 10 pts max

Binary right/wrong. Fuzzy matching handles abbreviations — see [Fuzzy matching](#fuzzy-matching-reference).

### Stadium — 15 pts max

Binary right/wrong. Fuzzy matching handles short names, subsets ("Wembley" = "Wembley Stadium"), and renamed grounds ("Etihad" = "City of Manchester Stadium").

### Final score — 15 pts max

| Result | Points | Display |
|---|---|---|
| Both sides correct | 15 | 🟢 green |
| One side correct | 5 | — |
| Wrong | 0 | 🔴 red |

When teams are swapped, scores are compared against the correct team — so Birmingham=2, Arsenal=1 with swapped teams gets **amber** score cells and full score points.

### Goal scorers — 25 pts max

**Positional matching**: guess #1 is checked against scorer #1 (in order of goals scored), guess #2 against scorer #2, etc. Rewards knowing who scored AND in what sequence.

Points: `(correct positional guesses / total goals) × 25`

Partial name matching: "Van Persie" matches "Robin van Persie" · "Cisse" matches "Papiss Cissé"

When teams are swapped, scorer columns are also swapped automatically.

---

## Adding puzzles

Puzzles live in `src/data/puzzles.ts`:

```typescript
{
  puzzleDate: "2026-05-18",       // date THIS puzzle appears (NOT the match date)
  imageFile: "2026-05-18.jpg",    // file in public/images/puzzles/
  event: "Van Persie flying header — Netherlands dismantle World Cup holders Spain 5–1",
  difficulty: "easy",
  sourceUrl: "https://...",

  // Image licensing — required before monetising
  imageAttribution: '"Arena Fonte Nova" by Elvis Boaventura, CC BY 3.0.',
  imageLicense:     "CC BY",
  imageSourceUrl:   "https://commons.wikimedia.org/wiki/...",

  match: {
    date: "2014-06-13",           // real match date (year scoring only)
    competition: "2014 FIFA World Cup Group Stage",
    stadium: "Arena Fonte Nova",
    location: "Salvador, Brazil",
    homeTeam: "Spain",
    awayTeam: "Netherlands",
    score: { home: 1, away: 5 },
    goalScorers: [                // must be in chronological order (minute ascending)
      { player: "Xabi Alonso",      minute: 27, team: "home" },
      { player: "Robin van Persie", minute: 44, team: "away" },
      { player: "Arjen Robben",     minute: 53, team: "away" },
      { player: "Stefan de Vrij",   minute: 65, team: "away" },
      { player: "Robin van Persie", minute: 72, team: "away" },
      { player: "Arjen Robben",     minute: 80, team: "away" },
    ],
  },
},
```

**Rules:**
- `puzzleDate` must be unique — this controls which day the puzzle appears
- `match.date` is the real match date, used only for year scoring
- Goal scorers **must be in chronological order** — positional scoring depends on it
- Images go in `public/images/puzzles/` named by `puzzleDate`

---

## Image sourcing

See [IMAGES.md](./IMAGES.md) for the full strategy.

```bash
# Search Wikimedia Commons + Openverse for CC-licensed images
node scripts/find-image.mjs "search terms" YYYY-MM-DD

# Audit license status of all puzzles
node scripts/audit-images.mjs
```

**Before monetising**: all images need clear licensing (CC BY/SA or owned). Current images are unaudited — run `audit-images.mjs` to check status.

---

## Dev mode

`/?dev=1` enables a toolbar to navigate between all puzzle dates. Puzzle state resets on every navigation.

---

## Local development

```bash
npm install
npm run dev           # http://localhost:3000
npx tsc --noEmit      # type check
node scripts/audit-images.mjs   # image license audit
```

---

## Fuzzy matching reference

### Competitions
| Player types | Matches |
|---|---|
| Prem / EPL / Premier League | Premier League |
| Champions League / UCL / CL | UEFA Champions League |
| World Cup / FIFA WC / 2014 FIFA World Cup Group Stage | FIFA World Cup |
| Euros / European Championship | UEFA European Championship |
| League Cup / Carabao Cup / Carling Cup / EFL Cup | Football League Cup |
| Championship | EFL Championship |
| Playoff / Play-off Final | Championship Play-Off Final |

### Teams
| Player types | Matches |
|---|---|
| Spurs / Tottenham | Tottenham Hotspur |
| Villa | Aston Villa |
| Holland / Dutch / Oranje | Netherlands |
| Man City / Cityzens | Manchester City |
| Man Utd / Red Devils | Manchester United |
| Blues / BCFC / Birmingham | Birmingham City |
| QPR / Queens Park | Queens Park Rangers |
| Toon / Newcastle Utd | Newcastle United |
| Blades / Sheffield Utd | Sheffield United |
| Rams / Derby | Derby County |

### Stadiums
| Player types | Matches |
|---|---|
| Wembley | Wembley Stadium |
| Azteca | Estadio Azteca |
| Etihad / Eastlands | City of Manchester Stadium |
| Britannia / bet365 | Britannia Stadium / bet365 Stadium |
| White Hart Lane / Tottenham Stadium | White Hart Lane |
| Fonte Nova | Arena Fonte Nova |

---

## Share format

```
BolGuessr • 19 May 2026 • 67/100

📆🤏  🏆✅  🏟️✅
🏠🤏  🅰️🤏  🎯🤏  ⚽❌

bolguessr.com
```

Icons: 📆 year · 🏆 competition · 🏟️ stadium · 🏠 home · 🅰️ away · 🎯 score · ⚽ scorers
States: ✅ correct · 🤏 partial/close · ❌ wrong

---

## Planned features

- [ ] Leaderboard (daily + all-time) via Supabase
- [ ] Anonymous player identity via localStorage session ID
- [ ] "You ranked #N" shown after result
- [ ] Affiliate links (Sky Sports / DAZN / TNT Sports)
- [ ] Google AdSense (after image licensing resolved)
- [ ] Cloudflare Pages deployment
