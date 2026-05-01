"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  User,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  VerifiedIcon,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/dashboard/portfolio", label: "Portfolio", icon: BarChart3 },
    { href: "/dashboard/funding", label: "Funding", icon: Wallet },
    { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownCircle },
    { href: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpCircle },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/profile/kyc", label: "KYC", icon: VerifiedIcon },
  ];

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center gap-2">
        <Link href="/">
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
              TradeWiseTab
            </motion.span>
          </motion.div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
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
