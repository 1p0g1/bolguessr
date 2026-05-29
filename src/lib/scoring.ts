import { Puzzle, GuessState, ScoreBreakdown } from "@/types/puzzle";
import { normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam, scorerNamesMatch } from "./aliases";

// ── Point caps ────────────────────────────────────────────────────────────────
// Year:        15 exact | 10 within 1 yr | 5 within 3 yrs | 0 beyond
// Home team:   10
// Away team:   10
// Competition: 10
// Stadium:     15 graduated by map-pin distance (see mapPinScore)
// Score:       15 both right | 5 one side right | 0 wrong
// Goal scorers:25 proportional — POSITIONAL (guess #N matched against scorer #N in order)
// ─────────────────────────────────────────────────────── Total max = 100 pts

const MAX_YEAR        = 15;
const MAX_TEAM        = 10;
const MAX_COMPETITION = 10;
const MAX_STADIUM     = 15;
const MAX_SCORE       = 15;
const MAX_SCORERS     = 25;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapPinScore(km: number): number {
  if (km < 5)    return 15;  // within the stadium grounds
  if (km < 25)   return 12;  // correct city
  if (km < 100)  return 8;   // correct region
  if (km < 300)  return 4;   // correct country area
  if (km < 1000) return 1;   // at least right side of continent
  return 0;
}

export function calculateScore(puzzle: Puzzle, guess: GuessState): ScoreBreakdown {
  // ── Year ───────────────────────────────────────────────────────────────────
  const matchYear = new Date(puzzle.match.date).getFullYear();
  const guessYear = parseInt(guess.year, 10);
  let year = 0;
  if (!isNaN(guessYear)) {
    const diff = Math.abs(matchYear - guessYear);
    if (diff === 0)      year = MAX_YEAR;
    else if (diff <= 1)  year = 10;
    else if (diff <= 3)  year = 5;
  }

  // ── Teams ──────────────────────────────────────────────────────────────────
  const homeNorm       = normaliseTeam(guess.homeTeam);
  const awayNorm       = normaliseTeam(guess.awayTeam);
  const actualHomeNorm = normaliseTeam(puzzle.match.homeTeam);
  const actualAwayNorm = normaliseTeam(puzzle.match.awayTeam);
  const teamsSwapped   = !!(homeNorm && awayNorm && homeNorm === actualAwayNorm && awayNorm === actualHomeNorm);

  let homeTeam = 0, awayTeam = 0;
  if (homeNorm === actualHomeNorm)  homeTeam = MAX_TEAM;
  else if (teamsSwapped)            homeTeam = 5;
  if (awayNorm === actualAwayNorm)  awayTeam = MAX_TEAM;
  else if (teamsSwapped)            awayTeam = 5;

  // ── Competition ────────────────────────────────────────────────────────────
  const compGuess  = normaliseCompetition(guess.competition);
  const compAnswer = normalisedPuzzleCompetition(puzzle.match.competition);
  const competition = (compGuess && compGuess === compAnswer) ? MAX_COMPETITION : 0;

  // ── Stadium — distance-based map pin ──────────────────────────────────────
  let stadium = 0;
  let stadiumDistanceKm: number | null = null;
  if (
    guess.mapPin &&
    puzzle.match.stadiumLat !== undefined &&
    puzzle.match.stadiumLng !== undefined
  ) {
    stadiumDistanceKm = haversineKm(
      guess.mapPin.lat, guess.mapPin.lng,
      puzzle.match.stadiumLat, puzzle.match.stadiumLng,
    );
    stadium = mapPinScore(stadiumDistanceKm);
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const correctHome = teamsSwapped ? puzzle.match.score.away  : puzzle.match.score.home;
  const correctAway = teamsSwapped ? puzzle.match.score.home  : puzzle.match.score.away;
  const guessHome   = parseInt(guess.homeScore, 10);
  const guessAway   = parseInt(guess.awayScore, 10);
  let score = 0;
  if (!isNaN(guessHome) && !isNaN(guessAway)) {
    if (guessHome === correctHome && guessAway === correctAway) score = MAX_SCORE;
    else if (guessHome === correctHome || guessAway === correctAway) score = 5;
  }

  // ── Goal scorers — POSITIONAL matching, team-aware ────────────────────────
  const realHomeScorers = puzzle.match.goalScorers.filter((g) => g.team === "home");
  const realAwayScorers = puzzle.match.goalScorers.filter((g) => g.team === "away");
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

  return { year, competition, stadium, stadiumDistanceKm, homeTeam, awayTeam, score, goalScorers, total, maxPossible, teamsSwapped };
}

// ── Per-scorer hit array for UI feedback ─────────────────────────────────────
export function scorerHits(guessed: string[], actual: { player: string }[]): boolean[] {
  return guessed.map((name, i) => {
    if (!name || i >= actual.length) return false;
    return scorerNamesMatch(name, actual[i].player);
  });
}

export function maxScorerInputs(score: string): number {
  return Math.max(0, parseInt(score, 10) || 0);
}
