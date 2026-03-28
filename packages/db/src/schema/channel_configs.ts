import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { channelEnum } from "./conversations";

/**
 * Stores per-channel platform credentials.
 * access_token is AES-256-GCM encrypted — never returned in API responses.
 */
export const channelConfigs = pgTable("channel_configs", {
  id:                uuid("id").primaryKey().defaultRandom(),
  channel:           channelEnum("channel").notNull(),
  /** Facebook Page ID, Zalo OA ID, etc. */
  externalAccountId: text("external_account_id").notNull(),
  label:             text("label").notNull(),
  /** Encrypted with MASTER_KEY */
  accessTokenEnc:    text("access_token_enc"),
  /** Encrypted refresh token (Zalo, etc.) */
  refreshTokenEnc:   text("refresh_token_enc"),
  tokenExpiresAt:    timestamp("token_expires_at", { withTimezone: true }),
  webhookSecret:     text("webhook_secret"),
  isActive:          text("is_active").notNull().default("true"),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChannelConfig = typeof channelConfigs.$inferSelect;
export type NewChannelConfig = typeof channelConfigs.$inferInsert;
