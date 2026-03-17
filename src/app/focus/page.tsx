"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FocusTimer } from "@/components/ui/focus-timer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import type { Task } from "@/components/ui/task-card";
import { clearOneTimeNotification, ensureNotificationPermission, scheduleOneTimeNotification } from "@/lib/notifications";

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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("Custom Focus Session");
  const [customHours, setCustomHours] = useState("0");
  const [customMinutes, setCustomMinutes] = useState("25");
  const [customSeconds, setCustomSeconds] = useState("0");
  const [sessionKind, setSessionKind] = useState<"task" | "custom" | null>(null);
  const [notificationScheduledAt, setNotificationScheduledAt] = useState<number | null>(null);

  const focusLabel = useMemo(() => focusTask?.title ?? taskTitle, [focusTask, taskTitle]);

  useEffect(() => {
    const storedTask = sessionStorage.getItem("momentum_focus_task");
    const storedCustom = sessionStorage.getItem("momentum_focus_custom");
    if (storedTask) {
      const parsed = JSON.parse(storedTask) as Task;
      setFocusTask(parsed);
      setTaskTitle(parsed.title);
      const pomodoroSeconds = (parsed.pomodoro_enabled ? parsed.pomodoro_length : 25) * 60;
      setTotalSeconds(pomodoroSeconds);
      setTimeLeft(pomodoroSeconds);
      setIsActive(parsed.pomodoro_enabled ?? false);
      setSessionKind("task");
      return;
    }
    if (storedCustom) {
      const parsed = JSON.parse(storedCustom) as { title: string; durationSeconds: number };
      setFocusTask(null);
      setTaskTitle(parsed.title || "Custom Focus Session");
      setTotalSeconds(parsed.durationSeconds);
      setTimeLeft(parsed.durationSeconds);
      setIsActive(true);
      setSessionKind("custom");
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
      clearOneTimeNotification("focus-session");
      if (sessionId) {
        supabase.from("focus_sessions").update({
          end_time: new Date().toISOString(),
          duration: totalSeconds,
        }).eq("id", sessionId);
      }
      sessionStorage.removeItem("momentum_focus_task");
      sessionStorage.removeItem("momentum_focus_custom");
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

  useEffect(() => {
    const storedKind = sessionKind ?? (focusTask ? "task" : null);
    if (!storedKind) return;
    if (!isActive || timeLeft <= 0) {
      clearOneTimeNotification("focus-session");
      setNotificationScheduledAt(null);
      return;
    }

    if (notificationScheduledAt !== null) return;
    setNotificationScheduledAt(Date.now());
    ensureNotificationPermission().then((permission) => {
      if (permission === "granted") {
        scheduleOneTimeNotification({
          id: "focus-session",
          title: "Focus session complete",
          body: focusLabel,
          delayMs: timeLeft * 1000,
        });
      }
    });
  }, [focusLabel, focusTask, isActive, notificationScheduledAt, sessionKind, timeLeft]);

  const resetFocusState = () => {
    setFocusTask(null);
    setTaskTitle("Focus Session");
    setTotalSeconds(defaultTime);
    setTimeLeft(defaultTime);
    setIsActive(false);
    setSessionId(null);
    setSessionStart(null);
    setSessionKind(null);
    setNotificationScheduledAt(null);
    sessionStorage.removeItem("momentum_focus_task");
    sessionStorage.removeItem("momentum_focus_custom");
    clearOneTimeNotification("focus-session");
  };

  const startCustomSession = () => {
    const hours = Math.max(0, Number(customHours || 0));
    const minutes = Math.max(0, Number(customMinutes || 0));
    const seconds = Math.max(0, Number(customSeconds || 0));
    const durationSeconds = hours * 3600 + minutes * 60 + seconds;
    if (!durationSeconds) return;

    const title = customTitle.trim() || "Custom Focus Session";
    sessionStorage.setItem("momentum_focus_custom", JSON.stringify({
      title,
      durationSeconds,
    }));
    sessionStorage.removeItem("momentum_focus_task");
    clearOneTimeNotification("focus-session");

    setFocusTask(null);
    setTaskTitle(title);
    setTotalSeconds(durationSeconds);
    setTimeLeft(durationSeconds);
    setIsActive(true);
    setSessionId(null);
    setSessionStart(null);
    setSessionKind("custom");
    setNotificationScheduledAt(null);
    setShowCustomModal(false);
  };

  return (
    <div className="min-h-screen bg-black/5 dark:bg-black/50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCustomModal(true)}
          className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          <Plus className="w-5 h-5" />
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
            resetFocusState();
            router.push("/");
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          Complete
        </Button>
      </div>
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[20px] bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Custom Focus</h2>
                <p className="text-xs text-black/50 dark:text-white/50">Start a focus session without a task.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCustomModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Title (optional)</label>
                <Input
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="Custom Focus Session"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={customHours}
                    onChange={(event) => setCustomHours(event.target.value)}
                    className="h-11"
                    placeholder="Hours"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={customMinutes}
                    onChange={(event) => setCustomMinutes(event.target.value)}
                    className="h-11"
                    placeholder="Minutes"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={customSeconds}
                    onChange={(event) => setCustomSeconds(event.target.value)}
                    className="h-11"
                    placeholder="Seconds"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="button" className="flex-1" onClick={startCustomSession}>
                  Start Focus
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCustomModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
