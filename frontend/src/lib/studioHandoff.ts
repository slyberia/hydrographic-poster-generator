// Same-origin, bounded, transient transport. No image bytes in URLs or localStorage.
import type { ExportResult } from "./api";

export const HANDOFF_TTL_MS = 5 * 60 * 1000;
const DB = "hydro-studio-handoff-v1";
const STORE = "handoffs";
const MAX_BYTES = 25 * 1024 * 1024;
type RecordValue = {
  id: string; createdAt: number; expiresAt: number; consumed?: boolean;
  blob?: Blob; filename?: string; posterId?: string | null;
  provenance?: Record<string, unknown> | null;
};
export type HandoffResult =
  | { status: "ready"; file: File; posterId: string | null; provenance: Record<string, unknown> | null }
  | { status: "expired" | "consumed" | "missing" | "malformed" | "unavailable" };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => { finished = true; reject(new Error("Browser transfer storage timed out.")); }, 5000);
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => { clearTimeout(timer); finished = true; reject(request.error); };
    request.onblocked = () => { clearTimeout(timer); finished = true; reject(new Error("Browser transfer storage is blocked.")); };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (finished) { request.result.close(); return; }
      finished = true; request.result.onversionchange = () => request.result.close(); resolve(request.result);
    };
  });
}

async function transaction<T>(action: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Browser transfer was interrupted."));
      try { action(tx.objectStore(STORE), value => { result = value; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

export async function cleanupHandoffs(): Promise<void> {
  await transaction<void>((store, done) => {
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) { done(); return; }
      const value = item.value as RecordValue;
      if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) item.delete();
      item.continue();
    };
  });
}

export async function createHandoff(value: ExportResult): Promise<string> {
  if (!["image/png", "image/jpeg", "image/tiff"].includes(value.blob.type.split(";")[0])
    || !value.blob.size || value.blob.size > MAX_BYTES) {
    throw new Error("Use a PNG or TIFF export up to 25 MB for direct transfer.");
  }
  await cleanupHandoffs();
  const id = crypto.randomUUID();
  // Expiry is also in the URL so expired links remain distinguishable after cleanup.
  const expiresAt = Date.now() + HANDOFF_TTL_MS;
  await transaction<void>((store, done) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const records = (request.result as RecordValue[]).sort((a, b) => a.createdAt - b.createdAt);
      // At most three entries, including small consumed tombstones.
      while (records.length >= 3) store.delete(records.shift()!.id);
      store.put({ id, createdAt: Date.now(), expiresAt, ...value } satisfies RecordValue);
      done();
    };
  });
  return "/georeference?handoff=" + encodeURIComponent(id) + "&expires=" + expiresAt;
}

export async function consumeHandoff(id: string, expiry: string | null): Promise<HandoffResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "malformed" };
  try {
    return await transaction<HandoffResult>((store, done) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const value = request.result as RecordValue | undefined;
        if (!value) { done({ status: expiry && Number(expiry) <= Date.now() ? "expired" : "missing" }); return; }
        if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
          store.delete(id); done({ status: "expired" }); return;
        }
        if (value.consumed) { done({ status: "consumed" }); return; }
        // Read and replace in one serialized transaction: only one tab receives the bytes.
        store.put({ id, createdAt: value.createdAt, expiresAt: value.expiresAt, consumed: true });
        if (!Number.isFinite(value.createdAt) || value.createdAt > Date.now() || value.expiresAt - value.createdAt > HANDOFF_TTL_MS
          || !(value.blob instanceof Blob) || !value.blob.size || value.blob.size > MAX_BYTES
          || !["image/png", "image/jpeg", "image/tiff"].includes(value.blob.type.split(";")[0])
          || typeof value.filename !== "string"
          || (value.posterId != null && typeof value.posterId !== "string")
          || (value.provenance != null && (typeof value.provenance !== "object" || Array.isArray(value.provenance)))) {
          done({ status: "malformed" }); return;
        }
        done({ status: "ready", file: new File([value.blob], value.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100),
          { type: value.blob.type }), posterId: value.posterId ?? null, provenance: value.provenance ?? null });
      };
    });
  } catch { return { status: "unavailable" }; }
}
