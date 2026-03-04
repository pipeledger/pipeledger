"use client";

import { SidebarNav } from "@/components/features/sidebar-nav";
import { TopNav } from "@/components/features/top-nav";
import { useIsTablet } from "@/hooks/use-media-query";
import type { UserRole } from "@/lib/supabase/types";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  userInitials: string;
  orgName: string;
  role: UserRole;
}

export function DashboardShell({
  children,
  userEmail,
  userInitials,
  orgName,
}: DashboardShellProps) {
  const isTablet = useIsTablet();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col border-r border-border bg-card
          transition-all duration-200
          ${isTablet ? "w-14" : "w-60"}
        `}
      >
        {/* Logo / wordmark */}
        <div
          className={`
            flex h-14 items-center border-b border-border px-3
            ${isTablet ? "justify-center" : "gap-2 px-4"}
          `}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">PL</span>
          </div>
          {!isTablet && (
            <span className="text-sm font-semibold text-foreground tracking-tight">
              PipeLedger
              <span className="ml-1 text-accent font-normal">AI</span>
            </span>
          )}
        </div>

        <SidebarNav collapsed={isTablet} />
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopNav userEmail={userEmail} userInitials={userInitials} orgName={orgName} />
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
