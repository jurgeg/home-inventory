import Dexie, { type Table } from "dexie";

export interface OfflineItem {
  id: string;
  client_id: string;
  name: string;
  category_id?: string;
  description?: string;
  brand?: string;
  model?: string;
  estimated_value?: number;
  purchase_year?: number;
  condition?: string;
  tags?: string[];
  location_id?: string;
  image_blob?: Blob;
  image_url?: string;
  thumbnail_url?: string;
  created_at: number;
  updated_at: number;
  sync_status: "pending" | "synced" | "error";
}

export interface OfflineLocation {
  id: string;
  name: string;
  type: "property" | "room" | "spot";
  parent_id?: string;
  sync_status: "pending" | "synced" | "error";
}

export interface OfflineCategory {
  id: string;
  name: string;
  icon?: string;
  sync_status: "pending" | "synced" | "error";
}

export interface PendingSyncEntry {
  id: string;
  action: "create" | "update" | "delete";
  table: string;
  entity_id: string;
  payload: unknown;
  created_at: number;
  retries: number;
}

class InventoryDB extends Dexie {
  items!: Table<OfflineItem>;
  locations!: Table<OfflineLocation>;
  categories!: Table<OfflineCategory>;
  pendingSync!: Table<PendingSyncEntry>;

  constructor() {
    super("home-inventory");
    this.version(1).stores({
      items: "id, client_id, category_id, location_id, sync_status, created_at, *tags",
      locations: "id, type, parent_id, sync_status",
      categories: "id, name, sync_status",
      pendingSync: "id, created_at, table",
    });
  }
}

export const db = new InventoryDB();
