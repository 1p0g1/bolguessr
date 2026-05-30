"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Puzzle, GuessState, GamePhase, ScoreBreakdown } from "@/types/puzzle";
import { calculateScore, scorerHits } from "@/lib/scoring";
import { normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam } from "@/lib/aliases";
import LedInput from "./LedInput";
import ScoreInput from "./ScoreInput";

const MapGuess = dynamic(() => import("./MapGuess"), { ssr: false });

interface Props {
  puzzle: Puzzle;
  onPhaseChange?: (phase: GamePhase) => void;
}

const emptyGuess = (): GuessState => ({
  year: "", competition: "",
  mapPin: null,
  homeTeam: "", awayTeam: "",
  homeScore: "", awayScore: "",
  homeScorers: [], awayScorers: [],
});

export default function ScoreboardPanel({ puzzle, onPhaseChange }: Props) {
  const [phase, setPhase] = useState<GamePhase>("guessing");
  const [guess, setGuess] = useState<GuessState>(emptyGuess());
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);

  const homeGoals = Math.max(0, parseInt(guess.homeScore, 10) || 0);
  const awayGoals = Math.max(0, parseInt(guess.awayScore, 10) || 0);
  const anyScorers = homeGoals > 0 || awayGoals > 0;

  function setField<K extends keyof GuessState>(key: K, val: GuessState[K]) {
    setGuess((prev) => ({ ...prev, [key]: val }));
  }
  function setHomeScorer(i: number, val: string) {
    setGuess((prev) => { const n = [...prev.homeScorers]; n[i] = val; return { ...prev, homeScorers: n }; });
  }
  function setAwayScorer(i: number, val: string) {
    setGuess((prev) => { const n = [...prev.awayScorers]; n[i] = val; return { ...prev, awayScorers: n }; });
  }

  function handleSubmit() {
    const bd = calculateScore(puzzle, guess);
    setBreakdown(bd);
    setPhase("revealed");
    onPhaseChange?.("revealed");
  }

  const revealed = phase === "revealed";

  const correctYear = new Date(puzzle.match.date).getFullYear();
  const guessYear   = parseInt(guess.year, 10);
  const yearDiff    = isNaN(guessYear) ? 99 : Math.abs(correctYear - guessYear);

  const yearOk: boolean | "partial" | null = revealed
    ? (yearDiff === 0 ? true : yearDiff <= 3 ? "partial" : false) : null;

  const teamsSwapped = breakdown?.teamsSwapped ?? false;

  const homeOk: boolean | "partial" | null = revealed
    ? (normaliseTeam(guess.homeTeam) === normaliseTeam(puzzle.match.homeTeam) ? true
      : teamsSwapped ? "partial" : false) : null;

  const awayOk: boolean | "partial" | null = revealed
    ? (normaliseTeam(guess.awayTeam) === normaliseTeam(puzzle.match.awayTeam) ? true
      : teamsSwapped ? "partial" : false) : null;

  const expectedHome = teamsSwapped ? puzzle.match.score.away : puzzle.match.score.home;
  const expectedAway = teamsSwapped ? puzzle.match.score.home : puzzle.match.score.away;
  const homeScoreOk: boolean | "partial" | null = revealed
    ? (parseInt(guess.homeScore) === expectedHome ? (teamsSwapped ? "partial" : true) : false) : null;
  const awayScoreOk: boolean | "partial" | null = revealed
    ? (parseInt(guess.awayScore) === expectedAway ? (teamsSwapped ? "partial" : true) : false) : null;

  const compOk: boolean | null = revealed
    ? normaliseCompetition(guess.competition) === normalisedPuzzleCompetition(puzzle.match.competition)
    : null;

  const realHomeScorers = puzzle.match.goalScorers.filter(g => g.team === "home");
  const realAwayScorers = puzzle.match.goalScorers.filter(g => g.team === "away");
  const homeHits = revealed
    ? scorerHits(guess.homeScorers, teamsSwapped ? realAwayScorers : realHomeScorers) : [];
  const awayHits = revealed
    ? scorerHits(guess.awayScorers, teamsSwapped ? realHomeScorers : realAwayScorers) : [];

  const canSubmit = !!(guess.year && guess.homeTeam && guess.awayTeam &&
                    guess.homeScore !== "" && guess.awayScore !== "");

  return (
    <div className="led-panel rounded-lg overflow-hidden w-full">
      <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border-dim)" }}>
        <span className="text-[11px] tracking-[0.15em] uppercase font-led led-amber">Daily Puzzle</span>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Year + Competition */}
        <div className="flex gap-3 items-start">
          <div className="w-28 shrink-0">
            <LedInput label="Year" value={guess.year} onChange={(v) => setField("year", v)}
              type="number" disabled={revealed} correct={yearOk}
              correctAnswer={yearOk === false ? String(correctYear) : undefined} />
          </div>
          <div className="flex-1 min-w-0">
            <LedInput label="Competition" value={guess.competition} onChange={(v) => setField("competition", v)}
              disabled={revealed} correct={compOk}
              correctAnswer={compOk === false ? puzzle.match.competition : undefined} />
          </div>
        </div>

        {/* Map — stadium location pin */}
        <MapGuess
          pin={guess.mapPin}
          onPin={(lat, lng) => setField("mapPin", { lat, lng })}
          revealed={revealed}
          correctLat={puzzle.match.stadiumLat}
          correctLng={puzzle.match.stadiumLng}
          distanceKm={breakdown?.stadiumDistanceKm}
        />
        {revealed && (
          <p className="text-[11px] font-led -mt-2" style={{ color: "var(--text-label)" }}>
            <span style={{ color: "var(--green-led)" }}>✓</span> {puzzle.match.stadium}
            {breakdown && (
              <span style={{ color: breakdown.stadium > 0 ? "var(--green-led)" : "var(--red-led)" }}>
                {" "}· {breakdown.stadium}/15
              </span>
            )}
          </p>
        )}

        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <LedInput label="Home" value={guess.homeTeam} onChange={(v) => setField("homeTeam", v)}
            disabled={revealed} correct={homeOk}
            correctAnswer={homeOk === false ? puzzle.match.homeTeam : undefined} />
          <div className="flex items-end pb-3">
            <span className="font-led text-sm leading-none" style={{ color: "var(--text-dim)" }}>VS</span>
          </div>
          <LedInput label="Away" value={guess.awayTeam} onChange={(v) => setField("awayTeam", v)}
            disabled={revealed} correct={awayOk}
            correctAnswer={awayOk === false ? puzzle.match.awayTeam : undefined} />
        </div>

        {/* Score */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-led mb-3" style={{ color: "var(--text-label)" }}>
            Final Score
          </p>
          <div className="flex items-center justify-center gap-6">
            <ScoreInput label={guess.homeTeam || "Home"} value={guess.homeScore}
              onChange={(v) => setField("homeScore", v)} disabled={revealed}
              correct={homeScoreOk} correctAnswer={homeScoreOk === false ? puzzle.match.score.home : undefined} />
            <span className="text-2xl font-led mt-5" style={{ color: "var(--text-dim)" }}>—</span>
            <ScoreInput label={guess.awayTeam || "Away"} value={guess.awayScore}
              onChange={(v) => setField("awayScore", v)} disabled={revealed}
              correct={awayScoreOk} correctAnswer={awayScoreOk === false ? puzzle.match.score.away : undefined} />
          </div>
        </div>

        {/* Scorers */}
        <AnimatePresence>
          {anyScorers && !revealed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-led" style={{ color: "var(--text-label)" }}>
                  Goal Scorers
                </p>
                <span className="text-[9px] font-led" style={{ color: "var(--text-dim)" }}
                  title="Enter scorers in the order they scored">
                  ⓘ in order · optional
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <div className="flex flex-col gap-1.5">
                  {homeGoals > 0 && (
                    <p className="text-[8px] uppercase tracking-widest font-led truncate" style={{ color: "var(--text-label)" }}>
                      {guess.homeTeam || "Home"}
                    </p>
                  )}
                  {Array.from({ length: homeGoals }).map((_, i) => (
                    <div key={`h${i}`} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-led shrink-0 w-5 text-right" style={{ color: "var(--text-dim)" }}>#{i + 1}</span>
                      <input value={guess.homeScorers[i] ?? ""} onChange={(e) => setHomeScorer(i, e.target.value)}
                        className="led-input w-full rounded-sm text-xs px-2 py-1 h-8" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {awayGoals > 0 && (
                    <p className="text-[8px] uppercase tracking-widest font-led text-right truncate" style={{ color: "var(--text-label)" }}>
                      {guess.awayTeam || "Away"}
                    </p>
                  )}
                  {Array.from({ length: awayGoals }).map((_, i) => (
                    <div key={`a${i}`} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-led shrink-0 w-5 text-right" style={{ color: "var(--text-dim)" }}>#{i + 1}</span>
                      <input value={guess.awayScorers[i] ?? ""} onChange={(e) => setAwayScorer(i, e.target.value)}
                        className="led-input w-full rounded-sm text-xs px-2 py-1 h-8" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit / Result */}
        {!revealed ? (
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 rounded-sm font-led font-bold text-sm tracking-[0.2em] uppercase transition-all duration-200"
            style={{
              border: "2px solid",
              borderColor: canSubmit ? "var(--amber)" : "var(--border-mid)",
              color:       canSubmit ? "var(--amber)" : "var(--text-dim)",
              background:  "transparent",
              cursor:      canSubmit ? "pointer" : "not-allowed",
            }}>
            Submit Guess
          </button>
        ) : (
          <AnimatePresence>
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3">

              {(guess.homeScorers.filter(Boolean).length > 0 || guess.awayScorers.filter(Boolean).length > 0) && (
                <div className="rounded-sm border px-3 py-2" style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-led mb-2" style={{ color: "var(--text-label)" }}>Your scorers</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] font-led">
                    <div className="flex flex-col gap-0.5">
                      {guess.homeScorers.filter(Boolean).map((s, i) => (
                        <span key={i} style={{ color: homeHits[i] ? "var(--green-led)" : "var(--red-led)" }}>
                          {homeHits[i] ? "✓" : "✗"} {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      {guess.awayScorers.filter(Boolean).map((s, i) => (
                        <span key={i} style={{ color: awayHits[i] ? "var(--green-led)" : "var(--red-led)" }}>
                          {s} {awayHits[i] ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {puzzle.match.goalScorers.length > 0 && (
                <div className="text-[11px] font-led rounded-sm px-3 py-2 border"
                  style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)", color: "var(--white-bright)" }}>
                  <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: "var(--text-label)" }}>Scorers</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <div className="flex flex-col gap-0.5">
                      {puzzle.match.goalScorers.filter(g => g.team === "home").map((g, i) => (
                        <span key={i}>{g.player}{g.minute ? ` ${g.minute}'` : ""}</span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      {puzzle.match.goalScorers.filter(g => g.team === "away").map((g, i) => (
                        <span key={i}>{g.player}{g.minute ? ` ${g.minute}'` : ""}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {breakdown && <ScoreBar pts={breakdown.total} max={breakdown.maxPossible} breakdown={breakdown} yearDiff={yearDiff} />}

              <p className="text-[11px] font-led leading-relaxed rounded-sm px-3 py-2 border"
                style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)", color: "var(--text-label)" }}>
                {puzzle.event}
              </p>

              {breakdown && <ShareButton puzzle={puzzle} breakdown={breakdown} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function emojiResult(pts: number, max: number): string {
  if (pts === max) return "✅";
  if (pts > 0)     return "🤏";
  return "❌";
}

function buildShareText(puzzle: Puzzle, bd: ScoreBreakdown): string {
  const date = new Date(puzzle.puzzleDate + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  const e = emojiResult;
  return [
    `BolGuessr • ${date} • ${bd.total}/${bd.maxPossible}`,
    ``,
    `📆${e(bd.year, 15)}  🏆${e(bd.competition, 10)}  📍${e(bd.stadium, 15)}`,
    `🏠${e(bd.homeTeam, 10)}  🅰️${e(bd.awayTeam, 10)}  🎯${e(bd.score, 15)}  ⚽${e(bd.goalScorers, 25)}`,
    ``,
    `bolguessr.com`,
  ].join("\n");
}

function ShareButton({ puzzle, breakdown }: { puzzle: Puzzle; breakdown: ScoreBreakdown }) {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    navigator.clipboard.writeText(buildShareText(puzzle, breakdown)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleShare}
      className="w-full py-2.5 rounded-sm font-led font-bold text-xs tracking-[0.2em] uppercase transition-all duration-200 flex items-center justify-center gap-2"
      style={{
        border: "2px solid",
        borderColor: copied ? "var(--green-led)" : "var(--amber)",
        color:       copied ? "var(--green-led)" : "var(--amber)",
        background:  "transparent",
      }}>
      {copied ? "✓ Copied!" : "Share Result"}
    </button>
  );
}

function ScoreBar({ pts, max, breakdown, yearDiff }: {
  pts: number; max: number; breakdown: ScoreBreakdown; yearDiff: number;
}) {
  const pct   = Math.round((pts / max) * 100);
  const color = pct >= 75 ? "var(--green-led)" : pct >= 40 ? "#b85c00" : "var(--red-led)";

  const notes: string[] = [];
  if (yearDiff > 0 && yearDiff <= 3) notes.push(`year off by ${yearDiff}`);
  if (breakdown.teamsSwapped)        notes.push("home & away swapped");
  if (breakdown.score === 5)         notes.push("one score right");
  if (breakdown.goalScorers > 0 && breakdown.goalScorers < 25) notes.push("some scorers correct");

  return (
    <div className="rounded-sm border px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)" }}>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] tracking-[0.2em] uppercase font-led" style={{ color: "var(--text-label)" }}>Result</span>
        {notes.map((n, i) => (
          <span key={i} className="text-[10px] font-led" style={{ color: "#b85c00" }}>🤏 {n}</span>
        ))}
      </div>
      <span className="text-3xl font-led font-black shrink-0" style={{ color }}>
        {pts}<span className="text-sm font-led" style={{ color: "var(--text-label)" }}>/{max}</span>
      </span>
    </div>
  );
}
