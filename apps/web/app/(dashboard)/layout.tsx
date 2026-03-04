import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/features/dashboard-shell";
import type { UserRole } from "@/lib/supabase/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberRaw } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  const member = memberRaw as { org_id: string; role: UserRole } | null;

  if (!member) redirect("/onboarding");

  const { data: orgRaw } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", member.org_id)
    .single();

  const org = orgRaw as { id: string; name: string } | null;

  if (!org) redirect("/onboarding");

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "PL";

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userInitials={initials}
      orgName={org.name}
      role={member.role}
    >
      {children}
    </DashboardShell>
  );
}
