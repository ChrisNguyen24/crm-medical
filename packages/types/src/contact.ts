import type { Platform } from "./platform";

export interface PlatformIds {
  facebook?: string;
  zalo?: string;
  tiktok?: string;
  instagram?: string;
}

export interface Contact {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
  platformIds: PlatformIds;
  avatarUrl?: string;
  tags: string[];
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
