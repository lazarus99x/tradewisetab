"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    await supabase.from("announcements").insert({ title, body, active: true });
    setTitle("");
    setBody("");
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <div className="space-y-2 max-w-xl">
        <input
          placeholder="Title"
          className="w-full border rounded px-3 py-2 bg-background"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Body"
          className="w-full border rounded px-3 py-2 bg-background"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button onClick={create}>Publish</Button>
      </div>
      <div className="space-y-3">
        {rows.map((a) => (
          <div key={a.id} className="border rounded p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {a.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
