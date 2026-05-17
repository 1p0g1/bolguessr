import { Puzzle, GuessState, ScoreBreakdown } from "@/types/puzzle";
import { norm, normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam, scorerNamesMatch } from "./aliases";

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
  const homeTeam = normaliseTeam(guess.homeTeam) === normaliseTeam(puzzle.match.homeTeam) ? MAX_TEAM : 0;
  const awayTeam = normaliseTeam(guess.awayTeam) === normaliseTeam(puzzle.match.awayTeam) ? MAX_TEAM : 0;

  // ── Competition ────────────────────────────────────────────────────────────
  const compGuess  = normaliseCompetition(guess.competition);
  const compAnswer = normalisedPuzzleCompetition(puzzle.match.competition);
  const competition = (compGuess && compGuess === compAnswer) ? MAX_COMPETITION : 0;

  // ── Stadium — exact or substring partial ───────────────────────────────────
  const stadGuess  = norm(guess.stadium);
  const stadAnswer = norm(puzzle.match.stadium);
  let stadium = 0;
  if (stadGuess.length >= 3) {
    if (stadGuess === stadAnswer)                                              stadium = MAX_STADIUM;
    else if (stadAnswer.includes(stadGuess) || stadGuess.includes(stadAnswer)) stadium = 9;
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const correctHome = puzzle.match.score.home;
  const correctAway = puzzle.match.score.away;
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

  // ── Goal scorers — POSITIONAL matching ────────────────────────────────────
  // Guess #N is compared against actual scorer #N (in the order they scored).
  // Home guesses matched against home scorer list, away against away scorer list.
  // This rewards knowing who scored AND in what order.
  const homeActual = puzzle.match.goalScorers.filter((g) => g.team === "home");
  const awayActual = puzzle.match.goalScorers.filter((g) => g.team === "away");
  const totalGoals = homeActual.length + awayActual.length;

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
  return { year, competition, stadium, homeTeam, awayTeam, score, goalScorers, total, maxPossible };
}

// ── Per-scorer hit array for UI feedback ─────────────────────────────────────
// POSITIONAL: guess[i] is checked against actual[i] (not any element in pool).
export function scorerHits(guessed: string[], actual: { player: string }[]): boolean[] {
  return guessed.map((name, i) => {
    if (!name || i >= actual.length) return false;
    return scorerNamesMatch(name, actual[i].player);
  });
}

export function maxScorerInputs(score: string): number {
  return Math.max(0, parseInt(score, 10) || 0);
}
