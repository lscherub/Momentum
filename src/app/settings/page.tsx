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

  useEffect(() => {
    setMounted(true);
    getCurrentUser().then(setUser);
  }, []);

  if (!mounted) return null;

  return (
    <div className="max-w-md mx-auto p-6 pt-12 animate-in fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-6">
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
