"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppUser, getCurrentUser, signIn, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskCard, type Task } from "@/components/ui/task-card";
import { LogOut, Plus, Sparkles, Trash2, X } from "lucide-react";
import { clearScheduledNotification, ensureNotificationPermission, resetAllScheduledNotifications, scheduleNotification } from "@/lib/notifications";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [viewMode, setViewMode] = useState<"momentum" | "tasks">("momentum");
  
  // Quick add input
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formPriority, setFormPriority] = useState<Task["priority"]>("Medium");
  const [formType, setFormType] = useState<"task" | "reminder">("task");
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState("");
  const [formPomodoroEnabled, setFormPomodoroEnabled] = useState(false);
  const [formPomodoroLength, setFormPomodoroLength] = useState("25");
  const [formKeepUntilDone, setFormKeepUntilDone] = useState(false);
  const [formNotificationEnabled, setFormNotificationEnabled] = useState(false);
  const [formNotificationInterval, setFormNotificationInterval] = useState("60");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadTodayTasks();
    }
  }, [user]);

  useEffect(() => {
    if (editingTask) {
      setFormTitle(editingTask.title);
      setFormPriority(editingTask.priority);
      setFormType(editingTask.type ?? "task");
      setFormEstimatedMinutes(editingTask.estimated_minutes ? String(editingTask.estimated_minutes) : "");
      setFormPomodoroEnabled(editingTask.pomodoro_enabled ?? false);
      setFormPomodoroLength(String(editingTask.pomodoro_length ?? 25));
      setFormKeepUntilDone(editingTask.keep_until_done ?? false);
      setFormNotificationEnabled(editingTask.notification_enabled ?? false);
      setFormNotificationInterval(String(editingTask.notification_interval ?? 60));
      setShowTaskForm(true);
    }
  }, [editingTask]);

  function getDefaultNotificationInterval() {
    if (typeof window === "undefined") return "60";
    const stored = localStorage.getItem("momentum_notification_interval") ?? "60";
    if (stored === "random") {
      const options = [60, 120, 180];
      return String(options[Math.floor(Math.random() * options.length)]);
    }
    return stored;
  }

  async function checkAuth() {
    setLoading(true);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setLoading(true);
    const loggedIn = await signIn(usernameInput.trim());
    setUser(loggedIn);
    setLoading(false);
  }

  function handleSignOut() {
    signOut();
    setUser(null);
  }

  async function loadTodayTasks() {
    if (!user) return;
    // Get start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or(`created_at.gte.${startOfToday.toISOString()},keep_until_done.eq.true`)
      .order("created_at", { ascending: false })
      .limit(10);
      
    if (error) {
      console.error("Failed to load tasks", error.message);
      return;
    }
    if (data) {
      setTasks(data as Task[]);
      resetAllScheduledNotifications();
      ensureNotificationPermission().then((permission) => {
        if (permission === "granted") {
          data.forEach((task) => {
            if (task.type === "reminder" && task.notification_enabled && task.notification_interval) {
              scheduleNotification({
                id: `task-${task.id}`,
                title: task.title,
                body: "Momentum reminder",
                intervalMinutes: task.notification_interval,
              });
            }
          });
        }
      });
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    
    const newTask = {
      user_id: user.id,
      title: newTaskTitle.trim(),
      priority: "Medium",
      type: "task",
      notification_enabled: false,
      notification_interval: null,
      estimated_minutes: null,
      pomodoro_enabled: false,
      pomodoro_length: 25,
      keep_until_done: false,
      completed: false,
    };

    setNewTaskTitle("");
    const optimisticTask: Task = {
      id: `temp-${crypto.randomUUID()}`,
      title: newTask.title,
      priority: "Medium",
      type: "task",
      notification_enabled: false,
      notification_interval: null,
      estimated_minutes: undefined,
      pomodoro_enabled: false,
      pomodoro_length: 25,
      keep_until_done: false,
      completed: false,
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [optimisticTask, ...prev]);

    const { data, error } = await supabase.from("tasks").insert([newTask]).select().single();
    if (data) {
      setTasks((prev) => [data as Task, ...prev.filter((task) => task.id !== optimisticTask.id)]);
    } else {
      setTasks((prev) => prev.filter((task) => task.id !== optimisticTask.id));
      console.error("Failed to create task", newTask.title, error?.message);
    }
  }

  async function completeTask(task: Task) {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true } : t));
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", task.id)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? data as Task : t));
    } else if (error) {
      console.error("Failed to complete task", task.id, error.message);
    }
  }

  function openNewTaskForm() {
    const defaultInterval = getDefaultNotificationInterval();
    setEditingTask(null);
    setFormTitle("");
    setFormPriority("Medium");
    setFormType("task");
    setFormEstimatedMinutes("");
    setFormPomodoroEnabled(false);
    setFormPomodoroLength("25");
    setFormKeepUntilDone(false);
    setFormNotificationEnabled(false);
    setFormNotificationInterval(defaultInterval);
    setShowTaskForm(true);
  }

  async function handleSaveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !formTitle.trim()) return;

    const payload = {
      title: formTitle.trim(),
      priority: formPriority,
      type: formType,
      notification_enabled: formType === "reminder" ? formNotificationEnabled : false,
      notification_interval: formType === "reminder" && formNotificationEnabled ? Number(formNotificationInterval || 60) : null,
      estimated_minutes: formEstimatedMinutes ? Number(formEstimatedMinutes) : null,
      pomodoro_enabled: formPomodoroEnabled,
      pomodoro_length: formPomodoroEnabled ? Number(formPomodoroLength || 25) : 25,
      keep_until_done: formKeepUntilDone,
    };

    if (editingTask) {
      const optimisticUpdate = { ...editingTask, ...payload } as Task;
      setTasks((prev) => prev.map((task) => task.id === editingTask.id ? optimisticUpdate : task));
      setShowTaskForm(false);
      setEditingTask(null);
      const { data, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", editingTask.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (data) {
        setTasks((prev) => prev.map((task) => task.id === editingTask.id ? data as Task : task));
        if (data.type === "reminder" && data.notification_enabled && data.notification_interval) {
          ensureNotificationPermission().then((permission) => {
            if (permission === "granted") {
              scheduleNotification({
                id: `task-${data.id}`,
                title: data.title,
                body: "Momentum reminder",
                intervalMinutes: data.notification_interval,
              });
            }
          });
        } else {
          clearScheduledNotification(`task-${data.id}`);
        }
      } else {
        console.error("Failed to update task", editingTask.id, error?.message);
      }
    } else {
      const optimisticTask: Task = {
        id: `temp-${crypto.randomUUID()}`,
        title: payload.title,
        priority: payload.priority,
        type: payload.type,
        notification_enabled: payload.notification_enabled,
        notification_interval: payload.notification_interval,
        estimated_minutes: payload.estimated_minutes ?? undefined,
        pomodoro_enabled: payload.pomodoro_enabled,
        pomodoro_length: payload.pomodoro_length,
        keep_until_done: payload.keep_until_done,
        completed: false,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [optimisticTask, ...prev]);
      setShowTaskForm(false);

      const { data, error } = await supabase
        .from("tasks")
        .insert([{ ...payload, user_id: user.id, completed: false }])
        .select()
        .single();
      if (data) {
        setTasks((prev) => [data as Task, ...prev.filter((task) => task.id !== optimisticTask.id)]);
        if (data.type === "reminder" && data.notification_enabled && data.notification_interval) {
          ensureNotificationPermission().then((permission) => {
            if (permission === "granted") {
              scheduleNotification({
                id: `task-${data.id}`,
                title: data.title,
                body: "Momentum reminder",
                intervalMinutes: data.notification_interval,
              });
            }
          });
        }
      } else {
        setTasks((prev) => prev.filter((task) => task.id !== optimisticTask.id));
        console.error("Failed to create task", payload.title, error?.message);
      }
    }
  }

  async function handleDeleteTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setShowTaskForm(false);
    setEditingTask(null);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      console.error("Failed to delete task", task.id, error.message);
    }
    clearScheduledNotification(`task-${task.id}`);
  }

  function startFocus(task?: Task | null) {
    if (task) {
      sessionStorage.setItem("momentum_focus_task", JSON.stringify(task));
    } else {
      sessionStorage.removeItem("momentum_focus_task");
    }
    router.push("/focus");
  }

  const openTasks = tasks.filter((task) => !task.completed);
  const suggestedTask = useMemo(() => openTasks[0], [openTasks]);

  if (loading) {
    return <div className="min-h-[80vh] flex items-center justify-center">...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <Sparkles className="w-8 h-8 mb-6 text-black/20 dark:text-white/20" />
        <h1 className="text-2xl font-semibold mb-2 tracking-tight">Welcome to Momentum</h1>
        <p className="text-black/60 dark:text-white/60 mb-8 max-w-sm">
          A calm space for your daily tasks. Enter a username to start syncing across devices.
        </p>
        <form onSubmit={handleSignIn} className="w-full max-w-xs flex flex-col gap-4">
          <Input
            placeholder="Username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="h-12 text-center text-lg"
          />
          <Button type="submit" size="lg" className="w-full">
            Start Flow
          </Button>
        </form>
      </div>
    );
  }

  const completedToday = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? completedToday / totalTasks : 0;
  
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-md mx-auto p-6 pt-12 animate-in fade-in duration-500">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {user.username}</h1>
          <p className="text-black/60 dark:text-white/60">Ready to build momentum?</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 text-black/40 dark:text-white/40" />
        </Button>
      </header>

      {/* Toggle View */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full mb-8">
        <button
          onClick={() => setViewMode("momentum")}
          className={`flex-1 text-sm font-medium rounded-full py-1.5 transition-all ${viewMode === "momentum" ? "bg-white dark:bg-black shadow-sm text-black dark:text-white" : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"}`}
        >
          Momentum
        </button>
        <button
          onClick={() => setViewMode("tasks")}
          className={`flex-1 text-sm font-medium rounded-full py-1.5 transition-all ${viewMode === "tasks" ? "bg-white dark:bg-black shadow-sm text-black dark:text-white" : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"}`}
        >
          Tasks
        </button>
      </div>

      {viewMode === "momentum" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 border-none">
            <CardHeader className="pb-4">
              <CardDescription>Today's Progress</CardDescription>
              <CardTitle className="text-4xl font-light tracking-tighter">
                {completedToday} <span className="text-lg text-black/40 dark:text-white/40">/ {totalTasks}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressBar value={progress} />
              <div className="mt-6">
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => {
                    if (suggestedTask) {
                      startFocus(suggestedTask);
                    } else {
                      openNewTaskForm();
                      setFormTitle("Take a deep breath");
                      setFormPriority("Low");
                      setFormType("reminder");
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Start Something
                </Button>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input
              placeholder="Quick add..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="bg-white/50 dark:bg-black/20"
            />
            <Button type="submit" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-black/60 dark:text-white/60 mb-2">Up Next</h3>
            {openTasks.slice(0, 3).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onStartFocus={startFocus}
                onEdit={setEditingTask}
              />
            ))}
            {openTasks.length === 0 && (
              <div className="text-center p-6 text-sm text-black/40 dark:text-white/40">
                You're all caught up!
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "tasks" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <Input
              id="quick-add-input"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="bg-white/50 dark:bg-black/20"
            />
            <Button type="submit" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onStartFocus={startFocus}
                onEdit={setEditingTask}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center p-12 text-sm text-black/40 dark:text-white/40">
                No tasks yet. Create one above.
              </div>
            )}
          </div>
        </div>
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[20px] bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{editingTask ? "Edit Task" : "New Task"}</h2>
                <p className="text-xs text-black/50 dark:text-white/50">Update details without leaving the page.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form className="space-y-5" onSubmit={handleSaveTask}>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Title</label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Task title" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Task["priority"])}
                    className="w-full h-11 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "task" | "reminder")}
                    className="w-full h-11 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
              </div>
              {formType === "reminder" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Notifications</label>
                    <button
                      type="button"
                      onClick={() => setFormNotificationEnabled(!formNotificationEnabled)}
                      className={`h-11 w-full rounded-[12px] border text-sm ${formNotificationEnabled ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}
                    >
                      {formNotificationEnabled ? "Enabled" : "Off"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Interval</label>
                    <select
                      value={formNotificationInterval}
                      onChange={(e) => setFormNotificationInterval(e.target.value)}
                      disabled={!formNotificationEnabled}
                      className="w-full h-11 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
                    >
                      <option value="60">Every hour</option>
                      <option value="120">Every 2 hours</option>
                      <option value="180">Every 3 hours</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Estimated Minutes</label>
                  <Input
                    type="number"
                    min={0}
                    value={formEstimatedMinutes}
                    onChange={(e) => setFormEstimatedMinutes(e.target.value)}
                    placeholder="Optional"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-[14px] border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium uppercase text-black/50 dark:text-white/50">Pomodoro</label>
                    <p className="text-[11px] text-black/40 dark:text-white/40">Auto-start focus timer.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormPomodoroEnabled(!formPomodoroEnabled)}
                    className={`h-11 w-24 rounded-[12px] border text-sm ${formPomodoroEnabled ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}
                  >
                    {formPomodoroEnabled ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={formPomodoroLength}
                    onChange={(e) => setFormPomodoroLength(e.target.value)}
                    disabled={!formPomodoroEnabled}
                    className="h-11 flex-1"
                  />
                  <span className="text-sm text-black/50 dark:text-white/50">minutes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="keep-until-done"
                  type="checkbox"
                  checked={formKeepUntilDone}
                  onChange={(e) => setFormKeepUntilDone(e.target.checked)}
                  className="h-4 w-4 rounded border border-black/20 dark:border-white/20"
                />
                <label htmlFor="keep-until-done" className="text-sm text-black/60 dark:text-white/60">
                  Keep until done
                </label>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" className="flex-1">{editingTask ? "Save Changes" : "Create"}</Button>
                {editingTask && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleDeleteTask(editingTask)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform bg-black text-white dark:bg-white dark:text-black z-50"
        onClick={openNewTaskForm}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
