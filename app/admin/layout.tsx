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
      {/* Sidebar */}
      <div
        className={`${open ? "block" : "hidden"} md:block md:w-64 flex-shrink-0`}
      >
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden p-2 border-b border-border bg-card">
          <button
            className="px-3 py-2 text-sm rounded border"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close Menu" : "Open Menu"}
          </button>
        </div>
        <AdminTopNav />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

