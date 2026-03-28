import type { FastifyInstance } from "fastify";
import { sql, eq, and, gte, lte, count } from "drizzle-orm";
import { db, conversations, messages, deals, pipelineStages, users } from "@crm/db";
import { requireManager } from "../middleware/auth";
import { getRedis } from "@crm/redis";

export async function reportRoutes(app: FastifyInstance) {
  function dateRange(req: any): { from: Date; to: Date } {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 86400_000);
    const to   = req.query.to   ? new Date(req.query.to)   : new Date();
    return { from, to };
  }

  // GET /reports/overview
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/overview", { onRequest: [requireManager] }, async (req) => {
      const redis = getRedis();
      const cacheKey = `report:overview:${req.query.from}:${req.query.to}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const { from, to } = dateRange(req);

      const [totalConv] = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(gte(conversations.createdAt, from), lte(conversations.createdAt, to)));

      const [resolved] = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(
          gte(conversations.createdAt, from),
          lte(conversations.createdAt, to),
          eq(conversations.status, "resolved"),
        ));

      const [avgResponseRaw] = await db.execute(sql`
        SELECT AVG(EXTRACT(EPOCH FROM (m.received_at - c.created_at)) / 60)::numeric(10,2) as avg_minutes
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id AND m.direction = 'outbound'
        WHERE c.created_at BETWEEN ${from} AND ${to}
          AND m.received_at = (
            SELECT MIN(m2.received_at) FROM messages m2
            WHERE m2.conversation_id = c.id AND m2.direction = 'outbound'
          )
      `);

      const [totalDeals] = await db
        .select({ count: count() })
        .from(deals)
        .where(and(gte(deals.createdAt, from), lte(deals.createdAt, to)));

      const [wonDeals] = await db
        .select({ count: count() })
        .from(deals)
        .where(and(gte(deals.createdAt, from), lte(deals.createdAt, to), sql`won_at IS NOT NULL`));

      const result = {
        period:             { from, to },
        totalConversations: totalConv.count,
        resolvedConversations: resolved.count,
        resolutionRate:     totalConv.count > 0
          ? Math.round((resolved.count / totalConv.count) * 100)
          : 0,
        avgFirstResponseMinutes: (avgResponseRaw as any)?.[0]?.avg_minutes ?? null,
        totalDeals:         totalDeals.count,
        wonDeals:           wonDeals.count,
        conversionRate:     totalDeals.count > 0
          ? Math.round((wonDeals.count / totalDeals.count) * 100)
          : 0,
      };

      await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
      return result;
    },
  );

  // GET /reports/by-agent
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/by-agent", { onRequest: [requireManager] }, async (req) => {
      const { from, to } = dateRange(req);

      const rows = await db.execute(sql`
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(DISTINCT c.id)::int                                         AS total_conversations,
          COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END)::int AS resolved,
          AVG(EXTRACT(EPOCH FROM (m.received_at - c.created_at)) / 60)::numeric(10,2) AS avg_response_min
        FROM users u
        LEFT JOIN conversations c ON c.assigned_agent = u.id
          AND c.created_at BETWEEN ${from} AND ${to}
        LEFT JOIN messages m ON m.conversation_id = c.id AND m.direction = 'outbound'
          AND m.received_at = (
            SELECT MIN(m2.received_at) FROM messages m2
            WHERE m2.conversation_id = c.id AND m2.direction = 'outbound'
          )
        WHERE u.role = 'agent'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_conversations DESC
      `);

      return { data: rows };
    },
  );

  // GET /reports/by-channel
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/by-channel", { onRequest: [requireManager] }, async (req) => {
      const { from, to } = dateRange(req);

      const rows = await db.execute(sql`
        SELECT
          channel,
          COUNT(*)::int                                                      AS total,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int              AS resolved,
          COUNT(CASE WHEN status = 'open' THEN 1 END)::int                  AS open
        FROM conversations
        WHERE created_at BETWEEN ${from} AND ${to}
        GROUP BY channel
        ORDER BY total DESC
      `);

      return { data: rows };
    },
  );

  // GET /reports/conversion
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/conversion", { onRequest: [requireManager] }, async (req) => {
      const { from, to } = dateRange(req);

      const stages = await db
        .select()
        .from(pipelineStages)
        .orderBy(pipelineStages.orderIndex);

      const dealCounts = await db.execute(sql`
        SELECT stage_id, COUNT(*)::int AS count
        FROM deals
        WHERE created_at BETWEEN ${from} AND ${to}
        GROUP BY stage_id
      `) as Array<{ stage_id: string; count: number }>;

      const countMap = Object.fromEntries(
        (dealCounts as any[]).map((r: any) => [r.stage_id, r.count]),
      );

      return {
        data: stages.map((s) => ({
          stageId:   s.id,
          stageName: s.name,
          color:     s.color,
          count:     countMap[s.id] ?? 0,
        })),
      };
    },
  );
}
