import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { ActivityTable } from "./_components/activity-table";
import type { AuditEntry } from "./_components/activity-table";
import type { AuditAction } from "@/lib/supabase/types";

export default async function ActivityPage() {
  const { orgId } = await getSession();
  const supabase = createClient();
  const admin = createAdminClient();

  type LogRow = {
    id: string;
    action: AuditAction;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    timestamp: string;
  };

  const { data: logsRaw } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, user_id, ip_address, timestamp")
    .eq("org_id", orgId)
    .order("timestamp", { ascending: false })
    .limit(500);

  const logs = (logsRaw ?? []) as LogRow[];

  // Resolve user emails for all unique user_ids in the log
  const rawUserIds = logs.map((l) => l.user_id).filter(Boolean) as string[];
  const userIds = Array.from(new Set(rawUserIds));

  let userEmailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const {
      data: { users },
    } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userEmailMap = new Map(users.map((u) => [u.id, u.email ?? u.id]));
  }

  const entries: AuditEntry[] = (logs ?? []).map((l) => ({
    id: l.id,
    action: l.action as AuditAction,
    entity_type: l.entity_type,
    entity_id: l.entity_id,
    user_id: l.user_id,
    ip_address: l.ip_address,
    timestamp: l.timestamp,
    userEmail: l.user_id ? (userEmailMap.get(l.user_id) ?? undefined) : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable audit log — all pipeline and approval actions
        </p>
      </div>

      <ActivityTable entries={entries} />
    </div>
  );
}
