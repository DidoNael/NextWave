"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SessionSecurityProvider } from "@/components/auth/SessionSecurityProvider";
import React, { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SessionSecurityProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SessionSecurityProvider>
    </div>
  );
}
