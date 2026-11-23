"use client"

import { useState, useEffect } from "react"
import { Bell, User, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { useUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export function TopNav() {
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);

  // Fetch profile for avatar emoji and name
  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, avatar_emoji")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    fetchProfile();

    // Listen for profile updates
    const channel = supabase.channel("profile_updates")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: "user_id=eq." + (user.id) },
        () => fetchProfile()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleNotificationClick = () => {
    toast.info("No new notifications");
  };

  // Get display name - prefer full_name, fallback to email or "User"
  const displayName = profile?.full_name || user?.fullName || "User";

  // Choose emoji if no avatar
  const defaultEmoji = profile?.avatar_emoji || "🚀";

  return (
    <div className="border-b border-border bg-card px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">Trading</h1>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">Real-time market data and trading</p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User name + avatar - responsive */}
        <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{displayName}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center ring-2 ring-primary/20 flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{defaultEmoji}</span>
            )}
          </div>
        </Link>

        <Button variant="ghost" size="icon" onClick={handleNotificationClick} className="hidden sm:flex">
          <Bell className="w-5 h-5" />
        </Button>
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Settings className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}