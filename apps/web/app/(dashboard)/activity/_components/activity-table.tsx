"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AuditAction } from "@/lib/supabase/types";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  timestamp: string;
  userEmail?: string;
}

interface ActivityTableProps {
  entries: AuditEntry[];
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ACTION_COLOR: Partial<Record<string, string>> = {
  extraction_started: "text-status-running",
  extraction_complete: "text-status-succeeded",
  input_approved: "text-status-succeeded",
  input_rejected: "text-status-failed",
  output_approved: "text-status-succeeded",
  output_rejected: "text-status-failed",
  delivery_complete: "text-status-succeeded",
  delivery_revoked: "text-status-failed",
  pipeline_cancelled: "text-status-cancelled",
  transform_failed: "text-status-failed",
  account_suspended: "text-status-failed",
};

const COLUMNS = [
  { label: "Timestamp", width: "200px" },
  { label: "Action", width: "1fr" },
  { label: "Entity", width: "140px" },
  { label: "User", width: "180px" },
  { label: "IP", width: "120px" },
];

const GRID = `${COLUMNS.map((c) => c.width).join(" ")}`;

export function ActivityTable({ entries }: ActivityTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 15,
  });

  if (entries.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Sticky header */}
      <div
        className="grid gap-3 border-b border-border bg-muted/30 px-4 py-2.5 sticky top-0"
        style={{ gridTemplateColumns: GRID }}
      >
        {COLUMNS.map((col) => (
          <span key={col.label} className="text-xs font-medium text-muted-foreground">
            {col.label}
          </span>
        ))}
      </div>

      {/* Virtual scroll container */}
      <div
        ref={parentRef}
        style={{ height: "calc(100vh - 300px)", overflowY: "auto" }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vRow) => {
            const entry = entries[vRow.index];
            const actionColor = ACTION_COLOR[entry.action] ?? "text-foreground";

            return (
              <div
                key={entry.id}
                className="grid gap-3 items-center border-b border-border px-4 hover:bg-muted/30 text-sm"
                style={{
                  gridTemplateColumns: GRID,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vRow.size,
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTs(entry.timestamp)}
                </span>
                <span className={`text-xs font-medium truncate ${actionColor}`}>
                  {formatAction(entry.action)}
                </span>
                <span className="text-xs text-muted-foreground truncate capitalize">
                  {entry.entity_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {entry.userEmail ?? (entry.user_id ? entry.user_id.slice(0, 8) : "system")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.ip_address ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {entries.length.toLocaleString()} entries — immutable audit log
        </p>
      </div>
    </div>
  );
}
