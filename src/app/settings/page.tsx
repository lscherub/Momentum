"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { AppUser, getCurrentUser, signOut } from "@/lib/auth";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [notificationInterval, setNotificationInterval] = useState("60");

  useEffect(() => {
    setMounted(true);
    getCurrentUser().then(setUser);
    if (typeof window !== "undefined") {
      setNotificationInterval(localStorage.getItem("momentum_notification_interval") ?? "60");
    }
  }, []);

  function handleIntervalChange(value: string) {
    setNotificationInterval(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("momentum_notification_interval", value);
    }
  }

  if (!mounted) return null;

  return (
    <div className="max-w-md mx-auto p-6 pt-12 animate-in fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-black/60 dark:text-white/60">
              Default reminder frequency
            </div>
            <select
              value={notificationInterval}
              onChange={(e) => handleIntervalChange(e.target.value)}
              className="w-full h-10 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
            >
              <option value="60">Every hour</option>
              <option value="120">Every 2 hours</option>
              <option value="180">Every 3 hours</option>
              <option value="random">Randomized</option>
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex-1"
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex-1"
            >
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className="flex-1"
            >
              System
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-black/60 dark:text-white/60">
              Signed in as <span className="font-semibold text-black dark:text-white">{user?.username || "Guest"}</span>
            </div>
            <Button variant="outline" className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-600 border-red-500/20" onClick={() => {
              signOut();
              window.location.href = "/";
            }}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
