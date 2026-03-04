import { BigQuery } from "@google-cloud/bigquery";

const projectId = process.env.GCP_PROJECT_ID;

if (!projectId) {
  throw new Error("GCP_PROJECT_ID environment variable is not set");
}

// Supports two auth modes:
// - Local dev: GOOGLE_APPLICATION_CREDENTIALS file path (gcloud auth application-default login)
// - Vercel/production: GOOGLE_CREDENTIALS_JSON env var with the JSON content as a string
const credentials = process.env.GOOGLE_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : undefined;

export const bigquery = new BigQuery({ projectId, credentials });

// BigQuery dataset IDs must be alphanumeric + underscores only — no hyphens.
// Supabase org IDs are UUIDs, so we replace hyphens with underscores.
const sanitize = (orgId: string) => orgId.replace(/-/g, "_");

// Dataset naming helpers — enforces the {org_id}_* convention from system-architecture.md
export const datasetId = {
  raw: (orgId: string) => `${sanitize(orgId)}_raw`,
  transform: (orgId: string) => `${sanitize(orgId)}_transform`,
  mart: (orgId: string) => `${sanitize(orgId)}_mart`,
  shared: () => "pipeledger_shared",
} as const;
