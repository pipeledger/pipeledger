import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Handles invited users joining an existing organization.
 * Called after auth callback when `?next=/join` is present in the invite link.
 * Reads pending_org_id + pending_role from user_metadata (set by the invite API).
 */
export default async function JoinPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const meta = (user.user_metadata ?? {}) as {
    pending_org_id?: string;
    pending_role?: string;
  };

  // No pending invite — go to onboarding (create their own org)
  if (!meta.pending_org_id) redirect("/onboarding");

  // Already in an org
  const { data: existing } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect("/home");

  const admin = createAdminClient();

  // Create org membership
  await admin.from("org_members").insert({
    org_id: meta.pending_org_id,
    user_id: user.id,
    role: (meta.pending_role ?? "viewer") as UserRole,
  });

  // Clear pending invite metadata
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      pending_org_id: null,
      pending_role: null,
    },
  });

  redirect("/home");
}
