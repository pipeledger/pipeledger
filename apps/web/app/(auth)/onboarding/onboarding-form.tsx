"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    industry: z.string().optional(),
    reporting_currency: z.string().default("USD"),
    accounting_framework: z.enum(["US GAAP", "IFRS", "Local GAAP", "Other"], {
      required_error: "Select an accounting framework",
    }),
    accounting_framework_other: z.string().optional(),
    reporting_frameworks: z
      .array(z.enum(["single_entity", "multi_entity_domestic", "multi_entity_international"]))
      .min(1, "Select at least one option"),
    regulatory_oversight: z.enum(
      ["public_pcaob", "private_aicpa", "pe_backed", "venture_backed", "non_audited"],
      { required_error: "Select a regulatory oversight type" }
    ),
    costing_method: z.enum(
      ["standard_cost", "fifo", "weighted_average", "not_applicable"],
      { required_error: "Select a costing method" }
    ),
  })
  .refine(
    (d) =>
      d.accounting_framework !== "Other" ||
      (d.accounting_framework_other?.trim().length ?? 0) > 0,
    {
      message: "Please specify your framework",
      path: ["accounting_framework_other"],
    }
  );

type FormValues = z.infer<typeof schema>;

// ─── Static options ────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Financial Services", "Technology", "Healthcare", "Manufacturing",
  "Retail & E-commerce", "Real Estate", "Professional Services",
  "Media & Entertainment", "Education", "Non-profit", "Other",
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "JPY", label: "JPY — Japanese Yen" },
];

const REPORTING_FRAMEWORK_OPTIONS = [
  { value: "single_entity",              label: "Single-entity reporting only" },
  { value: "multi_entity_domestic",      label: "Multi-entity domestic" },
  { value: "multi_entity_international", label: "Multi-entity international" },
] as const;

const REGULATORY_OPTIONS = [
  { value: "public_pcaob",  label: "Public company (PCAOB audited)" },
  { value: "private_aicpa", label: "Private (AICPA)" },
  { value: "pe_backed",     label: "PE-backed" },
  { value: "venture_backed",label: "Venture-backed" },
  { value: "non_audited",   label: "Non-audited" },
];

const COSTING_OPTIONS = [
  { value: "standard_cost",    label: "Standard cost" },
  { value: "fifo",             label: "FIFO" },
  { value: "weighted_average", label: "Weighted average" },
  { value: "not_applicable",   label: "Not applicable" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingForm() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reporting_currency: "USD", reporting_frameworks: [] },
  });

  const accountingFramework = useWatch({ control, name: "accounting_framework" });

  function toggleReportingFramework(
    value: "single_entity" | "multi_entity_domestic" | "multi_entity_international",
    checked: boolean
  ) {
    const current = getValues("reporting_frameworks") ?? [];
    setValue(
      "reporting_frameworks",
      checked ? [...current, value] : current.filter((v) => v !== value),
      { shouldValidate: true }
    );
  }

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to create organization");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/home"), 1200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-succeeded/10">
          <CheckCircle2 className="h-6 w-6 text-status-succeeded" />
        </div>
        <p className="text-sm font-medium text-foreground">Organization created!</p>
        <p className="text-xs text-muted-foreground">Taking you to your dashboard…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

      {/* ── Organization ──────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Organization
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="name">
            Organization name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" autoFocus {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>
              Industry{" "}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Select onValueChange={(v) => setValue("industry", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Reporting currency <span className="text-destructive">*</span>
            </Label>
            <Select defaultValue="USD" onValueChange={(v) => setValue("reporting_currency", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Accounting & Reporting ─────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Accounting &amp; Reporting
        </p>

        {/* Accounting Framework */}
        <div className="space-y-1.5">
          <Label>
            Accounting framework <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(v) =>
              setValue("accounting_framework", v as FormValues["accounting_framework"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US GAAP">US GAAP</SelectItem>
              <SelectItem value="IFRS">IFRS</SelectItem>
              <SelectItem value="Local GAAP">Local GAAP</SelectItem>
              <SelectItem value="Other">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
          {errors.accounting_framework && (
            <p className="text-xs text-destructive">{errors.accounting_framework.message}</p>
          )}
        </div>

        {accountingFramework === "Other" && (
          <div className="space-y-1.5">
            <Label htmlFor="af-other">
              Specify framework <span className="text-destructive">*</span>
            </Label>
            <Input
              id="af-other"
              placeholder="e.g. Swiss CO 2020"
              {...register("accounting_framework_other")}
            />
            {errors.accounting_framework_other && (
              <p className="text-xs text-destructive">
                {errors.accounting_framework_other.message}
              </p>
            )}
          </div>
        )}

        {/* Reporting Frameworks — entity structure */}
        <div className="space-y-2">
          <Label>
            Reporting frameworks <span className="text-destructive">*</span>
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (select all that apply)
            </span>
          </Label>
          <div className="space-y-2">
            {REPORTING_FRAMEWORK_OPTIONS.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`rf-${value}`}
                  onCheckedChange={(checked) =>
                    toggleReportingFramework(value, checked === true)
                  }
                />
                <Label
                  htmlFor={`rf-${value}`}
                  className="text-sm font-normal leading-none cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
          {errors.reporting_frameworks && (
            <p className="text-xs text-destructive">{errors.reporting_frameworks.message}</p>
          )}
        </div>
      </section>

      {/* ── Oversight & Costing ────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Oversight &amp; Costing
        </p>

        <div className="space-y-1.5">
          <Label>
            Regulatory oversight <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(v) =>
              setValue("regulatory_oversight", v as FormValues["regulatory_oversight"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select oversight" />
            </SelectTrigger>
            <SelectContent>
              {REGULATORY_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.regulatory_oversight && (
            <p className="text-xs text-destructive">{errors.regulatory_oversight.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>
            Costing method <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(v) =>
              setValue("costing_method", v as FormValues["costing_method"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {COSTING_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.costing_method && (
            <p className="text-xs text-destructive">{errors.costing_method.message}</p>
          )}
        </div>
      </section>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating organization…
          </>
        ) : (
          <>
            <Building2 className="mr-2 h-4 w-4" />
            Create organization
          </>
        )}
      </Button>
    </form>
  );
}
