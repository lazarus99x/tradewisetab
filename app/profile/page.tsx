"use client";

import { useEffect, useState, Suspense } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, kyc_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setStatus(data.kyc_status ?? null);
      } else {
        await supabase.from("profiles").insert({
          user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        });
      }
    })();
  }, [user?.id]);

  async function save() {
    if (!user?.id) return;
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, full_name: fullName, phone })
      .eq("user_id", user.id);
    alert("Saved");
  }

  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="space-y-2 max-w-md">
          <label className="block text-sm">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-background"
          />
        </div>
        <div className="space-y-2 max-w-md">
          <label className="block text-sm">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-background"
          />
        </div>
        <Button onClick={save}>Save</Button>
        <div className="text-sm text-muted-foreground">
          KYC status: {status ?? "unknown"}
        </div>
      </div>
    </Suspense>
  );
}
