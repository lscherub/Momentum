"use client";

import { useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_PROMPT_KEY = "momentum_install_prompt_dismissed";

export function PwaClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.error("Service worker registration failed", error));
    }

    const handler = (event: Event) => {
      event.preventDefault();
      const dismissed = localStorage.getItem(INSTALL_PROMPT_KEY);
      if (dismissed === "true") return;

      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.prompt();
      installEvent.userChoice.then((choice) => {
        if (choice.outcome === "dismissed") {
          localStorage.setItem(INSTALL_PROMPT_KEY, "true");
        }
      });
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}