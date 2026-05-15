"use client";

interface LedInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  // null = guessing (no state), true = correct, false = wrong
  correct?: boolean | null;
  correctAnswer?: string; // shown below input when wrong
}

export default function LedInput({
  value,
  onChange,
  placeholder = "",
  label,
  type = "text",
  min,
  max,
  disabled,
  size = "md",
  correct,
  correctAnswer,
}: LedInputProps) {
  const sizeClasses = {
    sm: "text-sm px-2 py-1 h-9",
    md: "text-base px-3 py-2 h-12",
    lg: "text-2xl px-4 py-3 h-16 tracking-widest",
  };

  const stateClass =
    correct === true  ? "field-correct" :
    correct === false ? "field-wrong"   : "";

  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] uppercase tracking-[0.25em] font-led text-label">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className={`led-input w-full rounded-sm ${sizeClasses[size]} ${stateClass}`}
      />
      {/* Correct answer hint — only shown when wrong after submit */}
      {correct === false && correctAnswer && (
        <span className="text-[10px] font-led tracking-wide" style={{ color: "var(--green-led)" }}>
          ✓ {correctAnswer}
        </span>
      )}
    </div>
  );
}
