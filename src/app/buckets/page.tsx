"use client";

import { useEffect, useMemo, useState } from "react";
import { AppUser, getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pencil, X } from "lucide-react";

interface Bucket {
  id: string;
  name: string;
}

interface BucketItem {
  id: string;
  bucket_id: string;
  title: string;
  emoji: string;
  type?: "task" | "reminder";
  notification_enabled?: boolean;
  notification_interval?: number | null;
  completed_today?: boolean;
  last_completed_date?: string | null;
}

export default function BucketsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [items, setItems] = useState<Record<string, BucketItem[]>>({});
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemEmoji, setItemEmoji] = useState("💡");
  const [itemType, setItemType] = useState<"task" | "reminder">("task");
  const [itemNotificationEnabled, setItemNotificationEnabled] = useState(false);
  const [itemNotificationInterval, setItemNotificationInterval] = useState("60");
  
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (buckets.length > 0 && !activeBucketId) {
      setActiveBucketId(buckets[0].id);
    }
  }, [buckets, activeBucketId]);

  useEffect(() => {
    if (editingBucket) {
      setBucketName(editingBucket.name);
      setShowBucketForm(true);
    }
  }, [editingBucket]);

  useEffect(() => {
    if (editingItem) {
      setItemTitle(editingItem.title);
      setItemEmoji(editingItem.emoji || "💡");
      setItemType(editingItem.type ?? "task");
      setItemNotificationEnabled(editingItem.notification_enabled ?? false);
      setItemNotificationInterval(String(editingItem.notification_interval ?? 60));
    } else {
      setItemNotificationInterval(getDefaultNotificationInterval());
    }
  }, [editingItem]);

  function getDefaultNotificationInterval() {
    if (typeof window === "undefined") return "60";
    const stored = localStorage.getItem("momentum_notification_interval") ?? "60";
    if (stored === "random") {
      const options = [60, 120, 180];
      return String(options[Math.floor(Math.random() * options.length)]);
    }
    return stored;
  }

  async function loadData() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (!currentUser) return;

    // Load buckets
    const { data: bData } = await supabase.from("buckets").select("*").eq("user_id", currentUser.id);
    if (bData && bData.length > 0) {
      setBuckets(bData);
      // Load items
      const bIds = bData.map(b => b.id);
      const { data: iData } = await supabase.from("bucket_items").select("*").in("bucket_id", bIds);
      if (iData) {
        const grouped: Record<string, BucketItem[]> = {};
        const today = new Date().toISOString().split("T")[0];
        iData.forEach(item => {
          const completedToday = item.last_completed_date === today;
          const normalized = {
            ...item,
            completed_today: completedToday ? item.completed_today : false,
          } as BucketItem;
          if (!grouped[item.bucket_id]) grouped[item.bucket_id] = [];
          grouped[item.bucket_id].push(normalized);
          if (!completedToday && item.completed_today) {
            supabase.from("bucket_items").update({ completed_today: false, last_completed_date: null }).eq("id", item.id);
          }
        });
        setItems(grouped);
      }
    } else {
      // Seed default buckets
      createDefaultBuckets(currentUser.id);
    }
  }

  async function createDefaultBuckets(userId: string) {
    const defaultBuckets = [{ name: "Morning Reset" }, { name: "Mental Recovery" }];
    const { data, error } = await supabase.from("buckets").insert(defaultBuckets.map(b => ({ ...b, user_id: userId }))).select();
    if (data) {
      setBuckets(data);
      const itemsToInsert = [
        { bucket_id: data[0].id, title: "Drink water", emoji: "💧", type: "task" },
        { bucket_id: data[0].id, title: "Make the bed", emoji: "🛏️", type: "task" },
        { bucket_id: data[1].id, title: "Step outside", emoji: "🍃", type: "reminder", notification_enabled: false, notification_interval: null },
        { bucket_id: data[1].id, title: "Breathe for 1 min", emoji: "🌬️", type: "reminder", notification_enabled: false, notification_interval: null },
      ];
      const { data: iData, error: insertError } = await supabase.from("bucket_items").insert(itemsToInsert).select();
      if (iData) {
        const grouped: Record<string, BucketItem[]> = {};
        iData.forEach(item => {
          if (!grouped[item.bucket_id]) grouped[item.bucket_id] = [];
          grouped[item.bucket_id].push(item);
        });
        setItems(grouped);
      } else if (insertError) {
        console.error("Failed to seed bucket items", insertError.message);
      }
    } else if (error) {
      console.error("Failed to seed buckets", error.message);
    }
  }

  const activeItems = useMemo(() => {
    if (!activeBucketId) return [];
    return items[activeBucketId] ?? [];
  }, [activeBucketId, items]);

  async function handleCreateBucket(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !bucketName.trim()) return;

    if (editingBucket) {
      const updated = { ...editingBucket, name: bucketName.trim() };
      setBuckets((prev) => prev.map((bucket) => bucket.id === editingBucket.id ? updated : bucket));
      setShowBucketForm(false);
      setEditingBucket(null);
      const { data } = await supabase.from("buckets").update({ name: updated.name }).eq("id", updated.id).select().single();
      if (data) {
        setBuckets((prev) => prev.map((bucket) => bucket.id === updated.id ? data : bucket));
      } else {
        console.error("Failed to update bucket", updated.id);
      }
      return;
    }

    const optimisticBucket: Bucket = {
      id: `temp-${crypto.randomUUID()}`,
      name: bucketName.trim(),
    };
    setBuckets((prev) => [...prev, optimisticBucket]);
    setBucketName("");
    setShowBucketForm(false);

    const { data, error } = await supabase.from("buckets").insert([{ name: optimisticBucket.name, user_id: user.id }]).select().single();
    if (data) {
      setBuckets((prev) => prev.map((bucket) => bucket.id === optimisticBucket.id ? data : bucket));
      setActiveBucketId(data.id);
    } else {
      setBuckets((prev) => prev.filter((bucket) => bucket.id !== optimisticBucket.id));
      console.error("Failed to create bucket", optimisticBucket.name, error?.message);
    }
  }

  async function handleDeleteBucket(bucket: Bucket) {
    setBuckets((prev) => prev.filter((b) => b.id !== bucket.id));
    setItems((prev) => {
      const updated = { ...prev };
      delete updated[bucket.id];
      return updated;
    });
    if (activeBucketId === bucket.id) {
      setActiveBucketId(buckets.find((b) => b.id !== bucket.id)?.id ?? null);
    }
    const { error } = await supabase.from("buckets").delete().eq("id", bucket.id);
    if (error) {
      console.error("Failed to delete bucket", bucket.id);
    }
  }

  async function handleAddItem(event: React.FormEvent) {
    event.preventDefault();
    if (!activeBucketId || !itemTitle.trim()) return;

    if (editingItem) {
      const updated = {
        ...editingItem,
        title: itemTitle.trim(),
        emoji: itemEmoji.trim(),
        type: itemType,
        notification_enabled: itemType === "reminder" ? itemNotificationEnabled : false,
        notification_interval: itemType === "reminder" && itemNotificationEnabled ? Number(itemNotificationInterval || 60) : null,
      };
      setItems((prev) => ({
        ...prev,
        [activeBucketId]: (prev[activeBucketId] ?? []).map((item) => item.id === updated.id ? updated : item),
      }));
      setEditingItem(null);
      setItemNotificationEnabled(false);
      setItemNotificationInterval(getDefaultNotificationInterval());
      const { data, error } = await supabase.from("bucket_items")
        .update({
          title: updated.title,
          emoji: updated.emoji,
          type: updated.type,
          notification_enabled: updated.notification_enabled,
          notification_interval: updated.notification_interval,
        })
        .eq("id", updated.id)
        .select()
        .single();
      if (data) {
        setItems((prev) => ({
          ...prev,
          [activeBucketId]: (prev[activeBucketId] ?? []).map((item) => item.id === updated.id ? data : item),
        }));
      } else {
        console.error("Failed to update bucket item", updated.id, error?.message);
      }
      return;
    }

    const optimisticItem: BucketItem = {
      id: `temp-${crypto.randomUUID()}`,
      bucket_id: activeBucketId,
      title: itemTitle.trim(),
      emoji: itemEmoji.trim(),
      type: itemType,
      notification_enabled: itemType === "reminder" ? itemNotificationEnabled : false,
      notification_interval: itemType === "reminder" && itemNotificationEnabled ? Number(itemNotificationInterval || 60) : null,
      completed_today: false,
      last_completed_date: null,
    };

    setItems((prev) => ({
      ...prev,
      [activeBucketId]: [...(prev[activeBucketId] ?? []), optimisticItem],
    }));
    setItemTitle("");
    setItemEmoji("💡");
    setItemType("task");
    setItemNotificationEnabled(false);
    setItemNotificationInterval(getDefaultNotificationInterval());

    const { data, error } = await supabase
      .from("bucket_items")
      .insert([{
        bucket_id: activeBucketId,
        title: optimisticItem.title,
        emoji: optimisticItem.emoji,
        type: optimisticItem.type,
        notification_enabled: optimisticItem.notification_enabled,
        notification_interval: optimisticItem.notification_interval,
        completed_today: false,
        last_completed_date: null,
      }])
      .select()
      .single();
    if (data) {
      setItems((prev) => ({
        ...prev,
        [activeBucketId]: (prev[activeBucketId] ?? []).map((item) => item.id === optimisticItem.id ? data : item),
      }));
    } else {
      setItems((prev) => ({
        ...prev,
        [activeBucketId]: (prev[activeBucketId] ?? []).filter((item) => item.id !== optimisticItem.id),
      }));
      console.error("Failed to create bucket item", optimisticItem.title, error?.message);
    }
  }

  async function handleDeleteItem(item: BucketItem) {
    setItems((prev) => ({
      ...prev,
      [item.bucket_id]: (prev[item.bucket_id] ?? []).filter((entry) => entry.id !== item.id),
    }));
    setEditingItem(null);
    const { error } = await supabase.from("bucket_items").delete().eq("id", item.id);
    if (error) {
      console.error("Failed to delete bucket item", item.id);
    }
  }

  async function handleSetReminder(item: BucketItem) {
    if (!user) return;
    const payload = {
      user_id: user.id,
      title: item.title,
      priority: "Low",
      type: "reminder",
      keep_until_done: true,
      completed: false,
      notification_enabled: item.notification_enabled ?? false,
      notification_interval: item.notification_enabled ? item.notification_interval ?? 60 : null,
    };
    const { error } = await supabase.from("tasks").insert([payload]);
    if (error) {
      console.error("Failed to create reminder task", item.id, error.message);
    }
  }

  async function toggleCompleteItem(item: BucketItem) {
    const today = new Date().toISOString().split("T")[0];
    const shouldComplete = !(item.completed_today && item.last_completed_date === today);
    const updated = {
      ...item,
      completed_today: shouldComplete,
      last_completed_date: shouldComplete ? today : null,
    };
    setItems((prev) => ({
      ...prev,
      [item.bucket_id]: (prev[item.bucket_id] ?? []).map((entry) => entry.id === item.id ? updated : entry),
    }));
    const { data, error } = await supabase
      .from("bucket_items")
      .update({ completed_today: updated.completed_today, last_completed_date: updated.last_completed_date })
      .eq("id", item.id)
      .select()
      .single();
    if (data) {
      setItems((prev) => ({
        ...prev,
        [item.bucket_id]: (prev[item.bucket_id] ?? []).map((entry) => entry.id === item.id ? data : entry),
      }));
    } else if (error) {
      console.error("Failed to toggle bucket item", item.id, error.message);
    }
  }

  if (!user) {
    return <div className="p-6 pt-12 text-center text-sm text-black/40">Please sign in from the Home screen first.</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 pt-12 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Buckets</h1>
        <p className="text-black/60 dark:text-white/60">Tiny routines for overwhelmed moments.</p>
      </header>

      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {buckets.map((bucket) => (
            <button
              key={bucket.id}
              onClick={() => setActiveBucketId(bucket.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${activeBucketId === bucket.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60"}`}
            >
              {bucket.name}
            </button>
          ))}
          <button
            onClick={() => { setShowBucketForm(true); setEditingBucket(null); setBucketName(""); }}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
          >
            + New Bucket
          </button>
        </div>

        {activeBucketId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium px-1">{buckets.find((bucket) => bucket.id === activeBucketId)?.name}</h3>
              {activeBucketId && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditingBucket(buckets.find((bucket) => bucket.id === activeBucketId) || null)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBucket(buckets.find((bucket) => bucket.id === activeBucketId)!)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {activeItems.map(item => {
                const today = new Date().toISOString().split("T")[0];
                const isCompleted = item.completed_today && item.last_completed_date === today;
                return (
                  <Card
                    key={item.id}
                    className={`p-3 flex items-center justify-between gap-3 hover-lift transition ${isCompleted ? "bg-black/5 dark:bg-white/10" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCompleteItem(item)}
                      className="flex items-center gap-3 text-left group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition ${isCompleted ? "bg-green-500/20 text-green-500 animate-in zoom-in-95 duration-200" : "bg-black/5 dark:bg-white/10"}`}>
                        {isCompleted ? "✓" : item.emoji}
                      </div>
                      <div>
                        <span className={`font-medium tracking-tight text-sm block transition ${isCompleted ? "line-through text-black/40 dark:text-white/40" : ""}`}>{item.title}</span>
                        <span className="text-[11px] text-black/40 dark:text-white/40 uppercase">{item.type ?? "task"}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setItemTitle(item.title);
                          setItemEmoji(item.emoji || "💡");
                          setItemType(item.type ?? "task");
                          setItemNotificationEnabled(item.notification_enabled ?? false);
                          setItemNotificationInterval(String(item.notification_interval ?? getDefaultNotificationInterval()));
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              <form onSubmit={handleAddItem} className="flex flex-col gap-2 border border-dashed border-black/10 dark:border-white/10 rounded-[14px] p-3">
                <div className="flex gap-2">
                  <Input value={itemEmoji} onChange={(e) => setItemEmoji(e.target.value)} className="w-16 text-center" />
                  <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Add an action" />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as "task" | "reminder")}
                    className="h-10 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                  {itemType === "reminder" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setItemNotificationEnabled(!itemNotificationEnabled)}
                        className={`h-10 rounded-[12px] border px-3 text-sm ${itemNotificationEnabled ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"}`}
                      >
                        {itemNotificationEnabled ? "Notify" : "No Notify"}
                      </button>
                      <select
                        value={itemNotificationInterval}
                        onChange={(e) => setItemNotificationInterval(e.target.value)}
                        disabled={!itemNotificationEnabled}
                        className="h-10 rounded-[12px] border border-black/10 dark:border-white/10 bg-transparent px-3 text-sm"
                      >
                        <option value="60">1h</option>
                        <option value="120">2h</option>
                        <option value="180">3h</option>
                      </select>
                    </div>
                  )}
                  <Button type="submit" className="gap-2">
                    <Plus className="w-4 h-4" />
                    {editingItem ? "Update" : "Add"}
                  </Button>
                  {editingItem && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingItem(null);
                        setItemTitle("");
                        setItemEmoji("💡");
                        setItemType("task");
                        setItemNotificationEnabled(false);
                        setItemNotificationInterval(getDefaultNotificationInterval());
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {editingItem && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="justify-start"
                    onClick={() => handleSetReminder(editingItem)}
                  >
                    Set reminder from this action
                  </Button>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {showBucketForm && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[20px] bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingBucket ? "Edit Bucket" : "New Bucket"}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowBucketForm(false); setEditingBucket(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateBucket} className="space-y-4">
              <Input value={bucketName} onChange={(e) => setBucketName(e.target.value)} placeholder="Bucket name" />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{editingBucket ? "Save" : "Create"}</Button>
                {editingBucket && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => handleDeleteBucket(editingBucket)}
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
    </div>
  );
}
