import { db, conversations, users } from "@crm/db";
import { eq, and, isNull } from "drizzle-orm";
import { getRedis } from "@crm/redis";
import { createLogger } from "@crm/logger";

const log = createLogger("conversation-service:assign");

const ROUND_ROBIN_KEY = "assign:round_robin:index";

/**
 * Auto-assign a conversation to an available agent.
 * Strategy: round-robin among agents who are currently online.
 * Falls back to any agent if none are online.
 */
export async function autoAssign(conversationId: string): Promise<string | null> {
  const redis = getRedis();

  // Get all agents
  const agents = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "agent")));

  if (agents.length === 0) return null;

  // Prefer online agents (presence tracked by notification-service)
  const onlineStatuses = await Promise.all(
    agents.map(async (a) => {
      const online = await redis.get(`agent:${a.id}:online`);
      return { id: a.id, online: !!online };
    }),
  );

  const online = onlineStatuses.filter((a) => a.online);
  const pool = online.length > 0 ? online : onlineStatuses;

  // Round-robin
  const idx = await redis.incr(ROUND_ROBIN_KEY);
  const agent = pool[idx % pool.length];

  await db
    .update(conversations)
    .set({ assignedAgent: agent.id, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  log.info({ conversationId, agentId: agent.id, online: agent.online }, "Auto-assigned conversation");
  return agent.id;
}
