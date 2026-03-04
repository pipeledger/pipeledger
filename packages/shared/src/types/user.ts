export type UserRole = "owner" | "admin" | "approver" | "operator" | "viewer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  org_id: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  base_currency: string;
  fiscal_year_end: string | null;
  accounting_standard: "GAAP" | "IFRS" | null;
  created_at: string;
}
