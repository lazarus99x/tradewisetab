"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AdminSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    // Verify admin role before granting access
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .single();

    if (profileError || profile?.role?.toLowerCase() !== "admin") {
      // Sign the user back out — they are not an admin
      await supabase.auth.signOut();
      toast.error("Access denied. You do not have admin privileges.");
      setLoading(false);
      return;
    }

    toast.success("Welcome, Admin!");
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00FE01]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00FE01]/3 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md p-8 bg-card border-border relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00FE01]/10 border border-[#00FE01]/30 mb-4">
            <ShieldAlert className="w-7 h-7 text-[#00FE01]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Restricted area. Authorised personnel only.
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Admin Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="Enter admin email"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            id="admin-sign-in-btn"
            type="submit"
            className="w-full bg-[#00FE01] hover:bg-[#B4FE01] text-black font-semibold mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Verifying…
              </>
            ) : (
              "Sign In to Admin Panel"
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-xs text-muted-foreground/60">
          This login is for administrators only.
          <br />
          Regular users should use the{" "}
          <a href="/sign-in" className="text-[#00FE01] hover:underline">
            standard sign-in
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
