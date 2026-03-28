import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@crm/db";
import { requireAuth, requireManager } from "../middleware/auth";

export async function userRoutes(app: FastifyInstance) {
  app.get("/", { onRequest: [requireAuth] }, async () => {
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl })
      .from(users);
    return { data: rows };
  });

  app.post<{
    Body: { email: string; name: string; password: string; role?: "agent" | "manager" };
  }>("/", { onRequest: [requireManager] }, async (req) => {
    const hash = await bcrypt.hash(req.body.password, 12);
    const [user] = await db.insert(users).values({
      email:        req.body.email.toLowerCase(),
      name:         req.body.name,
      passwordHash: hash,
      role:         req.body.role ?? "agent",
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    return user;
  });

  app.patch<{
    Params: { id: string };
    Body: { name?: string; role?: string; avatarUrl?: string };
  }>("/:id", { onRequest: [requireManager] }, async (req, reply) => {
    const [updated] = await db
      .update(users)
      .set({ ...req.body, updatedAt: new Date() } as any)
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id, name: users.name, role: users.role });
    if (!updated) return reply.code(404).send({ error: "Not found" });
    return updated;
  });
}
