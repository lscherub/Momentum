import * as React from "react";
import { cn } from "@/lib/utils";
import { Timer, CheckCircle2 } from "lucide-react";
import { Card } from "./card";
import { Button } from "./button";

export interface Task {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  estimated_minutes?: number;
  pomodoro_enabled: boolean;
  pomodoro_length: number;
  keep_until_done: boolean;
  completed: boolean;
  created_at: string;
}

interface TaskCardProps {
  task: Task;
  onStartFocus?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onStartFocus, onComplete, className }: TaskCardProps) {
  const priorityColors = {
    High: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    Medium: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    Low: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
  };

  return (
    <Card className={cn("group flex items-center justify-between p-4 hover-lift", className)}>
      <div className="flex flex-col gap-1.5">
        <h4 className={cn("font-medium transition-colors", task.completed && "line-through text-black/40 dark:text-white/40")}>
          {task.title}
        </h4>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("px-2 py-0.5 rounded-full font-medium", priorityColors[task.priority])}>
            {task.priority}
          </span>
          {task.estimated_minutes && (
            <span className="flex items-center gap-1 text-black/50 dark:text-white/50">
              <Timer className="w-3 h-3" />
              {task.estimated_minutes}m
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {!task.completed && onStartFocus && (
          <Button variant="outline" size="sm" onClick={() => onStartFocus(task)}>
            Focus
          </Button>
        )}
        {!task.completed && onComplete && (
          <Button variant="ghost" size="icon" onClick={() => onComplete(task)} className="text-black/40 hover:text-green-600 dark:text-white/40 dark:hover:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
