"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FocusTimer } from "@/components/ui/focus-timer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import type { Task } from "@/components/ui/task-card";

export default function FocusPage() {
  const router = useRouter();
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const defaultTime = 25 * 60; // 25 mins
  const [totalSeconds, setTotalSeconds] = useState(defaultTime);
  const [timeLeft, setTimeLeft] = useState(defaultTime);
  const [isActive, setIsActive] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Focus Session");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  const focusLabel = useMemo(() => focusTask?.title ?? taskTitle, [focusTask, taskTitle]);

  useEffect(() => {
    const stored = sessionStorage.getItem("momentum_focus_task");
    if (stored) {
      const parsed = JSON.parse(stored) as Task;
      setFocusTask(parsed);
      setTaskTitle(parsed.title);
      const pomodoroSeconds = (parsed.pomodoro_enabled ? parsed.pomodoro_length : 25) * 60;
      setTotalSeconds(pomodoroSeconds);
      setTimeLeft(pomodoroSeconds);
      setIsActive(parsed.pomodoro_enabled ?? false);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (sessionId) {
        supabase.from("focus_sessions").update({
          end_time: new Date().toISOString(),
          duration: totalSeconds,
        }).eq("id", sessionId);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, sessionId, totalSeconds]);

  useEffect(() => {
    async function createSession() {
      if (!focusTask) return;
      const user = await getCurrentUser();
      if (!user) return;
      if (sessionId || sessionStart) return;

      const start = new Date();
      setSessionStart(start);
      const { data } = await supabase
        .from("focus_sessions")
        .insert([{ user_id: user.id, task_id: focusTask.id, start_time: start.toISOString(), duration: totalSeconds }])
        .select()
        .single();
      if (data) {
        setSessionId(data.id as string);
      }
    }
    createSession();
  }, [focusTask, sessionId, sessionStart, totalSeconds]);

  return (
    <div className="min-h-screen bg-black/5 dark:bg-black/50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-500 delay-100">
        <h2 className="text-sm font-medium text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Current Task</h2>
        <h1 className="text-2xl font-medium tracking-tight">{focusLabel}</h1>
      </div>

      <FocusTimer
        totalSeconds={totalSeconds}
        remainingSeconds={timeLeft}
        isActive={isActive}
        onToggleTimer={() => setIsActive(!isActive)}
        className="mb-16 scale-125"
      />

      <div className="flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
        <Button variant="outline" size="lg" onClick={() => setIsActive(!isActive)} className="w-32">
          {isActive ? "Pause" : "Start"}
        </Button>
        <Button
          size="lg"
          className="w-32 gap-2 text-green-500 dark:text-green-400 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border-transparent"
          onClick={async () => {
            if (focusTask) {
              await supabase
                .from("tasks")
                .update({ completed: true })
                .eq("id", focusTask.id);
            }
            if (sessionId) {
              await supabase.from("focus_sessions").update({
                end_time: new Date().toISOString(),
                duration: totalSeconds - timeLeft,
              }).eq("id", sessionId);
            }
            router.push("/");
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Complete
        </Button>
      </div>
    </div>
  );
}
