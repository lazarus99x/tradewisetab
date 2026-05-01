"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Bell } from "lucide-react";

export function UserAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    async function loadAnnouncements() {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      setAnnouncements(data ?? []);
    }

    loadAnnouncements();

    // Auto-dismiss announcements after 2 minutes
    const timer = setTimeout(() => {
      setAnnouncements([]);
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, []);

  const dismissAnnouncement = (id: string) => {
    setDismissedAnnouncements((prev) => new Set([...prev, id]));
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedAnnouncements.has(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => (
        <Card key={announcement.id} className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  {announcement.title}
                </h3>
                <p className="text-blue-800 text-sm">{announcement.content}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAnnouncement(announcement.id)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
