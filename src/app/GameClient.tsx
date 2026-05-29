"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Puzzle, GamePhase } from "@/types/puzzle";
import ScoreboardPanel from "@/components/ScoreboardPanel";

interface Props {
  puzzle: Puzzle | null;
  isDev?: boolean;
  allDates?: string[];
  currentDate?: string;
}

export default function GameClient({ puzzle, isDev = false, allDates = [], currentDate }: Props) {
  const [, setPhase] = useState<GamePhase>("guessing");
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  // Dev mode: current index into allDates
  const activeDateStr = currentDate ?? new Date().toISOString().split("T")[0];
  const activeIdx = allDates.indexOf(activeDateStr);
  const prevDate = activeIdx > 0 ? allDates[activeIdx - 1] : null;
  const nextDate = activeIdx < allDates.length - 1 ? allDates[activeIdx + 1] : null;

  function navTo(date: string) {
    router.push(`/?date=${date}&dev=1`);
    setImageError(false);
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-4xl font-led led-amber">No puzzle today</div>
        <p className="font-led text-sm tracking-widest text-label">Check back tomorrow.</p>
        {isDev && allDates.length > 0 && (
          <div className="flex gap-3 mt-4">
            {allDates.slice(-5).map((d) => (
              <button key={d} onClick={() => navTo(d)}
                className="text-xs font-led px-3 py-1 rounded border border-[var(--border-mid)] text-label hover:text-[var(--amber)] hover:border-[var(--amber)] transition-colors">
                {d}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const imageSrc = `/images/puzzles/${puzzle.imageFile}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pitch-dark)" }}>

      {/* ── Dev mode toolbar ───────────────────────────────────────── */}
      {isDev && (
        <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-led shrink-0"
          style={{ background: "#111", borderBottom: "1px solid #c8102e" }}>
          <span style={{ color: "#ff6600" }}>⚙ DEV MODE</span>
          <div className="flex items-center gap-2">
            <button onClick={() => prevDate && navTo(prevDate)} disabled={!prevDate}
              className="px-2 py-0.5 rounded border disabled:opacity-30 transition-colors"
              style={{ borderColor: "#ff6600", color: "#ff6600" }}>
              ← prev
            </button>
            <span style={{ color: "#ff9944" }}>{activeDateStr}</span>
            <span style={{ color: "#ff6600" }}>·</span>
            <span style={{ color: "#ff9944" }}>{puzzle.event.split(" — ")[0]}</span>
            <button onClick={() => nextDate && navTo(nextDate)} disabled={!nextDate}
              className="px-2 py-0.5 rounded border disabled:opacity-30 transition-colors"
              style={{ borderColor: "#ff6600", color: "#ff6600" }}>
              next →
            </button>
          </div>
          <span style={{ color: "#ff6600" }}>{activeIdx + 1} / {allDates.length}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2 border-b z-20 relative shrink-0"
        style={{ background: "var(--pitch-panel)", borderColor: "var(--border-dim)" }}>
        <Image src="/logo-bolguessr.png" alt="BolGuessr" height={36} width={220}
          className="object-contain" priority />
        <div className="text-[11px] font-led tracking-[0.25em] text-label uppercase hidden sm:block">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div className="text-[11px] font-led tracking-[0.06em] text-label hidden md:block">
          How's your bol knowledge?
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>

        {/* Image pane */}
        <div className="relative min-h-[45vh] lg:flex-1 lg:min-h-0 bg-black overflow-hidden">
          {imageError ? (
            <PlaceholderImage puzzleDate={puzzle.puzzleDate} imageFile={puzzle.imageFile} />
          ) : (
            <Image src={imageSrc} alt="Identify this football moment" fill
              className="object-cover object-center" priority
              onError={() => setImageError(true)}
              sizes="(max-width: 1024px) 100vw, 60vw"
              unoptimized={puzzle.imageFile.endsWith(".avif")}
            />
          )}
          <div className="absolute inset-0 pointer-events-none z-10 pitch-vignette" />
          {/* Attribution overlay — shown when image has CC license info */}
          {puzzle.imageAttribution && (
            <div className="absolute bottom-0 right-0 z-20 px-2 py-1 max-w-xs text-right pointer-events-auto"
              style={{ background: "rgba(0,0,0,0.55)" }}>
              {puzzle.imageSourceUrl ? (
                <a href={puzzle.imageSourceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[8px] font-led leading-tight block hover:underline"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  {puzzle.imageAttribution}
                </a>
              ) : (
                <span className="text-[8px] font-led leading-tight block"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  {puzzle.imageAttribution}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:w-[500px] border-t lg:border-t-0 lg:border-l flex flex-col overflow-y-auto"
          style={{ background: "var(--pitch-dark)", borderColor: "var(--border-dim)" }}>
          <div className="p-4 flex-1">
            <ScoreboardPanel key={puzzle.puzzleDate} puzzle={puzzle} onPhaseChange={setPhase} />
          </div>

          {/* Affiliate strip */}
          <div className="border-t px-4 py-3 shrink-0"
            style={{ background: "var(--pitch-panel)", borderColor: "var(--border-dim)" }}>
            <p className="text-[9px] uppercase tracking-[0.3em] text-label font-led mb-2 text-center">
              Watch Live Football
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <AffiliateChip label="DAZN" href="#" />
              <AffiliateChip label="Sky Sports" href="#" />
              <AffiliateChip label="TNT Sports" href="#" />
            </div>
            <p className="text-[8px] text-center mt-1.5 font-led" style={{ color: "var(--text-dim)" }}>
              Affiliate links — thank you for supporting BolGuessr
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function AffiliateChip({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow"
      className="text-[10px] font-led px-3 py-1 rounded-sm border tracking-widest uppercase transition-colors"
      style={{ borderColor: "var(--border-mid)", color: "var(--text-label)" }}
      onMouseOver={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "var(--amber)"; el.style.color = "var(--amber)"; }}
      onMouseOut={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "var(--border-mid)"; el.style.color = "var(--text-label)"; }}>
      {label}
    </a>
  );
}

function PlaceholderImage({ puzzleDate, imageFile }: { puzzleDate: string; imageFile: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--pitch-panel)" }}>
      <Image src="/favicon.png" alt="" width={64} height={64} className="opacity-20" />
      <p className="font-led text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--text-dim)" }}>
        Image coming soon
      </p>
      <code className="text-[10px] font-led px-2 py-1 rounded border" style={{ color: "var(--text-label)", borderColor: "var(--border-dim)", background: "var(--pitch-inset)" }}>
        public/images/puzzles/{imageFile}
      </code>
    </div>
  );
}
