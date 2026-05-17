import { getPuzzleForDate, getTodaysPuzzle, PUZZLES } from "@/data/puzzles";
import GameClient from "./GameClient";

interface Props {
  searchParams: Promise<{ date?: string; dev?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const isDev = params.dev === "1";
  const puzzle = params.date
    ? getPuzzleForDate(params.date)
    : getTodaysPuzzle();

  const allDates = PUZZLES.map((p) => p.puzzleDate).sort();

  return <GameClient puzzle={puzzle} isDev={isDev} allDates={allDates} currentDate={params.date} />;
}
