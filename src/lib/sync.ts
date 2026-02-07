import { db, type PendingSyncEntry } from "./offline-db";

function generateId(): string {
  return crypto.randomUUID();
}

export async function queueMutation(
  action: PendingSyncEntry["action"],
  table: string,
  entityId: string,
  payload: unknown,
): Promise<void> {
  await db.pendingSync.add({
    id: generateId(),
    action,
    table,
    entity_id: entityId,
    payload,
    created_at: Date.now(),
    retries: 0,
  });

  if (navigator.onLine) {
    processSyncQueue();
  }
}

async function syncEntry(entry: PendingSyncEntry): Promise<void> {
  const method =
    entry.action === "create" ? "POST" : entry.action === "update" ? "PUT" : "DELETE";

  const url =
    entry.action === "delete"
      ? `/api/${entry.table}/${entry.entity_id}`
      : `/api/${entry.table}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: entry.action !== "delete" ? JSON.stringify(entry.payload) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }

  // Update local record sync_status
  const table = db.table(entry.table);
  if (table && entry.action !== "delete") {
    await table.update(entry.entity_id, { sync_status: "synced" });
  }
}

async function uploadImage(blob: Blob, entityId: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, `${entityId}.jpg`);
  formData.append("entity_id", entityId);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.url;
}

let isSyncing = false;

export async function processSyncQueue(): Promise<{ processed: number; total: number }> {
  if (isSyncing) return { processed: 0, total: 0 };
  isSyncing = true;

  try {
    const pending = await db.pendingSync.orderBy("created_at").toArray();
    let processed = 0;

    for (const entry of pending) {
      try {
        await syncEntry(entry);
        await db.pendingSync.delete(entry.id);
        processed++;

        // Upload image blob if present
        if (entry.action === "create" && entry.table === "items") {
          const item = await db.items.get(entry.entity_id);
          if (item?.image_blob) {
            const url = await uploadImage(item.image_blob, entry.entity_id);
            await db.items.update(entry.entity_id, {
              image_url: url,
              image_blob: undefined,
              sync_status: "synced",
            });
          }
        }
      } catch {
        await db.pendingSync.update(entry.id, { retries: entry.retries + 1 });
        if (entry.retries >= 3) {
          const table = db.table(entry.table);
          if (table) {
            await table.update(entry.entity_id, { sync_status: "error" });
          }
        }
        break; // Maintain order
      }
    }

    return { processed, total: pending.length };
  } finally {
    isSyncing = false;
  }
}

export async function getPendingCount(): Promise<number> {
  return db.pendingSync.count();
}

// Auto-sync when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processSyncQueue();
  });
}
