export interface GoalScorer {
  player: string;
  minute: number | null;
  team: "home" | "away";
}

export interface Puzzle {
  puzzleDate: string;
  imageFile: string;
  event: string;
  match: {
    date: string;
    competition: string;
    stadium: string;
    location: string;
    homeTeam: string;
    awayTeam: string;
    score: { home: number; away: number };
    goalScorers: GoalScorer[];
  };
  difficulty: "easy" | "medium" | "hard";
  sourceUrl: string;
}

export interface GuessState {
  year: string;
  competition: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  homeScorers: string[];
  awayScorers: string[];
}

export interface ScoreBreakdown {
  year: number;
  competition: number;
  stadium: number;
  homeTeam: number;
  awayTeam: number;
  score: number;
  goalScorers: number;
  total: number;
  maxPossible: number;
  /** Both teams correctly identified but home/away positions swapped */
  teamsSwapped: boolean;
}

export type GamePhase = "guessing" | "revealed";
