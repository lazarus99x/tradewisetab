"use client"

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle, XCircle, Clock, KeyRound, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner";

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch combined users list from API
        const response = await fetch("/api/admin/users/list");
        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data.users) ? data.users : []);
        } else {
          console.error("Failed to fetch users");
          toast.error("Failed to load users");
          setUsers([]);
        }
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Error loading users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Auto-refresh every 5 seconds so new users appear instantly without manual refresh
    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/admin/users/list");
        if (response.ok) {
          const data = await response.json();
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } catch (e) {
        // Silent refresh — don't spam errors
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.user_id || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map filter status to actual KYC status values
    let statusMatch = filterStatus === "all";
    if (filterStatus === "approved") {
      statusMatch = (u.kyc_status || "").toLowerCase() === "verified";
    } else if (filterStatus !== "all") {
      statusMatch = (u.kyc_status || "").toLowerCase() === filterStatus.toLowerCase();
    }
    
    return matchesSearch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <div className="flex gap-2">
            {["all", "approved", "pending", "rejected"].map((status) => {
              const displayName = status === "approved" ? "Verified" : status.charAt(0).toUpperCase() + status.slice(1);
              return (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {displayName}
              </Button>
            );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">User</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Password</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Join Date</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">KYC</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6 px-4" colSpan={6}>Loading users...</td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((u) => (
                  <tr key={u.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-foreground">{u.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.user_id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{u.email || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        {revealedPasswords.has(u.user_id) ? (
                          <>
                            <span className="text-foreground">{u.password || "-"}</span>
                            <button
                              onClick={() => {
                                const next = new Set(revealedPasswords);
                                next.delete(u.user_id);
                                setRevealedPasswords(next);
                              }}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              title="Hide password"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground">{u.password ? "••••••••" : "-"}</span>
                            {u.password ? (
                              <button
                                onClick={() => {
                                  const next = new Set(revealedPasswords);
                                  next.add(u.user_id);
                                  setRevealedPasswords(next);
                                }}
                                className="p-1 rounded hover:bg-muted transition-colors"
                                title="Reveal password"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          u.kyc_status === "verified"
                            ? "bg-green-500/20 text-green-400"
                            : u.kyc_status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {u.kyc_status === "verified" 
                          ? "VERIFIED" 
                          : (u.kyc_status || "PENDING").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={async () => {
                          if (!confirm(`Send password reset email to ${u.email || u.full_name}?`)) return;
                          try {
                            const res = await fetch("/api/admin/users/reset-password", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ user_id: u.user_id }),
                            });
                            const data = await res.json();
                            if (res.ok) { toast.success(data.message || "Reset email sent!"); }
                            else { toast.error(data.error || "Failed"); }
                          } catch (err: any) { toast.error(err.message); }
                        }}
                      >
                        <KeyRound className="w-3 h-3 mr-1" />
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 px-4 text-muted-foreground" colSpan={6}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
