import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { CheckpointList } from "./_components/checkpoint-list";

export type CheckpointRow = {
  id: string;
  checkpoint_type: "input" | "output";
  status: "pending" | "approved" | "rejected" | "cancelled";
  quality_checks: Record<string, unknown> | null;
  record_count: number | null;
  sample_data: Record<string, unknown>[] | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  pipeline_runs: {
    id: string;
    started_at: string;
    triggered_by: string;
    pipeline_configs: { name: string } | null;
  } | null;
};

export default async function DataReviewPage() {
  const { orgId, role } = await getSession();
  const supabase = createClient();

  const { data: raw } = await supabase
    .from("review_checkpoints")
    .select(
      `id, checkpoint_type, status, quality_checks, record_count, sample_data,
       rejection_reason, reviewed_at, created_at,
       pipeline_runs ( id, started_at, triggered_by, pipeline_configs ( name ) )`
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  const checkpoints = (raw ?? []) as unknown as CheckpointRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Data Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve pipeline checkpoints before delivery
        </p>
      </div>

      <CheckpointList checkpoints={checkpoints} userRole={role} />
    </div>
  );
}
