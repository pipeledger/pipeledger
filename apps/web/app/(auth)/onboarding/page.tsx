import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already onboarded → go to dashboard
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (member) redirect("/home");

  return (
    <div className="w-full max-w-md">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <span className="text-sm font-bold text-primary-foreground">PL</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          PipeLedger <span className="text-accent">AI</span>
        </h1>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card p-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Set up your organization
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            This takes about 30 seconds.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[11px] font-semibold">
            1
          </span>
          <span className="text-xs font-medium text-foreground">
            Organization details
          </span>
          <div className="h-px flex-1 bg-border" />
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
            2
          </span>
          <span className="text-xs text-muted-foreground">Done</span>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
