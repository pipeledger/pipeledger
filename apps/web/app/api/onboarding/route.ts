import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const VALID_FRAMEWORKS   = ["US GAAP", "IFRS", "Local GAAP", "Other"] as const;
const VALID_RF_VALUES    = ["single_entity", "multi_entity_domestic", "multi_entity_international"] as const;
const VALID_REGULATORY   = ["public_pcaob", "private_aicpa", "pe_backed", "venture_backed", "non_audited"] as const;
const VALID_COSTING      = ["standard_cost", "fifo", "weighted_average", "not_applicable"] as const;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Guard: prevent duplicate orgs
    const { data: existing } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already in an organization" }, { status: 409 });
    }

    const body = await request.json();
    const {
      name,
      industry,
      reporting_currency,
      accounting_framework,
      accounting_framework_other,
      reporting_frameworks,
      regulatory_oversight,
      costing_method,
    } = body as Record<string, unknown>;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Organization name is too short" }, { status: 400 });
    }
    if (!accounting_framework || !VALID_FRAMEWORKS.includes(accounting_framework as never)) {
      return NextResponse.json({ error: "Invalid accounting framework" }, { status: 400 });
    }
    if (
      !Array.isArray(reporting_frameworks) ||
      reporting_frameworks.length === 0 ||
      !reporting_frameworks.every((v) => VALID_RF_VALUES.includes(v as never))
    ) {
      return NextResponse.json({ error: "Invalid reporting frameworks" }, { status: 400 });
    }
    if (!regulatory_oversight || !VALID_REGULATORY.includes(regulatory_oversight as never)) {
      return NextResponse.json({ error: "Invalid regulatory oversight" }, { status: 400 });
    }
    if (!costing_method || !VALID_COSTING.includes(costing_method as never)) {
      return NextResponse.json({ error: "Invalid costing method" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: (name as string).trim(),
        industry: typeof industry === "string" && industry ? industry : null,
        reporting_currency: typeof reporting_currency === "string" ? reporting_currency : "USD",
        accounting_framework,
        accounting_framework_other:
          accounting_framework === "Other" && typeof accounting_framework_other === "string"
            ? accounting_framework_other.trim()
            : null,
        reporting_frameworks,
        regulatory_oversight,
        costing_method,
      })
      .select("id")
      .single();

    if (orgError || !org) {
      console.error("org insert:", orgError);
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }

    const { error: memberError } = await admin
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role: "owner" });

    if (memberError) {
      console.error("member insert:", memberError);
      await admin.from("organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: "Failed to set up membership" }, { status: 500 });
    }

    return NextResponse.json({ org_id: org.id });
  } catch (err) {
    console.error("onboarding error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
