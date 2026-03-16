import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 1
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10", className)}>
      <div
        className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  );
}
