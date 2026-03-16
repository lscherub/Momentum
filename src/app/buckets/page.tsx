"use client";

import { useEffect, useState } from "react";
import { AppUser, getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Coffee, Wind, Smile } from "lucide-react";

interface Bucket {
  id: string;
  name: string;
}

interface BucketItem {
  id: string;
  bucket_id: string;
  title: string;
  emoji: string;
}

export default function BucketsPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [items, setItems] = useState<Record<string, BucketItem[]>>({});
  
  useEffect(() => {
    loadData();
  }, []);

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
        iData.forEach(item => {
          if (!grouped[item.bucket_id]) grouped[item.bucket_id] = [];
          grouped[item.bucket_id].push(item);
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
    const { data } = await supabase.from("buckets").insert(defaultBuckets.map(b => ({ ...b, user_id: userId }))).select();
    if (data) {
      setBuckets(data);
      const itemsToInsert = [
        { bucket_id: data[0].id, title: "Drink water", emoji: "💧" },
        { bucket_id: data[0].id, title: "Make the bed", emoji: "🛏️" },
        { bucket_id: data[1].id, title: "Step outside", emoji: "🍃" },
        { bucket_id: data[1].id, title: "Breathe for 1 min", emoji: "🌬️" },
      ];
      const { data: iData } = await supabase.from("bucket_items").insert(itemsToInsert).select();
      if (iData) {
        const grouped: Record<string, BucketItem[]> = {};
        iData.forEach(item => {
          if (!grouped[item.bucket_id]) grouped[item.bucket_id] = [];
          grouped[item.bucket_id].push(item);
        });
        setItems(grouped);
      }
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

      <div className="space-y-8">
        {buckets.map(bucket => (
          <div key={bucket.id} className="space-y-3">
            <h3 className="font-medium px-2">{bucket.name}</h3>
            <div className="flex flex-col gap-2">
              {(items[bucket.id] || []).map(item => (
                <Card key={item.id} className="p-3 flex items-center gap-3 hover-lift cursor-pointer active:scale-[0.98]">
                  <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-lg">
                    {item.emoji}
                  </div>
                  <span className="font-medium tracking-tight text-sm">{item.title}</span>
                </Card>
              ))}
              <Button variant="ghost" className="justify-start text-black/40 dark:text-white/40 border border-dashed border-black/10 dark:border-white/10 mt-1">
                <Plus className="w-4 h-4 mr-2" /> Add action
              </Button>
            </div>
          </div>
        ))}
        
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="w-4 h-4 mr-2" /> Create New Bucket
        </Button>
      </div>
    </div>
  );
}
