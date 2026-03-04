#!/usr/bin/env tsx
/**
 * One-time BigQuery setup script.
 * Creates the pipeledger_shared dataset and all shared reference tables.
 *
 * Run from the repo root:
 *   pnpm exec tsx scripts/init-bigquery.ts
 *
 * Safe to re-run — all operations are idempotent (no-ops if already exists).
 */

import { initSharedDataset } from "../apps/web/lib/bigquery/datasets";

async function main() {
  console.log("Initializing pipeledger_shared BigQuery dataset...");
  await initSharedDataset();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
