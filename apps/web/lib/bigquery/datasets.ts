import { bigquery, datasetId } from "./client";
import { SHARED_TABLES } from "./schemas";

const LOCATION = "US";

async function ensureDataset(id: string): Promise<void> {
  const dataset = bigquery.dataset(id);
  const [exists] = await dataset.exists();
  if (!exists) {
    await bigquery.createDataset(id, { location: LOCATION });
    console.log(`Created BigQuery dataset: ${id}`);
  }
}

async function ensureTable(
  datasetName: string,
  tableName: string,
  schema: object[],
): Promise<void> {
  const table = bigquery.dataset(datasetName).table(tableName);
  const [exists] = await table.exists();
  if (!exists) {
    await table.create({ schema });
    console.log(`Created BigQuery table: ${datasetName}.${tableName}`);
  }
}

/** Creates the shared platform dataset and all shared reference tables. Run once at deploy time. */
export async function initSharedDataset(): Promise<void> {
  const id = datasetId.shared();
  await ensureDataset(id);
  await Promise.all(
    Object.entries(SHARED_TABLES).map(([name, schema]) =>
      ensureTable(id, name, schema),
    ),
  );
}

/** Creates all three org-scoped datasets. Run once when an org is onboarded. */
export async function initOrgDatasets(orgId: string): Promise<void> {
  await Promise.all([
    ensureDataset(datasetId.raw(orgId)),
    ensureDataset(datasetId.transform(orgId)),
    ensureDataset(datasetId.mart(orgId)),
  ]);
}
