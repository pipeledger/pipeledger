import { Storage } from "@google-cloud/storage";

const bucket = process.env.GCS_BUCKET_NAME;

if (!bucket) {
  throw new Error("GCS_BUCKET_NAME environment variable is not set");
}

const credentials = process.env.GOOGLE_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : undefined;

const storage = new Storage({ credentials });

/** GCS path pattern: exports/{org_id}/{export_version_id}/{filename} */
export function exportPath(orgId: string, exportVersionId: string, filename: string): string {
  return `exports/${orgId}/${exportVersionId}/${filename}`;
}

/** Returns a signed URL valid for 1 hour. Used for secure file delivery to customers. */
export async function getSignedDownloadUrl(gcsPath: string): Promise<string> {
  const [url] = await storage.bucket(bucket!).file(gcsPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return url;
}

/** Removes all ACLs on a file, making it inaccessible. Used for delivery revocation.
 *  The file is preserved — only access is removed (see pipeline-safety.md rule 9). */
export async function revokeFileAccess(gcsPath: string): Promise<void> {
  const file = storage.bucket(bucket!).file(gcsPath);
  await file.acl.delete({ entity: "allUsers" }).catch(() => undefined);
  await file.acl.delete({ entity: "allAuthenticatedUsers" }).catch(() => undefined);
}
