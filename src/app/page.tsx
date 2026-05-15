import { getTodaysPuzzle } from "@/data/puzzles";
import GameClient from "./GameClient";

export default function Home() {
  const puzzle = getTodaysPuzzle();

  return <GameClient puzzle={puzzle} />;
}
