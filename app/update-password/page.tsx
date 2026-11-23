"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        toast.error("Invalid or expired reset link. Please request a new one.");
        setTimeout(() => router.push("/reset-password"), 2000);
      }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md p-8 bg-card border-border relative z-10 text-center">
          <CheckCircle className="w-16 h-16 text-[#00FE01] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Password Updated</h1>
          <p className="text-muted-foreground mb-6">Your password has been changed successfully.</p>
          <Button
            onClick={() => router.push("/sign-in")}
            className="w-full bg-[#00FE01] hover:bg-[#B4FE01] text-black"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#00FE01]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border relative z-10">
        <div className="text-center mb-8">
          <img src="/leverfi.png" alt="TradeWiseTabs" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-muted-foreground mt-2 text-sm">Enter your new password below</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">New Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#00FE01] hover:bg-[#B4FE01] text-black" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}