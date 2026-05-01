"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopNav } from "@/components/admin/admin-top-nav";
import { AdminOverview } from "@/components/admin/admin-overview";
import { UserManagement } from "@/components/admin/user-management";
import { PlatformAnalytics } from "@/components/admin/platform-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, verify accounts, and monitor platform activity
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <motion.div
          className="relative mb-6 rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.03) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(0,254,1,0.03) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(0,254,1,0.03) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <TabsList className="grid w-full grid-cols-3 relative z-10 bg-card/50 backdrop-blur border border-border">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#00FE01] data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-[#00FE01] data-[state=active]:text-black"
            >
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#00FE01] data-[state=active]:text-black"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="overview" className="space-y-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PlatformAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
