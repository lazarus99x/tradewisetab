"use client";

import { useEffect, useState, Suspense } from "react";
import { useUser, useClerk } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Mail, Phone, Shield, Key, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ProfileContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

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

  async function saveProfile() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, full_name: fullName, phone })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword() {
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Please sign in to view your profile.
      </div>
    );
  }

  const isVerified = status === "approved" || status === "verified";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <Card className="p-6 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-card to-card/50">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl">
              <User className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{fullName || "Trader"}</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                {isVerified ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> KYC Verified</>
                ) : (
                  <><AlertCircle className="w-4 h-4 text-yellow-500" /> Pending KYC</>
                )}
              </p>
            </div>
            <div className="w-full pt-4 border-t border-border mt-4">
              <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                </label>
                <input
                  type="email"
                  value={user.primaryEmailAddress?.emailAddress || ""}
                  disabled
                  className="w-full border border-border rounded-lg px-4 py-2.5 bg-muted/50 text-muted-foreground cursor-not-allowed transition-colors"
                />
                <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full border border-border rounded-lg px-4 py-2.5 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-border rounded-lg px-4 py-2.5 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={saveProfile} disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Security
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-lg px-4 py-2.5 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-lg px-4 py-2.5 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button variant="secondary" onClick={updatePassword} disabled={pwdLoading || !password} className="w-full sm:w-auto">
                  {pwdLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
