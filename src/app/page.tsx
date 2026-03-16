"use client";

import { useEffect, useState } from "react";
import { AppUser, getCurrentUser, signIn, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskCard, type Task } from "@/components/ui/task-card";
import { LogOut, Plus, Search, Sparkles } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [viewMode, setViewMode] = useState<"momentum" | "tasks">("momentum");
  
  // New task input
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadTodayTasks();
    }
  }, [user]);

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
      
    if (data) {
      setTasks(data as Task[]);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    
    // Optimistic insert
    const newTask = {
      user_id: user.id,
      title: newTaskTitle.trim(),
      priority: "Medium",
    };

    setNewTaskTitle("");
    const { data } = await supabase.from("tasks").insert([newTask]).select().single();
    if (data) {
      setTasks([data as Task, ...tasks]);
    }
  }

  async function completeTask(task: Task) {
    const { data } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", task.id)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? data as Task : t));
    }
  }

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
                <Button size="lg" className="w-full gap-2">
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
            {tasks.filter(t => !t.completed).slice(0, 3).map(task => (
              <TaskCard key={task.id} task={task} onComplete={completeTask} onStartFocus={() => {}} />
            ))}
            {tasks.filter(t => !t.completed).length === 0 && (
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
              <TaskCard key={task.id} task={task} onComplete={completeTask} />
            ))}
            {tasks.length === 0 && (
              <div className="text-center p-12 text-sm text-black/40 dark:text-white/40">
                No tasks yet. Create one above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform bg-black text-white dark:bg-white dark:text-black z-50"
        onClick={() => document.getElementById("quick-add-input")?.focus()}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
