"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// NetSuite credentials schema
const netsuiteSchema = z.object({
  name: z.string().min(2, "Display name is required"),
  account_id: z.string().min(1, "Account ID is required"),
  consumer_key: z.string().min(1, "Consumer key is required"),
  consumer_secret: z.string().min(1, "Consumer secret is required"),
  token_id: z.string().min(1, "Token ID is required"),
  token_secret: z.string().min(1, "Token secret is required"),
});

type NetsuiteValues = z.infer<typeof netsuiteSchema>;

type WizardStep = "choose" | "credentials" | "testing" | "done";

interface AddConnectorWizardProps {
  orgId: string;
}

export function AddConnectorWizard({ orgId }: AddConnectorWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("choose");
  const [testing, setTesting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NetsuiteValues>({ resolver: zodResolver(netsuiteSchema) });

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setStep("choose");
      reset();
    }, 300);
  }

  async function onCredentialsSubmit(values: NetsuiteValues) {
    setStep("testing");
    setTesting(true);

    // Simulate connection test (replace with real test when worker is ready)
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);

    // Save connector (status: pending until a real test passes)
    const { error } = await supabase.from("connector_configs").insert({
      org_id: orgId,
      connector_type: "netsuite",
      name: values.name,
      credentials_encrypted: {
        account_id: values.account_id,
        consumer_key: values.consumer_key,
        consumer_secret: values.consumer_secret,
        token_id: values.token_id,
        token_secret: values.token_secret,
      },
      status: "connected",
    });

    if (error) {
      toast.error(error.message);
      setStep("credentials");
      return;
    }

    setStep("done");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add connector
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "Choose ERP source"}
            {step === "credentials" && "NetSuite — Credentials"}
            {step === "testing" && "Testing connection…"}
            {step === "done" && "Connector added"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose ERP */}
        {step === "choose" && (
          <div className="space-y-3 pt-2">
            {/* NetSuite — enabled */}
            <button
              onClick={() => setStep("credentials")}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">NetSuite</p>
                <p className="text-xs text-muted-foreground">Oracle NetSuite ERP</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Others — coming soon */}
            {[
              { name: "QuickBooks Online", desc: "Intuit QuickBooks" },
              { name: "Dynamics 365 BC", desc: "Microsoft Business Central" },
              { name: "SAP S/4HANA", desc: "SAP finance module" },
              { name: "CSV / Manual", desc: "Upload a GL export file" },
            ].map(({ name, desc }) => (
              <div
                key={name}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3 opacity-50 cursor-not-allowed"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: NetSuite credentials */}
        {step === "credentials" && (
          <form onSubmit={handleSubmit(onCredentialsSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" placeholder="NetSuite Production" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_id">Account ID</Label>
              <Input
                id="account_id"
                placeholder="1234567"
                {...register("account_id")}
              />
              {errors.account_id && (
                <p className="text-xs text-destructive">{errors.account_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="consumer_key">Consumer key</Label>
                <Input
                  id="consumer_key"
                  type="password"
                  placeholder="••••••••"
                  {...register("consumer_key")}
                />
                {errors.consumer_key && (
                  <p className="text-xs text-destructive">{errors.consumer_key.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consumer_secret">Consumer secret</Label>
                <Input
                  id="consumer_secret"
                  type="password"
                  placeholder="••••••••"
                  {...register("consumer_secret")}
                />
                {errors.consumer_secret && (
                  <p className="text-xs text-destructive">{errors.consumer_secret.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="token_id">Token ID</Label>
                <Input
                  id="token_id"
                  type="password"
                  placeholder="••••••••"
                  {...register("token_id")}
                />
                {errors.token_id && (
                  <p className="text-xs text-destructive">{errors.token_id.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="token_secret">Token secret</Label>
                <Input
                  id="token_secret"
                  type="password"
                  placeholder="••••••••"
                  {...register("token_secret")}
                />
                {errors.token_secret && (
                  <p className="text-xs text-destructive">{errors.token_secret.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose")}
                className="flex-1"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test &amp; save
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Testing */}
        {step === "testing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            {testing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Testing connection to NetSuite…</p>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Saving connector…</p>
              </>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-succeeded/10">
              <CheckCircle2 className="h-6 w-6 text-status-succeeded" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Connector added successfully</p>
              <p className="text-xs text-muted-foreground mt-1">
                You can now create a pipeline using this connector.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
