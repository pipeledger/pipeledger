export type PipelineStatus =
  | "queued"
  | "running"
  | "blocked"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CheckpointType = "input" | "output";
export type CheckpointStatus = "pending" | "approved" | "rejected";

export interface PipelineConfig {
  id: string;
  org_id: string;
  name: string;
  source_connector: string;
  schedule: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PipelineRun {
  id: string;
  config_id: string;
  status: PipelineStatus;
  started_at: string;
  completed_at: string | null;
  records_in: number | null;
  records_out: number | null;
  dagster_run_id: string | null;
}

export interface ReviewCheckpoint {
  id: string;
  run_id: string;
  checkpoint_type: CheckpointType;
  status: CheckpointStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  quality_checks: Record<string, unknown> | null;
}
