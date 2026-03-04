import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { AuditAction } from "@/lib/supabase/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch checkpoint — RLS ensures it's in the user's org
    const { data: cpRaw } = await supabase
      .from("review_checkpoints")
      .select("id, status, org_id, checkpoint_type, pipeline_run_id")
      .eq("id", params.id)
      .single();

    const cp = cpRaw as {
      id: string;
      status: string;
      org_id: string;
      checkpoint_type: "input" | "output";
      pipeline_run_id: string;
    } | null;

    if (!cp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (cp.status !== "pending") {
      return NextResponse.json(
        { error: "Checkpoint is no longer pending" },
        { status: 409 }
      );
    }

    // Verify approver+ role
    const { data: memberRaw } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", cp.org_id)
      .eq("user_id", user.id)
      .single();

    const member = memberRaw as { role: string } | null;

    if (!member || !["owner", "admin", "approver"].includes(member.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { action, rejection_reason } = body as {
      action: "approve" | "reject";
      rejection_reason?: string;
    };

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (action === "reject" && !rejection_reason?.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Update checkpoint
    const { error: updateError } = await admin
      .from("review_checkpoints")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: user.id,
        reviewed_at: now,
        ...(action === "reject" && {
          rejection_reason: rejection_reason!.trim(),
        }),
      })
      .eq("id", cp.id);

    if (updateError) {
      console.error("checkpoint update:", updateError);
      return NextResponse.json(
        { error: "Failed to update checkpoint" },
        { status: 500 }
      );
    }

    // Write audit log
    const auditAction: AuditAction =
      cp.checkpoint_type === "input"
        ? action === "approve"
          ? "input_approved"
          : "input_rejected"
        : action === "approve"
          ? "output_approved"
          : "output_rejected";

    await admin.from("audit_logs").insert({
      org_id: cp.org_id,
      user_id: user.id,
      action: auditAction,
      pipeline_run_id: cp.pipeline_run_id,
      details: {
        checkpoint_id: cp.id,
        ...(action === "reject" && { rejection_reason: rejection_reason!.trim() }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("review route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
