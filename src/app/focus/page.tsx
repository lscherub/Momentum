"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FocusTimer } from "@/components/ui/focus-timer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function FocusPage() {
  const router = useRouter();
  const defaultTime = 25 * 60; // 25 mins
  const [timeLeft, setTimeLeft] = useState(defaultTime);
  const [isActive, setIsActive] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Focus Session");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play a sound or notify in a real app
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  return (
    <div className="min-h-screen bg-black/5 dark:bg-black/50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-500 delay-100">
        <h2 className="text-sm font-medium text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Current Task</h2>
        <h1 className="text-2xl font-medium tracking-tight">{taskTitle}</h1>
      </div>

      <FocusTimer
        totalSeconds={defaultTime}
        remainingSeconds={timeLeft}
        isActive={isActive}
        onToggleTimer={() => setIsActive(!isActive)}
        className="mb-16 scale-125"
      />

      <div className="flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
        <Button variant="outline" size="lg" onClick={() => setIsActive(!isActive)} className="w-32">
          {isActive ? "Pause" : "Start"}
        </Button>
        <Button size="lg" className="w-32 gap-2 text-green-500 dark:text-green-400 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border-transparent">
          <CheckCircle2 className="w-4 h-4" />
          Complete
        </Button>
      </div>
    </div>
  );
}
