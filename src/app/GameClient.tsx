"use client";

import Image from "next/image";
import { useState } from "react";
import { Puzzle, GamePhase } from "@/types/puzzle";
import ScoreboardPanel from "@/components/ScoreboardPanel";

interface Props {
  puzzle: Puzzle | null;
}

export default function GameClient({ puzzle }: Props) {
  const [, setPhase] = useState<GamePhase>("guessing");
  const [imageError, setImageError] = useState(false);

  if (!puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-4xl font-led led-amber">No puzzle today</div>
        <p className="font-led text-sm tracking-widest text-label">Check back tomorrow.</p>
      </div>
    );
  }

  const imageSrc = `/images/puzzles/${puzzle.imageFile}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pitch-dark)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-2 border-b z-20 relative shrink-0"
        style={{ background: "var(--pitch-panel)", borderColor: "var(--border-dim)" }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo-bolguessr.png"
            alt="BolGuessr"
            height={36}
            width={220}
            className="object-contain"
            priority
          />
        </div>
        <div className="text-[11px] font-led tracking-[0.25em] text-label uppercase hidden sm:block">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div className="text-[11px] font-led tracking-[0.06em] text-label hidden md:block">
          How's your bol knowledge?
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row" style={{ minHeight: 0 }}>
        {/* Image pane */}
        <div className="relative flex-1 min-h-[45vh] lg:min-h-0 bg-black scanlines overflow-hidden">
          {imageError ? (
            <PlaceholderImage />
          ) : (
            <Image
              src={imageSrc}
              alt="Identify this football moment"
              fill
              className="object-cover object-center"
              priority
              onError={() => setImageError(true)}
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          )}
          <div className="absolute inset-0 pointer-events-none z-10 pitch-vignette" />
        </div>

        {/* Right panel */}
        <div
          className="lg:w-[500px] border-t lg:border-t-0 lg:border-l flex flex-col overflow-y-auto"
          style={{ background: "var(--pitch-dark)", borderColor: "var(--border-dim)" }}
        >
          <div className="p-4 flex-1">
            <ScoreboardPanel puzzle={puzzle} onPhaseChange={setPhase} />
          </div>

          {/* Affiliate strip */}
          <div
            className="border-t px-4 py-3 shrink-0"
            style={{ background: "var(--pitch-panel)", borderColor: "var(--border-dim)" }}
          >
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-[10px] font-led px-3 py-1 rounded-sm border tracking-widest uppercase transition-colors"
      style={{ borderColor: "var(--border-mid)", color: "var(--text-label)" }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--amber)";
        el.style.color = "var(--amber)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--border-mid)";
        el.style.color = "var(--text-label)";
      }}
    >
      {label}
    </a>
  );
}

function PlaceholderImage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "var(--pitch-panel)" }}>
      <Image src="/favicon.png" alt="" width={80} height={80} className="opacity-30" />
      <p className="font-led text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--text-dim)" }}>
        Image coming soon
      </p>
    </div>
  );
}
