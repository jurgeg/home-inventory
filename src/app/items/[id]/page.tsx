"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  X,
  MapPin,
  Calendar,
  Tag,
  Package,
} from "lucide-react";

interface Item {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  condition: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  created_at: string;
  categories: { id: string; name: string; icon: string } | null;
  item_photos: { storage_path: string; is_primary: boolean }[];
  item_tags?: { tags: { id: string; name: string } }[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPhotoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/item-photos/${path}`;
}

const CONDITIONS = ["new", "like_new", "good", "fair", "poor"];

export default function ItemDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    brand: "",
    condition: "good",
    estimatedValueLow: 0,
    estimatedValueHigh: 0,
  });

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.item) {
          setItem(data.item);
          setForm({
            name: data.item.name || "",
            description: data.item.description || "",
            brand: data.item.brand || "",
            condition: data.item.condition || "good",
            estimatedValueLow: data.item.estimated_value_low || 0,
            estimatedValueHigh: data.item.estimated_value_high || 0,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.item) {
        setItem({ ...item!, ...data.item });
        setEditing(false);
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
      router.push("/");
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-12 safe-area-pt">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="px-4 pt-12 safe-area-pt text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Item not found</p>
        <button onClick={() => router.push("/")} className="text-primary text-sm mt-2">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const primaryPhoto = item.item_photos?.find((p) => p.is_primary) || item.item_photos?.[0];
  const tags = item.item_tags?.map((t) => t.tags.name) || [];

  return (
    <div className="safe-area-pt">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Photo */}
      {primaryPhoto ? (
        <div className="px-4 mb-4">
          <img
            src={getPhotoUrl(primaryPhoto.storage_path)}
            alt={item.name}
            className="w-full h-64 object-cover rounded-xl"
          />
        </div>
      ) : (
        <div className="px-4 mb-4">
          <div className="w-full h-48 rounded-xl bg-muted flex items-center justify-center">
            <span className="text-5xl">{item.categories?.icon || "📦"}</span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="px-4 space-y-4 pb-8">
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Name */}
            {editing ? (
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="text-xl font-bold"
                placeholder="Item name"
              />
            ) : (
              <h1 className="text-xl font-bold">{item.name}</h1>
            )}

            {/* Brand */}
            {editing ? (
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Brand"
                className="text-sm"
              />
            ) : (
              item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {item.categories && (
                <Badge variant="secondary" className="gap-1">
                  <span>{item.categories.icon}</span>
                  {item.categories.name}
                </Badge>
              )}
              {editing ? (
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="text-xs border rounded-full px-3 py-1 bg-background"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {item.condition?.replace("_", " ") || "Good"}
                </Badge>
              )}
            </div>

            {/* Description */}
            {editing ? (
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                rows={3}
                className="w-full text-sm border rounded-lg p-2 bg-background resize-none"
              />
            ) : (
              item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )
            )}

            {/* Value */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
              {editing ? (
                <div className="flex gap-2 items-center">
                  <span className="text-sm">£</span>
                  <Input
                    type="number"
                    value={form.estimatedValueLow}
                    onChange={(e) =>
                      setForm({ ...form, estimatedValueLow: Number(e.target.value) })
                    }
                    className="w-24 text-sm"
                  />
                  <span className="text-sm">–</span>
                  <span className="text-sm">£</span>
                  <Input
                    type="number"
                    value={form.estimatedValueHigh}
                    onChange={(e) =>
                      setForm({ ...form, estimatedValueHigh: Number(e.target.value) })
                    }
                    className="w-24 text-sm"
                  />
                </div>
              ) : (
                <p className="text-lg font-semibold">
                  £{item.estimated_value_low || 0} – £{item.estimated_value_high || 0}
                </p>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Date added */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              Added {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            {/* Location placeholder */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
              <MapPin className="w-3.5 h-3.5" />
              <span>No location set</span>
              <button className="text-primary ml-1">Add location</button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center space-y-4">
              <Trash2 className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="font-semibold">Delete &ldquo;{item.name}&rdquo;?</h3>
              <p className="text-sm text-muted-foreground">
                This item will be archived and hidden from your inventory.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
