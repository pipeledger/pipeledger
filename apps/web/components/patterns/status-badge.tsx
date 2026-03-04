import { cn } from "@/lib/utils";
import type {
  PipelineStatus,
  ConnectorStatus,
  CheckpointStatus,
  BillingStatus,
} from "@/lib/supabase/types";

type AnyStatus = PipelineStatus | ConnectorStatus | CheckpointStatus | BillingStatus | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Pipeline statuses
  queued:        { label: "Queued",        className: "bg-status-queued/15 text-status-queued border-status-queued/30" },
  extracting:    { label: "Extracting",    className: "bg-status-running/15 text-status-running border-status-running/30" },
  input_review:  { label: "Input Review",  className: "bg-status-blocked/15 text-status-blocked border-status-blocked/30" },
  transforming:  { label: "Transforming",  className: "bg-status-running/15 text-status-running border-status-running/30" },
  output_review: { label: "Output Review", className: "bg-status-blocked/15 text-status-blocked border-status-blocked/30" },
  delivering:    { label: "Delivering",    className: "bg-status-running/15 text-status-running border-status-running/30" },
  succeeded:     { label: "Succeeded",     className: "bg-status-succeeded/15 text-status-succeeded border-status-succeeded/30" },
  failed:        { label: "Failed",        className: "bg-status-failed/15 text-status-failed border-status-failed/30" },
  cancelled:     { label: "Cancelled",     className: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30" },
  // Connector statuses
  connected:     { label: "Connected",     className: "bg-status-succeeded/15 text-status-succeeded border-status-succeeded/30" },
  error:         { label: "Error",         className: "bg-status-failed/15 text-status-failed border-status-failed/30" },
  disconnected:  { label: "Disconnected",  className: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30" },
  pending:       { label: "Pending",       className: "bg-status-blocked/15 text-status-blocked border-status-blocked/30" },
  // Checkpoint statuses
  approved:      { label: "Approved",      className: "bg-status-succeeded/15 text-status-succeeded border-status-succeeded/30" },
  rejected:      { label: "Rejected",      className: "bg-status-failed/15 text-status-failed border-status-failed/30" },
  // Billing statuses
  active:        { label: "Active",        className: "bg-status-succeeded/15 text-status-succeeded border-status-succeeded/30" },
  grace_period:  { label: "Grace Period",  className: "bg-status-blocked/15 text-status-blocked border-status-blocked/30" },
  read_only:     { label: "Read Only",     className: "bg-status-blocked/15 text-status-blocked border-status-blocked/30" },
  suspended:     { label: "Suspended",     className: "bg-status-failed/15 text-status-failed border-status-failed/30" },
  terminated:    { label: "Terminated",    className: "bg-status-failed/15 text-status-failed border-status-failed/30" },
};

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
