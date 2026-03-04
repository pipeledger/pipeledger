export type ErpType = "netsuite" | "dynamics365" | "sap" | "coupa" | "csv";
export type ConnectorStatus = "connected" | "error" | "disconnected" | "pending";

export interface ConnectorConfig {
  id: string;
  org_id: string;
  erp_type: ErpType;
  display_name: string;
  status: ConnectorStatus;
  last_sync: string | null;
  created_at: string;
}
