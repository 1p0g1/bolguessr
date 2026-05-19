import { Puzzle, GuessState, ScoreBreakdown } from "@/types/puzzle";
import { normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam, scorerNamesMatch, stadiumMatch } from "./aliases";

// ── Point caps ────────────────────────────────────────────────────────────────
// Year:        15 exact | 10 within 1 yr | 5 within 3 yrs | 0 beyond
// Home team:   10
// Away team:   10
// Competition: 10
// Stadium:     15 exact | 9 partial (substring)
// Score:       15 both right | 5 one side right | 0 wrong
// Goal scorers:25 proportional — POSITIONAL (guess #N matched against scorer #N in order)
// ─────────────────────────────────────────────────────── Total max = 100 pts

const MAX_YEAR        = 15;
const MAX_TEAM        = 10;
const MAX_COMPETITION = 10;
const MAX_STADIUM     = 15;
const MAX_SCORE       = 15;
const MAX_SCORERS     = 25;

export function calculateScore(puzzle: Puzzle, guess: GuessState): ScoreBreakdown {
  // ── Year ───────────────────────────────────────────────────────────────────
  const matchYear = new Date(puzzle.match.date).getFullYear();
  const guessYear = parseInt(guess.year, 10);
  let year = 0;
  if (!isNaN(guessYear)) {
    const diff = Math.abs(matchYear - guessYear);
    if (diff === 0)      year = MAX_YEAR;   // 15 — exact
    else if (diff <= 1)  year = 10;          // 10 — within 1 year
    else if (diff <= 3)  year = 5;           // 5  — within 3 years
    // else 0
  }

  // ── Teams ──────────────────────────────────────────────────────────────────
  // 10 pts each for correct home/away. If both teams are right but sides are swapped → 5+5 = 10 total.
  const homeNorm      = normaliseTeam(guess.homeTeam);
  const awayNorm      = normaliseTeam(guess.awayTeam);
  const actualHomeNorm = normaliseTeam(puzzle.match.homeTeam);
  const actualAwayNorm = normaliseTeam(puzzle.match.awayTeam);
  const teamsSwapped  = !!(homeNorm && awayNorm && homeNorm === actualAwayNorm && awayNorm === actualHomeNorm);

  let homeTeam = 0, awayTeam = 0;
  if (homeNorm === actualHomeNorm) { homeTeam = MAX_TEAM; }
  else if (teamsSwapped)           { homeTeam = 5; }
  if (awayNorm === actualAwayNorm) { awayTeam = MAX_TEAM; }
  else if (teamsSwapped)           { awayTeam = 5; }

  // ── Competition ────────────────────────────────────────────────────────────
  const compGuess  = normaliseCompetition(guess.competition);
  const compAnswer = normalisedPuzzleCompetition(puzzle.match.competition);
  const competition = (compGuess && compGuess === compAnswer) ? MAX_COMPETITION : 0;

  // ── Stadium — binary right/wrong ──────────────────────────────────────────
  // Uses stadiumMatch() which handles abbreviations, substrings, and renamed grounds.
  // No partial credit — either you know the stadium or you don't.
  const stadium = stadiumMatch(guess.stadium, puzzle.match.stadium) ? MAX_STADIUM : 0;

  // ── Score ─────────────────────────────────────────────────────────────────
  // When teams are swapped, the player attributed their scores to the correct
  // teams but on the wrong side — so compare against the swapped expected values.
  const correctHome = teamsSwapped ? puzzle.match.score.away  : puzzle.match.score.home;
  const correctAway = teamsSwapped ? puzzle.match.score.home  : puzzle.match.score.away;
  const guessHome   = parseInt(guess.homeScore, 10);
  const guessAway   = parseInt(guess.awayScore, 10);
  let score = 0;
  if (!isNaN(guessHome) && !isNaN(guessAway)) {
    if (guessHome === correctHome && guessAway === correctAway) {
      score = MAX_SCORE;                                  // 15 — both right
    } else if (guessHome === correctHome || guessAway === correctAway) {
      score = 5;                                          // 5  — one side right
    }
  }

  // ── Goal scorers — POSITIONAL matching, team-aware ────────────────────────
  // Guess #N is compared against actual scorer #N in the order they scored.
  // If teams were swapped (player put home team as away and vice versa), the scorer
  // columns are also swapped so correct positional guesses are still rewarded.
  const realHomeScorers = puzzle.match.goalScorers.filter((g) => g.team === "home");
  const realAwayScorers = puzzle.match.goalScorers.filter((g) => g.team === "away");
  // When swapped: player's "home" inputs should be checked against actual away scorers
  const homeActual = teamsSwapped ? realAwayScorers : realHomeScorers;
  const awayActual = teamsSwapped ? realHomeScorers : realAwayScorers;
  const totalGoals = realHomeScorers.length + realAwayScorers.length;

  let goalScorers = 0;
  if (totalGoals > 0) {
    let hits = 0;
    (guess.homeScorers ?? []).forEach((name, i) => {
      if (name && i < homeActual.length && scorerNamesMatch(name, homeActual[i].player)) hits++;
    });
    (guess.awayScorers ?? []).forEach((name, i) => {
      if (name && i < awayActual.length && scorerNamesMatch(name, awayActual[i].player)) hits++;
    });
    goalScorers = Math.round((hits / totalGoals) * MAX_SCORERS);
  }

  const maxPossible = MAX_YEAR + MAX_TEAM + MAX_TEAM + MAX_COMPETITION + MAX_STADIUM + MAX_SCORE +
    (totalGoals > 0 ? MAX_SCORERS : 0);
  const total = year + homeTeam + awayTeam + competition + stadium + score + goalScorers;
  return { year, competition, stadium, homeTeam, awayTeam, score, goalScorers, total, maxPossible, teamsSwapped };
}

// ── Per-scorer hit array for UI feedback ─────────────────────────────────────
// POSITIONAL: guess[i] is checked against actual[i].
// Call with the CORRECT actual list for that column (already swapped if needed).
export function scorerHits(guessed: string[], actual: { player: string }[]): boolean[] {
  return guessed.map((name, i) => {
    if (!name || i >= actual.length) return false;
    return scorerNamesMatch(name, actual[i].player);
  });
}

export function maxScorerInputs(score: string): number {
  return Math.max(0, parseInt(score, 10) || 0);
}
