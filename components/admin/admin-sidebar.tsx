"use client";

import Link from "next/link";
import { BarChart3, Users, Settings, LogOut, Shield, ArrowDownCircle, ArrowUpCircle, TrendingUp, Building2, DollarSign, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk } from "@/lib/auth";

export function AdminSidebar() {
  const { signOut } = useClerk();
  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/kyc", label: "KYC Management", icon: FileCheck },
    { href: "/admin/funding", label: "Funding", icon: BarChart3 },
    {
      href: "/admin/fund-management",
      label: "Fund Management",
      icon: Settings,
    },
    { href: "/admin/deposits", label: "Deposits", icon: ArrowDownCircle },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
    { href: "/admin/trades", label: "Trades", icon: TrendingUp },
    { href: "/admin/announcements", label: "Announcements", icon: Settings },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Logo */}

      <div className="p-6 border-b border-border flex items-center gap-2">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.img
              src="/leverfi.png"
              alt="TradeWiseTab Logo"
              className="w-full h-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
          </motion.div>
          <motion.span
            className="text-xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/"> TradeWiseTab </Link>
          </motion.span>
        </motion.div>
      </div>
      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => signOut(() => { window.location.href = "/"; })}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
