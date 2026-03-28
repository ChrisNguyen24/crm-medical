import type { FastifyInstance } from "fastify";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { db, conversations, messages, contacts, users, channelConfigs } from "@crm/db";
import { requireAuth, type JwtPayload } from "../middleware/auth";
import { createLogger } from "@crm/logger";
import { sendToPlatform } from "../services/send.service";

const log = createLogger("crm-service:conversations");

export async function conversationRoutes(app: FastifyInstance) {
  // GET /conversations
  app.get<{
    Querystring: {
      status?: string;
      channel?: string;
      assigned_agent?: string;
      contact_id?: string;
      limit?: number;
      cursor?: string;
    };
  }>("/", { onRequest: [requireAuth] }, async (req) => {
    const { status, channel, contact_id, limit = 30, cursor } = req.query;
    const user = req.user as JwtPayload;

    const filters: ReturnType<typeof eq>[] = [];

    // Agents only see their own conversations; managers see all
    if (user.role === "agent") {
      filters.push(eq(conversations.assignedAgent, user.sub));
    }
    if (status) filters.push(eq(conversations.status, status as any));
    if (channel) filters.push(eq(conversations.channel, channel as any));
    if (contact_id) filters.push(eq(conversations.contactId, contact_id));
    if (cursor) filters.push(lt(conversations.lastMessageAt, new Date(cursor)));

    const rows = await db
      .select({
        id:              conversations.id,
        channel:          conversations.channel,
        status:           conversations.status,
        lastMessageAt:    conversations.lastMessageAt,
        lastMessageText:  conversations.lastMessageText,
        assignedAgent:    conversations.assignedAgent,
        isStarred:        conversations.isStarred,
        isUnreadByAgent:  conversations.isUnreadByAgent,
        contact: {
          id:          contacts.id,
          displayName: contacts.displayName,
          avatarUrl:   contacts.avatarUrl,
          phone:       contacts.phone,
        },
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(and(...filters))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(Number(limit));

    return { data: rows, hasMore: rows.length === Number(limit) };
  });

  // GET /conversations/:id
  app.get<{ Params: { id: string } }>(
    "/:id", { onRequest: [requireAuth] }, async (req, reply) => {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, req.params.id))
        .limit(1);

      if (!conv) return reply.code(404).send({ error: "Not found" });
      return conv;
    },
  );

  // GET /conversations/:id/messages
  app.get<{
    Params: { id: string };
    Querystring: { limit?: number; before?: string };
  }>("/:id/messages", { onRequest: [requireAuth] }, async (req) => {
    const { limit = 50, before } = req.query;
    const filters = [eq(messages.conversationId, req.params.id)];
    if (before) filters.push(lt(messages.createdAt, new Date(before)));

    const rows = await db
      .select()
      .from(messages)
      .where(and(...filters))
      .orderBy(desc(messages.createdAt))
      .limit(Number(limit));

    return { data: rows.reverse(), hasMore: rows.length === Number(limit) }; // chronological order
  });

  // POST /conversations/:id/messages  (send outbound)
  app.post<{
    Params: { id: string };
    Body: { text: string };
  }>("/:id/messages", { onRequest: [requireAuth] }, async (req, reply) => {
    const user = req.user as JwtPayload;
    const { text } = req.body;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, req.params.id))
      .limit(1);

    if (!conv) return reply.code(404).send({ error: "Not found" });

    // Look up the channel access token from channel_configs
    const [config] = await db
      .select({ accessTokenEnc: channelConfigs.accessTokenEnc, externalAccountId: channelConfigs.externalAccountId })
      .from(channelConfigs)
      .where(and(eq(channelConfigs.channel, conv.channel), eq(channelConfigs.isActive, "true")))
      .limit(1);

    // Get contact's platform sender ID for the recipient field
    const [contact] = await db
      .select({ platformIds: contacts.platformIds })
      .from(contacts)
      .where(eq(contacts.id, conv.contactId))
      .limit(1);

    const platformIds = (contact?.platformIds ?? {}) as Record<string, string>;
    const recipientId = platformIds[conv.channel];

    // Send to platform (non-blocking — save message regardless of send result)
    let externalMsgId = `local_${Date.now()}`;
    if (config?.accessTokenEnc && recipientId && (conv.channel === "facebook" || conv.channel === "zalo")) {
      // NOTE: accessTokenEnc should be decrypted with MASTER_KEY in production
      // For now treating as plaintext during development
      const result = await sendToPlatform({
        platform:    conv.channel,
        recipientId,
        text,
        accessToken: config.accessTokenEnc,
      });
      if (result.messageId) externalMsgId = result.messageId;
      if (!result.ok) log.warn({ error: result.error, platform: conv.channel }, "Platform send failed, message saved locally");
    }

    const [saved] = await db.insert(messages).values({
      conversationId: conv.id,
      direction:      "outbound",
      channel:        conv.channel,
      externalMsgId,
      senderType:     "agent",
      senderId:       user.sub,
      contentType:    "text",
      text,
      attachments:    [],
      createdAt:      new Date(),
    }).returning();

    // Update last message
    await db.update(conversations).set({
      lastMessageAt:   new Date(),
      lastMessageText: text.slice(0, 200),
      updatedAt:       new Date(),
    }).where(eq(conversations.id, conv.id));

    log.info({ conversationId: conv.id, agentId: user.sub }, "Outbound message sent");
    return saved;
  });

  // PATCH /conversations/:id
  app.patch<{
    Params: { id: string };
    Body: { status?: string; assigned_agent?: string; is_starred?: boolean; is_unread_by_agent?: boolean };
  }>("/:id", { onRequest: [requireAuth] }, async (req, reply) => {
    const { status, assigned_agent, is_starred, is_unread_by_agent } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (assigned_agent !== undefined) updates.assignedAgent = assigned_agent || null;
    if (is_starred !== undefined) updates.isStarred = is_starred;
    if (is_unread_by_agent !== undefined) updates.isUnreadByAgent = is_unread_by_agent;

    const [updated] = await db
      .update(conversations)
      .set(updates as any)
      .where(eq(conversations.id, req.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "Not found" });
    return updated;
  });

  // POST /conversations/:id/resolve
  app.post<{ Params: { id: string } }>(
    "/:id/resolve", { onRequest: [requireAuth] }, async (req, reply) => {
      const [updated] = await db
        .update(conversations)
        .set({ status: "resolved", updatedAt: new Date() })
        .where(eq(conversations.id, req.params.id))
        .returning({ id: conversations.id });

      if (!updated) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  // POST /conversations/:id/reopen
  app.post<{ Params: { id: string } }>(
    "/:id/reopen", { onRequest: [requireAuth] }, async (req, reply) => {
      const [updated] = await db
        .update(conversations)
        .set({ status: "open", updatedAt: new Date() })
        .where(eq(conversations.id, req.params.id))
        .returning({ id: conversations.id });

      if (!updated) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
