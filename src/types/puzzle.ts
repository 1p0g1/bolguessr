export interface GoalScorer {
  player: string;
  minute: number | null;
  team: "home" | "away";
  ownGoal?: boolean;
}

export interface Puzzle {
  puzzleDate: string;
  imageFile: string;
  event: string;
  match: {
    date: string;
    competition: string;
    stadium: string;
    stadiumLat?: number;
    stadiumLng?: number;
    location: string;
    homeTeam: string;
    awayTeam: string;
    score: { home: number; away: number };
    goalScorers: GoalScorer[];
  };
  difficulty: "easy" | "medium" | "hard";
  sourceUrl: string;
  imageAttribution?: string;
  imageLicense?: string;
  imageSourceUrl?: string;
}

export interface GuessState {
  year: string;
  competition: string;
  mapPin: { lat: number; lng: number } | null;
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
  stadiumDistanceKm: number | null;
  homeTeam: number;
  awayTeam: number;
  score: number;
  goalScorers: number;
  total: number;
  maxPossible: number;
  teamsSwapped: boolean;
}

export type GamePhase = "guessing" | "revealed";
