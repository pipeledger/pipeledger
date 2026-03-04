"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitFork,
  ClipboardCheck,
  Zap,
  Database,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/home",        label: "Home",        icon: LayoutDashboard },
  { href: "/pipelines",   label: "Pipelines",   icon: GitFork },
  { href: "/data-review", label: "Data Review", icon: ClipboardCheck },
  { href: "/connectors",  label: "Connectors",  icon: Zap },
  { href: "/schemas",     label: "Schemas",     icon: Database },
  { href: "/activity",    label: "Activity",    icon: Activity },
  { href: "/settings",    label: "Settings",    icon: Settings },
] as const;

interface SidebarNavProps {
  collapsed?: boolean;
}

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-1 px-2 py-4 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);

          const linkContent = (
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-secondary hover:text-secondary-foreground",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", active && "text-accent")}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={href}>{linkContent}</div>;
        })}
      </nav>
    </TooltipProvider>
  );
}
