import type { FastifyInstance } from "fastify";
import { eq, ilike } from "drizzle-orm";
import { db, cannedResponses } from "@crm/db";
import { requireAuth, type JwtPayload } from "../middleware/auth";

export async function cannedRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>(
    "/", { onRequest: [requireAuth] }, async (req) => {
      const rows = req.query.q
        ? await db.select().from(cannedResponses).where(ilike(cannedResponses.shortcut, `%${req.query.q}%`))
        : await db.select().from(cannedResponses);
      return { data: rows };
    },
  );

  app.post<{ Body: { shortcut: string; title: string; body: string; channel?: string } }>(
    "/", { onRequest: [requireAuth] }, async (req) => {
      const user = req.user as JwtPayload;
      const [row] = await db.insert(cannedResponses).values({
        ...req.body,
        createdBy: user.sub,
      }).returning();
      return row;
    },
  );

  app.patch<{ Params: { id: string }; Body: { shortcut?: string; title?: string; body?: string } }>(
    "/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [row] = await db
        .update(cannedResponses)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(cannedResponses.id, req.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [row] = await db
        .delete(cannedResponses)
        .where(eq(cannedResponses.id, req.params.id))
        .returning({ id: cannedResponses.id });
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
