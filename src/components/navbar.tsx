"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Timer, LayoutList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Buckets", href: "/buckets", icon: LayoutList },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-[24px] bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/5 transition-all">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-14 rounded-[18px] transition-all duration-200 active:scale-95",
              isActive
                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                : "text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
            )}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
