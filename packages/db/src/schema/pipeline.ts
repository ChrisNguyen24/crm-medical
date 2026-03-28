import { pgTable, uuid, text, integer, boolean, numeric, timestamp, date, index } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { users } from "./users";

export const pipelineStages = pgTable("pipeline_stages", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  color:      text("color").default("#6B7280"),
  isWon:      boolean("is_won").notNull().default(false),
  isLost:     boolean("is_lost").notNull().default(false),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id:             uuid("id").primaryKey().defaultRandom(),
  contactId:      uuid("contact_id").notNull().references(() => contacts.id),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  stageId:        uuid("stage_id").notNull().references(() => pipelineStages.id),
  title:          text("title").notNull(),
  value:          numeric("value", { precision: 12, scale: 2 }),
  currency:       text("currency").notNull().default("VND"),
  assignedAgent:  uuid("assigned_agent").references(() => users.id, { onDelete: "set null" }),
  expectedClose:  date("expected_close"),
  closedAt:       timestamp("closed_at", { withTimezone: true }),
  wonAt:          timestamp("won_at", { withTimezone: true }),
  lostReason:     text("lost_reason"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  contactIdx: index("deals_contact_idx").on(t.contactId),
  stageIdx:   index("deals_stage_idx").on(t.stageId),
}));

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
