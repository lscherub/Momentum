import * as React from "react";
import { cn } from "@/lib/utils";

interface FocusTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  isActive: boolean;
  className?: string;
  onToggleTimer?: () => void;
  onStop?: () => void;
}

export function FocusTimer({
  totalSeconds,
  remainingSeconds,
  isActive,
  className,
  onToggleTimer,
  onStop,
}: FocusTimerProps) {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percentage = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference - percentage * circumference;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col items-center justify-center relative group", className)}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="-rotate-90 transform cursor-pointer transition-transform group-hover:scale-[1.02]"
        onClick={onToggleTimer}
      >
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          className="text-black/5 dark:text-white/10"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s linear" }}
          className="text-black dark:text-white"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className="text-5xl font-light tracking-tighter">
          {formatTime(remainingSeconds)}
        </span>
        <span className="text-sm font-medium text-black/40 dark:text-white/40 mt-1 uppercase tracking-widest">
          {isActive ? "Focusing" : "Paused"}
        </span>
      </div>
    </div>
  );
}
