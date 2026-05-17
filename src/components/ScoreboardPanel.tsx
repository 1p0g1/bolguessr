"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Puzzle, GuessState, GamePhase } from "@/types/puzzle";
import { calculateScore, scorerHits } from "@/lib/scoring";
import { norm, normaliseCompetition, normalisedPuzzleCompetition, normaliseTeam } from "@/lib/aliases";
import LedInput from "./LedInput";
import ScoreInput from "./ScoreInput";

interface Props {
  puzzle: Puzzle;
  onPhaseChange?: (phase: GamePhase) => void;
}

const emptyGuess = (): GuessState => ({
  year: "", competition: "", stadium: "",
  homeTeam: "", awayTeam: "",
  homeScore: "", awayScore: "",
  homeScorers: [], awayScorers: [],
});

export default function ScoreboardPanel({ puzzle, onPhaseChange }: Props) {
  const [phase, setPhase] = useState<GamePhase>("guessing");
  const [guess, setGuess] = useState<GuessState>(emptyGuess());
  const [totalScore, setTotalScore] = useState<{ pts: number; max: number } | null>(null);

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
    const breakdown = calculateScore(puzzle, guess);
    setTotalScore({ pts: breakdown.total, max: breakdown.maxPossible });
    setPhase("revealed");
    onPhaseChange?.("revealed");
  }

  const revealed = phase === "revealed";

  // ── Correctness (post-reveal only) ──────────────────────────────
  const correctYear   = new Date(puzzle.match.date).getFullYear();
  const guessYear     = parseInt(guess.year, 10);
  const yearDiff      = isNaN(guessYear) ? 99 : Math.abs(correctYear - guessYear);

  const yearOk      = revealed ? guessYear === correctYear : null;
  const homeOk      = revealed ? normaliseTeam(guess.homeTeam) === normaliseTeam(puzzle.match.homeTeam) : null;
  const awayOk      = revealed ? normaliseTeam(guess.awayTeam) === normaliseTeam(puzzle.match.awayTeam) : null;
  const homeScoreOk = revealed ? parseInt(guess.homeScore) === puzzle.match.score.home : null;
  const awayScoreOk = revealed ? parseInt(guess.awayScore) === puzzle.match.score.away : null;

  const compOk = revealed
    ? normaliseCompetition(guess.competition) === normalisedPuzzleCompetition(puzzle.match.competition)
    : null;

  const stadGuess  = norm(guess.stadium);
  const stadAnswer = norm(puzzle.match.stadium);
  const stadOk = revealed
    ? stadGuess.length >= 3 && (stadGuess === stadAnswer || stadAnswer.includes(stadGuess) || stadGuess.includes(stadAnswer))
    : null;

  // Scorer hit arrays (for feedback)
  const homeHits = revealed
    ? scorerHits(guess.homeScorers, puzzle.match.goalScorers.filter(g => g.team === "home"))
    : [];
  const awayHits = revealed
    ? scorerHits(guess.awayScorers, puzzle.match.goalScorers.filter(g => g.team === "away"))
    : [];

  const canSubmit = guess.year && guess.homeTeam && guess.awayTeam &&
                    guess.homeScore !== "" && guess.awayScore !== "";

  return (
    <div className="led-panel rounded-lg overflow-hidden w-full">
      {/* Header — left-aligned, no dot, no brand repeat */}
      <div
        className="px-4 py-2 border-b"
        style={{ background: "linear-gradient(180deg,#0a2010 0%,#071409 100%)", borderColor: "var(--border-dim)" }}
      >
        <span className="text-[11px] tracking-[0.2em] uppercase font-led led-amber">Daily Puzzle</span>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Row 1: Year + Competition — side by side */}
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

        {/* Row 2: Stadium — full width */}
        <LedInput label="Stadium" value={guess.stadium} onChange={(v) => setField("stadium", v)}
          disabled={revealed} correct={stadOk}
          correctAnswer={stadOk === false ? puzzle.match.stadium : undefined} />

        {/* Row 3: Teams */}
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

        {/* Row 4: Score */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] font-led text-label mb-3">Final Score</p>
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

        {/* Row 5: Scorers — two columns, home left / away right */}
        <AnimatePresence>
          {anyScorers && !revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-[0.25em] font-led text-label">Goal Scorers</p>
                <span
                  className="text-[9px] font-led cursor-default"
                  style={{ color: "var(--text-dim)" }}
                  title="Enter scorers in the order they scored"
                >
                  ⓘ in order scored · optional
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                {/* Home column */}
                <div className="flex flex-col gap-1.5">
                  {homeGoals > 0 && (
                    <p className="text-[8px] uppercase tracking-widest font-led text-label truncate">
                      {guess.homeTeam || "Home"}
                    </p>
                  )}
                  {Array.from({ length: homeGoals }).map((_, i) => (
                    <div key={`h${i}`} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-led shrink-0 w-5 text-right" style={{ color: "var(--border-mid)" }}>
                        #{i + 1}
                      </span>
                      <input
                        value={guess.homeScorers[i] ?? ""}
                        onChange={(e) => setHomeScorer(i, e.target.value)}
                        className="led-input w-full rounded-sm text-xs px-2 py-1 h-8"
                      />
                    </div>
                  ))}
                </div>
                {/* Away column */}
                <div className="flex flex-col gap-1.5">
                  {awayGoals > 0 && (
                    <p className="text-[8px] uppercase tracking-widest font-led text-label text-right truncate">
                      {guess.awayTeam || "Away"}
                    </p>
                  )}
                  {Array.from({ length: awayGoals }).map((_, i) => (
                    <div key={`a${i}`} className="flex items-center gap-1.5">
                      <span className="text-[9px] font-led shrink-0 w-5 text-right" style={{ color: "var(--border-mid)" }}>
                        #{i + 1}
                      </span>
                      <input
                        value={guess.awayScorers[i] ?? ""}
                        onChange={(e) => setAwayScorer(i, e.target.value)}
                        className="led-input w-full rounded-sm text-xs px-2 py-1 h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit / Result */}
        {!revealed ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-sm font-led font-bold text-sm tracking-[0.25em] uppercase transition-all duration-200"
            style={{
              border: "2px solid",
              borderColor: canSubmit ? "var(--amber)" : "var(--border-dim)",
              color:       canSubmit ? "var(--amber)" : "var(--text-dim)",
              background:  "transparent",
              cursor:      canSubmit ? "pointer" : "not-allowed",
              boxShadow:   canSubmit ? "0 0 16px var(--amber-glow)" : "none",
            }}
          >
            Submit Guess
          </button>
        ) : (
          <AnimatePresence>
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              {/* 1 — Your scorer guesses with ✓/✗ feedback */}
              {(guess.homeScorers.filter(Boolean).length > 0 || guess.awayScorers.filter(Boolean).length > 0) && (
                <div className="rounded-sm border px-3 py-2" style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-led text-label mb-2">Your scorers</p>
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

              {/* 2 — Actual scorers (answer reveal) */}
              {puzzle.match.goalScorers.length > 0 && (
                <div className="text-[11px] font-led rounded-sm px-3 py-2 border"
                  style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)", color: "var(--white-bright)" }}>
                  <span className="text-label text-[9px] tracking-widest uppercase block mb-1">Scorers</span>
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

              {/* 3 — Score bar / result */}
              {totalScore && <ScoreBar pts={totalScore.pts} max={totalScore.max} yearDiff={yearDiff} />}

              {/* 4 — Event description */}
              <p className="text-[11px] font-led leading-relaxed rounded-sm px-3 py-2 border"
                style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)", color: "var(--text-label)" }}>
                {puzzle.event}
              </p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ pts, max, yearDiff }: { pts: number; max: number; yearDiff: number }) {
  const pct   = Math.round((pts / max) * 100);
  const color = pct >= 75 ? "var(--green-led)" : pct >= 40 ? "var(--amber)" : "var(--red-led)";
  const yearNote = yearDiff === 0 ? null : yearDiff <= 2 ? "close on the year" : yearDiff <= 5 ? "year was off" : "year way off";
  return (
    <div className="rounded-sm border px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: "var(--pitch-inset)", borderColor: "var(--border-dim)" }}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] tracking-[0.3em] uppercase font-led text-label">Result</span>
        {yearNote && <span className="text-[10px] font-led led-amber-dim">{yearNote}</span>}
      </div>
      <span className="text-3xl font-led font-black" style={{ color, textShadow: `0 0 10px ${color}66` }}>
        {pts}<span className="text-sm font-led text-label">/{max}</span>
      </span>
    </div>
  );
}
