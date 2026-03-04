import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { SettingsTabs } from "./_components/settings-tabs";
import type { OrgData, MemberData } from "./_components/settings-tabs";

export default async function SettingsPage() {
  const { orgId, userId, role } = await getSession();
  const supabase = createClient();
  const admin = createAdminClient();

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, industry, reporting_currency, accounting_standard, plan_id, billing_status, fcu_included, fiq_included"
      )
      .eq("id", orgId)
      .single(),
    supabase
      .from("org_members")
      .select("id, user_id, role, joined_at")
      .eq("org_id", orgId)
      .order("joined_at"),
  ]);

  if (!org) return null;

  // Get emails for all members via admin auth API (single call)
  const {
    data: { users: authUsers },
  } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  const userEmailMap = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));

  const memberData: MemberData[] = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: userEmailMap.get(m.user_id) ?? `user:${m.user_id.slice(0, 8)}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organization, team, and billing configuration
        </p>
      </div>

      <SettingsTabs
        org={org as OrgData}
        members={memberData}
        currentUserId={userId}
        currentUserRole={role}
      />
    </div>
  );
}
