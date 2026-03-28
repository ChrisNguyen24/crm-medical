import type { FastifyInstance } from "fastify";
import { eq, ilike, or, isNull, and } from "drizzle-orm";
import { db, contacts, activities, conversations, deals } from "@crm/db";
import { requireAuth, type JwtPayload } from "../middleware/auth";

export async function contactRoutes(app: FastifyInstance) {
  // GET /contacts
  app.get<{ Querystring: { q?: string; limit?: number; offset?: number } }>(
    "/", { onRequest: [requireAuth] }, async (req) => {
      const { q, limit = 30, offset = 0 } = req.query;

      const baseFilter = isNull(contacts.deletedAt);
      const searchFilter = q
        ? or(
            ilike(contacts.displayName, `%${q}%`),
            ilike(contacts.phone ?? "", `%${q}%`),
            ilike(contacts.email ?? "", `%${q}%`),
          )
        : undefined;

      const filter = searchFilter ? and(baseFilter, searchFilter) : baseFilter;

      const rows = await db
        .select({
          id:          contacts.id,
          displayName: contacts.displayName,
          phone:       contacts.phone,
          email:       contacts.email,
          avatarUrl:   contacts.avatarUrl,
          tags:        contacts.tags,
          createdAt:   contacts.createdAt,
        })
        .from(contacts)
        .where(filter)
        .limit(Number(limit))
        .offset(Number(offset));

      return { data: rows };
    },
  );

  // POST /contacts
  app.post<{
    Body: { displayName: string; phone?: string; email?: string; notes?: string };
  }>("/", { onRequest: [requireAuth] }, async (req) => {
    const user = req.user as JwtPayload;
    const { displayName, phone, email, notes } = req.body;

    const [contact] = await db.insert(contacts).values({
      displayName,
      phone,
      email,
      notes,
      platformIds: {},
      tags: [],
      assignedAgent: user.sub,
    }).returning();

    await db.insert(activities).values({
      contactId:  contact.id,
      actorId:    user.sub,
      actorType:  "agent",
      type:       "contact_created",
      summary:    `Contact created: ${displayName}`,
    });

    return contact;
  });

  // GET /contacts/:id
  app.get<{ Params: { id: string } }>(
    "/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, req.params.id), isNull(contacts.deletedAt)))
        .limit(1);

      if (!contact) return reply.code(404).send({ error: "Not found" });
      return contact;
    },
  );

  // PATCH /contacts/:id
  app.patch<{
    Params: { id: string };
    Body: { displayName?: string; phone?: string; email?: string; notes?: string; tags?: string[] };
  }>("/:id", { onRequest: [requireAuth] }, async (req, reply) => {
    const user = req.user as JwtPayload;
    const updates = { ...req.body, updatedAt: new Date() };

    const [updated] = await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, req.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "Not found" });

    await db.insert(activities).values({
      contactId:  req.params.id,
      actorId:    user.sub,
      actorType:  "agent",
      type:       "contact_updated",
      summary:    "Contact updated",
      metadata:   req.body,
    });

    return updated;
  });

  // DELETE /contacts/:id  (soft delete)
  app.delete<{ Params: { id: string } }>(
    "/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [updated] = await db
        .update(contacts)
        .set({ deletedAt: new Date() })
        .where(eq(contacts.id, req.params.id))
        .returning({ id: contacts.id });

      if (!updated) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  // POST /contacts/merge
  app.post<{
    Body: { primaryId: string; duplicateId: string };
  }>("/merge", { onRequest: [requireAuth] }, async (req, reply) => {
    const { primaryId, duplicateId } = req.body;

    const [primary] = await db.select().from(contacts).where(eq(contacts.id, primaryId)).limit(1);
    const [duplicate] = await db.select().from(contacts).where(eq(contacts.id, duplicateId)).limit(1);

    if (!primary || !duplicate) return reply.code(404).send({ error: "Contact not found" });

    // Merge platform IDs
    const mergedPlatformIds = { ...(duplicate.platformIds as object), ...(primary.platformIds as object) };

    await db.update(contacts).set({ platformIds: mergedPlatformIds, updatedAt: new Date() })
      .where(eq(contacts.id, primaryId));

    // Reassign all FKs from duplicate → primary
    await db.update(conversations).set({ contactId: primaryId }).where(eq(conversations.contactId, duplicateId));
    await db.update(deals).set({ contactId: primaryId }).where(eq(deals.contactId, duplicateId));
    await db.update(activities).set({ contactId: primaryId }).where(eq(activities.contactId, duplicateId));

    // Soft-delete duplicate
    await db.update(contacts).set({ deletedAt: new Date() }).where(eq(contacts.id, duplicateId));

    return { ok: true, primaryId };
  });

  // GET /contacts/:id/activities
  app.get<{ Params: { id: string }; Querystring: { limit?: number } }>(
    "/:id/activities", { onRequest: [requireAuth] }, async (req) => {
      const rows = await db
        .select()
        .from(activities)
        .where(eq(activities.contactId, req.params.id))
        .orderBy(activities.createdAt)
        .limit(Number(req.query.limit ?? 50));

      return { data: rows };
    },
  );

  // GET /contacts/:id/conversations
  app.get<{ Params: { id: string } }>(
    "/:id/conversations", { onRequest: [requireAuth] }, async (req) => {
      const rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.contactId, req.params.id))
        .orderBy(conversations.lastMessageAt);

      return { data: rows };
    },
  );
}
