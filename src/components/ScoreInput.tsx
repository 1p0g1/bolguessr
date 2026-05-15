"use client";

interface ScoreInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  correct?: boolean | null;
  correctAnswer?: number;
}

export default function ScoreInput({
  label, value, onChange, disabled, correct, correctAnswer,
}: ScoreInputProps) {
  const borderColor =
    correct === true  ? "var(--green-led)" :
    correct === false ? "var(--red-led)"   :
    "var(--border-dim)";

  const textColor =
    correct === true  ? "var(--green-led)" :
    correct === false ? "var(--red-led)"   :
    "var(--amber)";

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-[0.25em] font-led text-label">{label}</span>
      <div className="score-cell w-20 h-24 rounded-sm" style={{ borderColor }}>
        <input
          type="number"
          min={0}
          max={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-full bg-transparent text-5xl font-led font-black text-center outline-none border-none"
          style={{ color: textColor, WebkitTextFillColor: textColor }}
        />
      </div>
      {correct === false && correctAnswer !== undefined && (
        <span className="text-[10px] font-led" style={{ color: "var(--green-led)" }}>
          ✓ {correctAnswer}
        </span>
      )}
    </div>
  );
}
