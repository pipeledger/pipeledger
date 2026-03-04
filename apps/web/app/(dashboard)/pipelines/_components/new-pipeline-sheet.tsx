"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConnectorConfig } from "@/app/(dashboard)/pipelines/page";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().max(500).optional(),
  connector_id: z.string().uuid("Select a connector"),
  delivery_type: z.enum(["mcp", "api", "parquet", "csv"]),
  schedule_type: z.enum(["manual", "daily", "hourly", "weekly"]),
});

type FormValues = z.infer<typeof schema>;

interface NewPipelineSheetProps {
  orgId: string;
  connectors: ConnectorConfig[];
}

export function NewPipelineSheet({ orgId, connectors }: NewPipelineSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: "api", schedule_type: "manual" },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.from("pipeline_configs").insert({
      org_id: orgId,
      name: values.name,
      description: values.description || null,
      connector_id: values.connector_id,
      delivery_type: values.delivery_type,
      schedule_type: values.schedule_type,
      is_active: true,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Pipeline created");
    reset();
    setOpen(false);
    router.refresh();
  }

  const hasConnectors = connectors.length > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New pipeline
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create pipeline</SheetTitle>
        </SheetHeader>

        {!hasConnectors ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            You need at least one connected ERP before creating a pipeline.{" "}
            <a href="/connectors" className="text-accent underline-offset-2 hover:underline">
              Connect an ERP →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Pipeline name</Label>
              <Input id="name" placeholder="Monthly GL Extract" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What does this pipeline extract?"
                rows={2}
                {...register("description")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Source connector</Label>
              <Select onValueChange={(v) => setValue("connector_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select connector" />
                </SelectTrigger>
                <SelectContent>
                  {connectors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{" "}
                      <span className="text-muted-foreground capitalize">
                        ({c.connector_type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.connector_id && (
                <p className="text-xs text-destructive">{errors.connector_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Delivery type</Label>
                <Select
                  defaultValue="api"
                  onValueChange={(v) =>
                    setValue("delivery_type", v as FormValues["delivery_type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">REST API</SelectItem>
                    <SelectItem value="mcp">MCP Server</SelectItem>
                    <SelectItem value="parquet">Parquet</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Schedule</Label>
                <Select
                  defaultValue="manual"
                  onValueChange={(v) =>
                    setValue("schedule_type", v as FormValues["schedule_type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create pipeline
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
