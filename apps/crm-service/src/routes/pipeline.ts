import type { FastifyInstance } from "fastify";
import { eq, asc } from "drizzle-orm";
import { db, pipelineStages, deals, activities } from "@crm/db";
import { requireAuth, requireManager, type JwtPayload } from "../middleware/auth";

export async function pipelineRoutes(app: FastifyInstance) {
  // ─── Pipeline Stages ────────────────────────────────────────────────────

  app.get("/stages", { onRequest: [requireAuth] }, async () => {
    const rows = await db
      .select()
      .from(pipelineStages)
      .orderBy(asc(pipelineStages.orderIndex));
    return { data: rows };
  });

  app.post<{ Body: { name: string; color?: string } }>(
    "/stages", { onRequest: [requireManager] }, async (req) => {
      const maxOrder = await db
        .select({ o: pipelineStages.orderIndex })
        .from(pipelineStages)
        .orderBy(pipelineStages.orderIndex);

      const orderIndex = maxOrder.length > 0 ? maxOrder[maxOrder.length - 1].o + 1 : 0;

      const [stage] = await db.insert(pipelineStages).values({
        name:       req.body.name,
        color:      req.body.color,
        orderIndex,
      }).returning();
      return stage;
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; color?: string } }>(
    "/stages/:id", { onRequest: [requireManager] }, async (req, reply) => {
      const [updated] = await db
        .update(pipelineStages)
        .set(req.body)
        .where(eq(pipelineStages.id, req.params.id))
        .returning();
      if (!updated) return reply.code(404).send({ error: "Not found" });
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/stages/:id", { onRequest: [requireManager] }, async (req, reply) => {
      const [deleted] = await db
        .delete(pipelineStages)
        .where(eq(pipelineStages.id, req.params.id))
        .returning({ id: pipelineStages.id });
      if (!deleted) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  // ─── Deals ──────────────────────────────────────────────────────────────

  app.get<{
    Querystring: { stage_id?: string; contact_id?: string; assigned_agent?: string };
  }>("/deals", { onRequest: [requireAuth] }, async (req) => {
    const { stage_id, contact_id, assigned_agent } = req.query;
    const filters = [];
    if (stage_id)       filters.push(eq(deals.stageId, stage_id));
    if (contact_id)     filters.push(eq(deals.contactId, contact_id));
    if (assigned_agent) filters.push(eq(deals.assignedAgent, assigned_agent));

    const rows = await db
      .select()
      .from(deals)
      .where(filters.length > 0 ? (filters.length === 1 ? filters[0] : filters.reduce((a, b) => eq(a as any, b as any))) : undefined)
      .orderBy(deals.createdAt);

    return { data: rows };
  });

  app.post<{
    Body: {
      contactId: string;
      title: string;
      stageId: string;
      value?: number;
      conversationId?: string;
      expectedClose?: string;
    };
  }>("/deals", { onRequest: [requireAuth] }, async (req) => {
    const user = req.user as JwtPayload;

    const [deal] = await db.insert(deals).values({
      ...req.body,
      assignedAgent: user.sub,
      value:         req.body.value ? String(req.body.value) : null,
    }).returning();

    await db.insert(activities).values({
      contactId:  deal.contactId,
      dealId:     deal.id,
      actorId:    user.sub,
      actorType:  "agent",
      type:       "deal_created",
      summary:    `Deal created: ${deal.title}`,
    });

    return deal;
  });

  app.get<{ Params: { id: string } }>(
    "/deals/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [deal] = await db.select().from(deals).where(eq(deals.id, req.params.id)).limit(1);
      if (!deal) return reply.code(404).send({ error: "Not found" });
      return deal;
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { title?: string; stageId?: string; value?: number; assignedAgent?: string; expectedClose?: string };
  }>("/deals/:id", { onRequest: [requireAuth] }, async (req, reply) => {
    const user = req.user as JwtPayload;
    const [before] = await db.select({ stageId: deals.stageId }).from(deals).where(eq(deals.id, req.params.id)).limit(1);
    if (!before) return reply.code(404).send({ error: "Not found" });

    const updates = { ...req.body, updatedAt: new Date() };
    if (req.body.value !== undefined) (updates as any).value = String(req.body.value);

    const [updated] = await db
      .update(deals)
      .set(updates as any)
      .where(eq(deals.id, req.params.id))
      .returning();

    // Log stage change
    if (req.body.stageId && req.body.stageId !== before.stageId) {
      await db.insert(activities).values({
        dealId:    updated.id,
        contactId: updated.contactId,
        actorId:   user.sub,
        actorType: "agent",
        type:      "deal_stage_changed",
        summary:   `Deal moved to new stage`,
        metadata:  { fromStage: before.stageId, toStage: req.body.stageId },
      });
    }

    return updated;
  });

  app.post<{ Params: { id: string } }>(
    "/deals/:id/won", { onRequest: [requireAuth] }, async (req, reply) => {
      const user = req.user as JwtPayload;
      const [wonStage] = await db
        .select({ id: pipelineStages.id })
        .from(pipelineStages)
        .where(eq(pipelineStages.isWon, true))
        .limit(1);

      const [updated] = await db
        .update(deals)
        .set({ wonAt: new Date(), closedAt: new Date(), stageId: wonStage?.id ?? "", updatedAt: new Date() })
        .where(eq(deals.id, req.params.id))
        .returning();

      if (!updated) return reply.code(404).send({ error: "Not found" });

      await db.insert(activities).values({
        dealId:    updated.id,
        contactId: updated.contactId,
        actorId:   user.sub,
        actorType: "agent",
        type:      "deal_stage_changed",
        summary:   "Deal won",
      });

      return updated;
    },
  );

  app.post<{ Params: { id: string }; Body: { lostReason: string } }>(
    "/deals/:id/lost", { onRequest: [requireAuth] }, async (req, reply) => {
      const user = req.user as JwtPayload;
      const [lostStage] = await db
        .select({ id: pipelineStages.id })
        .from(pipelineStages)
        .where(eq(pipelineStages.isLost, true))
        .limit(1);

      const [updated] = await db
        .update(deals)
        .set({
          lostReason: req.body.lostReason,
          closedAt:   new Date(),
          stageId:    lostStage?.id ?? "",
          updatedAt:  new Date(),
        })
        .where(eq(deals.id, req.params.id))
        .returning();

      if (!updated) return reply.code(404).send({ error: "Not found" });

      await db.insert(activities).values({
        dealId:    updated.id,
        contactId: updated.contactId,
        actorId:   user.sub,
        actorType: "agent",
        type:      "deal_stage_changed",
        summary:   `Deal lost: ${req.body.lostReason}`,
      });

      return updated;
    },
  );

  // GET /deals (per contact)
  app.get<{ Params: { contactId: string } }>(
    "/contacts/:contactId/deals", { onRequest: [requireAuth] }, async (req) => {
      const rows = await db
        .select()
        .from(deals)
        .where(eq(deals.contactId, req.params.contactId))
        .orderBy(deals.createdAt);
      return { data: rows };
    },
  );
}
