/**
 * Supabase database type definitions.
 * Replace with auto-generated types once schema is stable:
 *   npx supabase gen types typescript --project-id gvzcqmyvdzbjwoiisbhr > lib/supabase/types.ts
 */

export type UserRole = "owner" | "admin" | "approver" | "operator" | "viewer";

export type PipelineStatus =
  | "queued"
  | "extracting"
  | "input_review"
  | "transforming"
  | "output_review"
  | "delivering"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CheckpointType = "input" | "output";
export type CheckpointStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ErpType =
  | "netsuite"
  | "dynamics365"
  | "sap"
  | "coupa"
  | "csv"
  | "pigment"
  | "adaptive"
  | "anaplan";

export type ConnectorStatus = "connected" | "error" | "disconnected" | "pending";

export type PlanTier = "premium" | "pro" | "enterprise" | "custom";
export type BillingStatus = "active" | "grace_period" | "read_only" | "suspended" | "terminated";

export type TriggerType = "schedule" | "manual" | "webhook";
export type ScheduleType = "manual" | "daily" | "hourly" | "weekly" | "cron";
export type DeliveryType = "mcp" | "api" | "parquet" | "csv";

export type AuditAction =
  | "extraction_started"
  | "extraction_complete"
  | "input_approved"
  | "input_rejected"
  | "transform_started"
  | "transform_complete"
  | "transform_failed"
  | "output_approved"
  | "output_rejected"
  | "delivery_started"
  | "delivery_complete"
  | "delivery_revoked"
  | "pipeline_cancelled"
  | "export_version_created"
  | "export_version_retracted"
  | "export_version_expired"
  | "export_version_purged"
  | "mcp_query"
  | "api_query"
  | "schema_updated"
  | "security_rule_changed"
  | "document_uploaded"
  | "user_invited"
  | "api_key_created"
  | "api_key_revoked"
  | "plan_upgraded"
  | "plan_downgraded"
  | "usage_overage_billed"
  | "payment_failed"
  | "payment_succeeded"
  | "billing_grace_period"
  | "account_read_only"
  | "account_suspended"
  | "account_terminated";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          reporting_currency: string;
          fiscal_year_end: string | null;
          accounting_standard: "GAAP" | "IFRS" | null;
          default_delivery_format: string;
          plan_id: PlanTier;
          chargebee_customer_id: string | null;
          chargebee_subscription_id: string | null;
          fcu_included: number;
          fiq_included: number;
          billing_status: BillingStatus;
          billing_status_changed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          industry?: string | null;
          reporting_currency?: string;
          fiscal_year_end?: string | null;
          accounting_standard?: "GAAP" | "IFRS" | null;
          default_delivery_format?: string;
          plan_id?: PlanTier;
          chargebee_customer_id?: string | null;
          chargebee_subscription_id?: string | null;
          fcu_included?: number;
          fiq_included?: number;
          billing_status?: BillingStatus;
          billing_status_changed_at?: string | null;
        };
        Update: {
          name?: string;
          industry?: string | null;
          reporting_currency?: string;
          fiscal_year_end?: string | null;
          accounting_standard?: "GAAP" | "IFRS" | null;
          default_delivery_format?: string;
          plan_id?: PlanTier;
          chargebee_customer_id?: string | null;
          chargebee_subscription_id?: string | null;
          fcu_included?: number;
          fiq_included?: number;
          billing_status?: BillingStatus;
          billing_status_changed_at?: string | null;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: UserRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          org_id: string;
          user_id: string;
          role?: UserRole;
          invited_by?: string | null;
        };
        Update: { role?: UserRole };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          org_id: string;
          key_hash: string;
          label: string;
          access_level: UserRole;
          created_by: string;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          org_id: string;
          key_hash: string;
          label: string;
          access_level?: UserRole;
          created_by: string;
          revoked_at?: string | null;
        };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      connector_configs: {
        Row: {
          id: string;
          org_id: string;
          connector_type: ErpType;
          name: string;
          credentials_encrypted: Record<string, unknown>;
          data_scope: Record<string, unknown> | null;
          last_sync_at: string | null;
          status: ConnectorStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          connector_type: ErpType;
          name: string;
          credentials_encrypted?: Record<string, unknown>;
          data_scope?: Record<string, unknown> | null;
          last_sync_at?: string | null;
          status?: ConnectorStatus;
        };
        Update: {
          org_id?: string;
          connector_type?: ErpType;
          name?: string;
          credentials_encrypted?: Record<string, unknown>;
          data_scope?: Record<string, unknown> | null;
          last_sync_at?: string | null;
          status?: ConnectorStatus;
        };
        Relationships: [];
      };
      pipeline_configs: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          connector_id: string;
          delivery_type: DeliveryType;
          delivery_config: Record<string, unknown> | null;
          schedule_type: ScheduleType;
          schedule_config: Record<string, unknown> | null;
          is_active: boolean;
          budget_connector_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          name: string;
          description?: string | null;
          connector_id: string;
          delivery_type?: DeliveryType;
          delivery_config?: Record<string, unknown> | null;
          schedule_type?: ScheduleType;
          schedule_config?: Record<string, unknown> | null;
          is_active?: boolean;
          budget_connector_id?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          connector_id?: string;
          delivery_type?: DeliveryType;
          delivery_config?: Record<string, unknown> | null;
          schedule_type?: ScheduleType;
          schedule_config?: Record<string, unknown> | null;
          is_active?: boolean;
          budget_connector_id?: string | null;
        };
        Relationships: [];
      };
      pipeline_runs: {
        Row: {
          id: string;
          org_id: string;
          pipeline_id: string;
          status: PipelineStatus;
          started_at: string;
          completed_at: string | null;
          record_count_in: number | null;
          record_count_out: number | null;
          error_message: string | null;
          triggered_by: TriggerType;
          dagster_run_id: string | null;
          created_at: string;
        };
        Insert: {
          org_id: string;
          pipeline_id: string;
          status?: PipelineStatus;
          started_at?: string;
          completed_at?: string | null;
          record_count_in?: number | null;
          record_count_out?: number | null;
          error_message?: string | null;
          triggered_by?: TriggerType;
          dagster_run_id?: string | null;
        };
        Update: {
          status?: PipelineStatus;
          completed_at?: string | null;
          record_count_in?: number | null;
          record_count_out?: number | null;
          error_message?: string | null;
          dagster_run_id?: string | null;
        };
        Relationships: [];
      };
      review_checkpoints: {
        Row: {
          id: string;
          org_id: string;
          pipeline_run_id: string;
          checkpoint_type: CheckpointType;
          status: CheckpointStatus;
          quality_checks: Record<string, unknown> | null;
          record_count: number | null;
          sample_data: Record<string, unknown> | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          org_id: string;
          pipeline_run_id: string;
          checkpoint_type: CheckpointType;
          status?: CheckpointStatus;
          quality_checks?: Record<string, unknown> | null;
          record_count?: number | null;
          sample_data?: Record<string, unknown> | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          status?: CheckpointStatus;
          quality_checks?: Record<string, unknown> | null;
          record_count?: number | null;
          sample_data?: Record<string, unknown> | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id: string | null;
          changes: Record<string, unknown> | null;
          ip_address: string | null;
          timestamp: string;
        };
        Insert: {
          org_id: string;
          user_id?: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id?: string | null;
          changes?: Record<string, unknown> | null;
          ip_address?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          org_id: string;
          event_type: "fcu" | "fiq";
          quantity: number;
          pipeline_run_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          org_id: string;
          event_type: "fcu" | "fiq";
          quantity: number;
          pipeline_run_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Enums: {
      user_role: UserRole;
      pipeline_status: PipelineStatus;
      checkpoint_type: CheckpointType;
      checkpoint_status: CheckpointStatus;
      erp_type: ErpType;
      connector_status: ConnectorStatus;
      plan_tier: PlanTier;
      billing_status: BillingStatus;
      trigger_type: TriggerType;
      schedule_type: ScheduleType;
      delivery_type: DeliveryType;
    };
  };
}
