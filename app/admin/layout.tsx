"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopNav } from "@/components/admin/admin-top-nav";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auto-close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Client-side admin guard (second layer after middleware)
  useEffect(() => {
    const verifyAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/sign-in");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role?.toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);
      setChecking(false);
    };

    // Skip the guard on the admin sign-in page itself
    if (pathname === "/admin/sign-in") {
      setChecking(false);
      setIsAdmin(true);
      return;
    }

    verifyAdmin();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-[#00FE01]" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {/* Sidebar - slide in on mobile */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:block flex-shrink-0`}
      >
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-card">
          <button
            className="p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <span className="text-sm font-semibold text-foreground">TradeWiseTabs Admin</span>
        </div>
        <AdminTopNav />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

