"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/patterns/status-badge";
import type { CheckpointRow } from "../page";
import type { UserRole } from "@/lib/supabase/types";

function canApprove(role: UserRole) {
  return role === "owner" || role === "admin" || role === "approver";
}

function CheckpointTypeLabel({ type }: { type: "input" | "output" }) {
  return (
    <Badge
      variant="outline"
      className={
        type === "input"
          ? "border-blue-500/30 text-blue-600 bg-blue-500/10 dark:text-blue-400"
          : "border-purple-500/30 text-purple-600 bg-purple-500/10 dark:text-purple-400"
      }
    >
      {type === "input" ? "Input Review" : "Output Review"}
    </Badge>
  );
}

function QualityChecksSummary({
  checks,
}: {
  checks: Record<string, unknown> | null;
}) {
  if (!checks) return null;

  const passed = typeof checks.passed === "number" ? checks.passed : null;
  const failed = typeof checks.failed === "number" ? checks.failed : null;

  if (passed !== null || failed !== null) {
    return (
      <span className="text-xs text-muted-foreground">
        Quality:{" "}
        <span className="text-status-succeeded">{passed ?? 0} passed</span>
        {!!failed && (
          <span className="text-status-failed ml-1">{failed} failed</span>
        )}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">Quality checks available</span>
  );
}

function SampleDataSheet({
  open,
  onClose,
  data,
  pipelineName,
}: {
  open: boolean;
  onClose: () => void;
  data: Record<string, unknown>[] | null;
  pipelineName: string;
}) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0] ?? {}).slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Sample Data</SheetTitle>
          <SheetDescription>
            First {data.length} records from &ldquo;{pipelineName}&rdquo;
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate"
                    >
                      {String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RejectDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    onConfirm(reason.trim());
  }

  // Reset reason when dialog closes
  function handleOpenChange(open: boolean) {
    if (!open) {
      setReason("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject checkpoint</DialogTitle>
          <DialogDescription>
            This will pause the pipeline run and require a new extraction or
            transform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Rejection reason</Label>
          <Textarea
            id="reason"
            placeholder="Describe what's wrong with this data..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckpointCard({
  checkpoint,
  canAct,
}: {
  checkpoint: CheckpointRow;
  canAct: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const run = checkpoint.pipeline_runs;
  const pipelineName = run?.pipeline_configs?.name ?? "Unknown pipeline";
  const runId = run?.id?.slice(0, 8) ?? "—";

  async function handleAction(action: "approve" | "reject", rejectionReason?: string) {
    setLoading(action);
    const res = await fetch(`/api/review/${checkpoint.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejection_reason: rejectionReason }),
    });
    setLoading(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? `Failed to ${action} checkpoint`);
      return;
    }

    toast.success(action === "approve" ? "Checkpoint approved" : "Checkpoint rejected");
    setShowReject(false);
    router.refresh();
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <CheckpointTypeLabel type={checkpoint.checkpoint_type} />
            <span className="text-sm font-medium text-foreground truncate">
              {pipelineName}
            </span>
            <span className="font-mono text-xs text-muted-foreground shrink-0">
              #{runId}
            </span>
          </div>
          <div className="shrink-0">
            <StatusBadge status={checkpoint.status} />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {checkpoint.record_count !== null && (
            <span>{checkpoint.record_count.toLocaleString()} records</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(checkpoint.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <QualityChecksSummary checks={checkpoint.quality_checks} />
        </div>

        {/* Rejection reason (history) */}
        {checkpoint.rejection_reason && (
          <p className="text-xs text-status-failed bg-status-failed/5 rounded px-3 py-2 border border-status-failed/20">
            Rejection reason: {checkpoint.rejection_reason}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          {checkpoint.sample_data && checkpoint.sample_data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowSample(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview data
            </Button>
          )}
          {canAct && checkpoint.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => setShowReject(true)}
                disabled={loading !== null}
              >
                {loading === "reject" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Reject
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAction("approve")}
                disabled={loading !== null}
              >
                {loading === "approve" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      <RejectDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => handleAction("reject", reason)}
        loading={loading === "reject"}
      />

      <SampleDataSheet
        open={showSample}
        onClose={() => setShowSample(false)}
        data={checkpoint.sample_data}
        pipelineName={pipelineName}
      />
    </>
  );
}

export function CheckpointList({
  checkpoints,
  userRole,
}: {
  checkpoints: CheckpointRow[];
  userRole: UserRole;
}) {
  const pending = checkpoints.filter((c) => c.status === "pending");
  const history = checkpoints.filter((c) => c.status !== "pending");
  const actAllowed = canApprove(userRole);

  return (
    <Tabs defaultValue="pending">
      <TabsList className="mb-6">
        <TabsTrigger value="pending">
          Pending
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 font-medium leading-none">
              {pending.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">History ({history.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        {pending.length === 0 ? (
          <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-status-succeeded" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No pending reviews
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Checkpoints awaiting your approval will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((c) => (
              <CheckpointCard key={c.id} checkpoint={c} canAct={actAllowed} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        {history.length === 0 ? (
          <div className="rounded-lg border border-border bg-card flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No review history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((c) => (
              <CheckpointCard key={c.id} checkpoint={c} canAct={false} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
