"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/patterns/status-badge";
import type { UserRole, PlanTier, BillingStatus } from "@/lib/supabase/types";

export interface OrgData {
  id: string;
  name: string;
  industry: string | null;
  reporting_currency: string;
  accounting_standard: "GAAP" | "IFRS" | null;
  plan_id: PlanTier;
  billing_status: BillingStatus;
  fcu_included: number;
  fiq_included: number;
}

export interface MemberData {
  id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  email: string;
}

interface SettingsTabsProps {
  org: OrgData;
  members: MemberData[];
  currentUserId: string;
  currentUserRole: UserRole;
}

// ─── General tab ────────────────────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  industry: z.string().optional(),
  reporting_currency: z.string(),
  accounting_standard: z.enum(["GAAP", "IFRS", ""]).optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

function GeneralTab({ org }: { org: OrgData }) {
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: org.name,
      industry: org.industry ?? "",
      reporting_currency: org.reporting_currency,
      accounting_standard: org.accounting_standard ?? "",
    },
  });

  async function onSubmit(values: OrgFormValues) {
    const { error } = await supabase
      .from("organizations")
      .update({
        name: values.name,
        industry: values.industry || null,
        reporting_currency: values.reporting_currency,
        accounting_standard:
          values.accounting_standard === "GAAP" || values.accounting_standard === "IFRS"
            ? values.accounting_standard
            : null,
      })
      .eq("id", org.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Organization updated");
    router.refresh();
  }

  const PLAN_LABELS: Record<PlanTier, string> = {
    premium: "Premium",
    pro: "Pro",
    enterprise: "Enterprise",
    custom: "Custom",
  };

  return (
    <div className="space-y-8">
      {/* Org details form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry">
            Industry{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input id="industry" placeholder="Financial Services" {...register("industry")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Reporting currency</Label>
            <Select
              defaultValue={org.reporting_currency}
              onValueChange={(v) => setValue("reporting_currency", v, { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "CHF", "JPY"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Accounting standard</Label>
            <Select
              defaultValue={org.accounting_standard ?? ""}
              onValueChange={(v) =>
                setValue("accounting_standard", v as "GAAP" | "IFRS" | "", { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GAAP">GAAP</SelectItem>
                <SelectItem value="IFRS">IFRS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>

      {/* Plan info (read-only) */}
      <div className="border-t border-border pt-6 space-y-3 max-w-lg">
        <p className="text-sm font-medium text-foreground">Plan &amp; billing</p>
        <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium text-foreground">{PLAN_LABELS[org.plan_id]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Billing status</span>
            <StatusBadge status={org.billing_status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">FCUs included</span>
            <span className="font-medium text-foreground">
              {org.fcu_included.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">FIQs included</span>
            <span className="font-medium text-foreground">
              {org.fiq_included.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          To change your plan or billing details, contact{" "}
          <a href="mailto:billing@pipeledger.ai" className="text-accent hover:underline">
            billing@pipeledger.ai
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Team tab ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  approver: "Approver",
  operator: "Operator",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Full access, billing, account management",
  admin: "Full access except billing",
  approver: "Can approve/reject review checkpoints",
  operator: "Can trigger pipelines and view data",
  viewer: "Read-only access",
};

function TeamTab({
  members,
  currentUserId,
  currentUserRole,
}: {
  orgId?: string;
  members: MemberData[];
  currentUserId: string;
  currentUserRole: UserRole;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [inviting, setInviting] = useState(false);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleInvite() {
    if (!inviteEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setInviting(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    setInviting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to send invite");
      return;
    }

    toast.success(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    router.refresh();
  }

  async function handleRoleChange(memberId: string, newRole: UserRole) {
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Role updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Invite row */}
      {canManage && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label>Role</Label>
            <Select
              defaultValue="viewer"
              onValueChange={(v) => setInviteRole(v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["admin", "approver", "operator", "viewer"] as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={inviting} className="shrink-0">
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span className="ml-2">Invite</span>
          </Button>
        </div>
      )}

      {/* Members table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                User
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                Joined
              </th>
              {canManage && (
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {member.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{member.email}</p>
                      {member.user_id === currentUserId && (
                        <p className="text-xs text-muted-foreground">You</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canManage && member.user_id !== currentUserId && member.role !== "owner" ? (
                    <Select
                      defaultValue={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["admin", "approver", "operator", "viewer"] as UserRole[]).map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      <p className="text-sm text-foreground">{ROLE_LABELS[member.role]}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[member.role]}
                      </p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  {new Date(member.joined_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {member.user_id !== currentUserId && member.role !== "owner" && (
                      <div className="flex justify-end">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function SettingsTabs({
  org,
  members,
  currentUserId,
  currentUserRole,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="mb-6">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="team">Team ({members.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralTab org={org} />
      </TabsContent>

      <TabsContent value="team">
        <TeamTab
          orgId={org.id}
          members={members}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </TabsContent>
    </Tabs>
  );
}
