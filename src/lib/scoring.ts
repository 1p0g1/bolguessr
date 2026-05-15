import { Puzzle, GuessState, ScoreBreakdown } from "@/types/puzzle";
import { norm, normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam } from "./aliases";

const MAX_YEAR        = 15;
const MAX_TEAM        = 12;
const MAX_COMPETITION = 10;
const MAX_STADIUM     = 10;
const MAX_SCORE       = 20;
const MAX_SCORERS     = 15;

export function calculateScore(puzzle: Puzzle, guess: GuessState): ScoreBreakdown {
  const matchYear = new Date(puzzle.match.date).getFullYear();
  const guessYear = parseInt(guess.year, 10);

  // Year — proximity
  let year = 0;
  if (!isNaN(guessYear)) {
    const diff = Math.abs(matchYear - guessYear);
    if (diff === 0)      year = MAX_YEAR;
    else if (diff === 1) year = 10;
    else if (diff === 2) year = 6;
    else if (diff === 3) year = 3;
    else if (diff <= 5)  year = 1;
  }

  // Teams — alias-normalised exact match
  const homeTeam = normaliseTeam(guess.homeTeam) === normaliseTeam(puzzle.match.homeTeam) ? MAX_TEAM : 0;
  const awayTeam = normaliseTeam(guess.awayTeam) === normaliseTeam(puzzle.match.awayTeam) ? MAX_TEAM : 0;

  // Competition — alias-normalised
  const compGuess  = normaliseCompetition(guess.competition);
  const compAnswer = normalisedPuzzleCompetition(puzzle.match.competition);
  const competition = compGuess === compAnswer && compGuess !== "" ? MAX_COMPETITION : 0;

  // Stadium — accent-stripped partial match
  const stadGuess  = norm(guess.stadium);
  const stadAnswer = norm(puzzle.match.stadium);
  let stadium = 0;
  if (stadGuess.length >= 3) {
    if (stadGuess === stadAnswer)              stadium = MAX_STADIUM;
    else if (stadAnswer.includes(stadGuess))   stadium = Math.round(MAX_STADIUM * 0.6);
    else if (stadGuess.includes(stadAnswer))   stadium = Math.round(MAX_STADIUM * 0.6);
  }

  // Score
  const correctHome = puzzle.match.score.home;
  const correctAway = puzzle.match.score.away;
  const guessHome   = parseInt(guess.homeScore, 10);
  const guessAway   = parseInt(guess.awayScore, 10);

  let score = 0;
  if (!isNaN(guessHome) && !isNaN(guessAway)) {
    if (guessHome === correctHome && guessAway === correctAway) {
      score = MAX_SCORE;
    } else {
      const diff = Math.abs(guessHome - correctHome) + Math.abs(guessAway - correctAway);
      if (diff === 1)                                                                   score = 12;
      else if (diff === 2)                                                              score = 6;
      else if (Math.sign(guessHome - guessAway) === Math.sign(correctHome - correctAway)) score = 3;
    }
  }

  // Goal scorers — accent-stripped, frequency-aware
  const totalGoals = correctHome + correctAway;
  let goalScorers = 0;
  if (totalGoals > 0) {
    const allGuessed = [...(guess.homeScorers ?? []), ...(guess.awayScorers ?? [])].filter(Boolean);
    if (allGuessed.length > 0) {
      const correctFreq: Record<string, number> = {};
      puzzle.match.goalScorers.forEach((g) => {
        const n = norm(g.player);
        correctFreq[n] = (correctFreq[n] ?? 0) + 1;
      });
      const guessFreq: Record<string, number> = {};
      allGuessed.forEach((g) => {
        const n = norm(g);
        guessFreq[n] = (guessFreq[n] ?? 0) + 1;
      });
      let hits = 0;
      Object.entries(guessFreq).forEach(([name, count]) => {
        hits += Math.min(count, correctFreq[name] ?? 0);
      });
      goalScorers = Math.round((hits / totalGoals) * MAX_SCORERS);
    }
  }

  const maxPossible =
    MAX_YEAR + MAX_TEAM + MAX_TEAM + MAX_COMPETITION + MAX_STADIUM + MAX_SCORE +
    (totalGoals > 0 ? MAX_SCORERS : 0);

  const total = year + homeTeam + awayTeam + competition + stadium + score + goalScorers;
  return { year, competition, stadium, homeTeam, awayTeam, score, goalScorers, total, maxPossible };
}

// Helper: which of a list of guessed scorer names matched the actual scorers (accent-stripped)
export function scorerHits(
  guessed: string[],
  actual: { player: string }[]
): boolean[] {
  const correctFreq: Record<string, number> = {};
  actual.forEach((g) => {
    const n = norm(g.player);
    correctFreq[n] = (correctFreq[n] ?? 0) + 1;
  });
  const used: Record<string, number> = {};
  return guessed.map((g) => {
    const n = norm(g);
    const available = (correctFreq[n] ?? 0) - (used[n] ?? 0);
    if (available > 0) { used[n] = (used[n] ?? 0) + 1; return true; }
    return false;
  });
}

export function maxScorerInputs(score: string): number {
  return Math.max(0, parseInt(score, 10) || 0);
}
