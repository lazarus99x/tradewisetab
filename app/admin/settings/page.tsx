"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/utils/supabase/client";
import { User, Key, Bell, CheckCircle2, Loader2, Save, Eye, EyeOff, Shield } from "lucide-react";

export default function AdminSettingsPage() {
  const supabase = createClient();

  // ── Profile state ──
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [initialName, setInitialName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // ── Password state ──
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Notification preferences ──
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    tradingAlerts: true,
    kycUpdates: true,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");

  // ── Loading ──
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const name = user.user_metadata?.full_name || "";
      setFullName(name);
      setInitialName(name);
      setEmail(user.email || "");

      // Load notification settings from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("settings")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.settings?.notifications) {
        setNotifications((prev) => ({ ...prev, ...profile.settings.notifications }));
      }

      setLoading(false);
    };
    load();
  }, []);

  // ── Handlers ──

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      setProfileMessage("Failed to save");
    } else {
      setInitialName(fullName);
      setProfileMessage("Saved");
      // Sync to auth metadata
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }
    setProfileSaving(false);
    setTimeout(() => setProfileMessage(""), 3000);
  };

  const changePassword = async () => {
    setPasswordSaving(true);
    setPasswordMessage("");
    setPasswordError("");

    // Validate
    if (!oldPassword) {
      setPasswordError("Current password is required");
      setPasswordSaving(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      setPasswordSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordSaving(false);
      return;
    }

    // Verify old password by attempting re-auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });

    if (signInError) {
      setPasswordError("Current password is incorrect");
      setPasswordSaving(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setPasswordMessage("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordSaving(false);
    setTimeout(() => {
      setPasswordMessage("");
      setPasswordError("");
    }, 5000);
  };

  const savePreferences = async () => {
    setPrefsSaving(true);
    setPrefsMessage("");

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    // Get existing settings profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();

    const currentSettings = profile?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      notifications,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ settings: updatedSettings })
      .eq("user_id", userId);

    if (error) {
      setPrefsMessage("Failed to save");
    } else {
      setPrefsMessage("Saved");
    }
    setPrefsSaving(false);
    setTimeout(() => setPrefsMessage(""), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="password">
            <Key className="w-4 h-4 mr-2" /> Password
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="mt-6">
          <Card className="p-6 space-y-5">
            <div>
              <p className="text-sm font-medium mb-1">Full Name</p>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <Input value={email} disabled className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveProfile} disabled={profileSaving || fullName === initialName}>
                {profileSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
              {profileMessage && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {profileMessage}
                </span>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Password Tab ── */}
        <TabsContent value="password" className="mt-6">
          <Card className="p-6 space-y-5">
            <div>
              <p className="text-sm font-medium mb-1">Change Password</p>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your current password and a new password to update directly.
              </p>
            </div>

            <div className="relative">
              <p className="text-sm font-medium mb-1">Current Password</p>
              <Input
                type={showPasswords ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="relative">
              <p className="text-sm font-medium mb-1">New Password</p>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="relative">
              <p className="text-sm font-medium mb-1">Confirm New Password</p>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-xs text-muted-foreground"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                {showPasswords ? "Hide" : "Show"} passwords
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={changePassword} disabled={passwordSaving}>
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Update Password
              </Button>
              {passwordMessage && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {passwordMessage}
                </span>
              )}
              {passwordError && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  {passwordError}
                </span>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="preferences" className="mt-6">
          <Card className="p-6 space-y-5">
            <p className="text-sm font-medium">Notification Preferences</p>
            <div className="space-y-4">
              {[
                { label: "Email notifications", key: "email" as const },
                { label: "Push notifications", key: "push" as const },
                { label: "SMS notifications", key: "sms" as const },
                { label: "Trading alerts", key: "tradingAlerts" as const },
                { label: "KYC updates", key: "kycUpdates" as const },
              ].map(({ label, key }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={notifications[key]}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [key]: checked === true }))
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={savePreferences} disabled={prefsSaving}>
                {prefsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
              {prefsMessage && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {prefsMessage}
                </span>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}