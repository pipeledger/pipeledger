import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { UserRole } from "./types";

export interface Session {
  userId: string;
  userEmail: string;
  orgId: string;
  role: UserRole;
}

/**
 * Cached per-request session helper.
 * React cache() deduplicates calls within a single server render.
 * Redirects to /login or /onboarding if not authenticated/onboarded.
 */
export const getSession = cache(async (): Promise<Session> => {
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

  return {
    userId: user.id,
    userEmail: user.email ?? "",
    orgId: member.org_id,
    role: member.role,
  };
});
