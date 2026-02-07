export interface Item {
  id: string;
  name: string;
  category: string;
  description?: string;
  brand?: string;
  model?: string;
  estimatedValue?: number;
  condition?: "new" | "like-new" | "good" | "fair" | "poor";
  tags?: string[];
  locationId?: string;
  roomName?: string;
  spotName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  blurHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  icon?: string;
  roomCount: number;
  itemCount: number;
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  icon?: string;
  itemCount: number;
}

export interface Spot {
  id: string;
  roomId: string;
  name: string;
  itemCount: number;
}

export type LocationLevel = "property" | "room" | "spot";
