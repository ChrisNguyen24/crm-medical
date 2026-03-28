import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@crm/db";
import { createLogger } from "@crm/logger";

const log = createLogger("crm-service:auth");

export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: { email: string; password: string };
  }>("/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email:    { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken  = app.jwt.sign(payload, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id }, { expiresIn: "7d" });

    log.info({ userId: user.id }, "Login successful");

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
    };
  });

  app.post<{ Body: { refreshToken: string } }>("/refresh", {
    schema: {
      body: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    try {
      const payload = app.jwt.verify<{ sub: string }>(req.body.refreshToken);

      const [user] = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user) return reply.code(401).send({ error: "User not found" });

      const accessToken = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: "15m" },
      );

      return { accessToken };
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
  });

  app.get("/me", {
    onRequest: [async (req, reply) => {
      try { await req.jwtVerify(); }
      catch { return reply.code(401).send({ error: "Unauthorized" }); }
    }],
  }, async (req) => {
    const payload = req.user as { sub: string };
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    return user;
  });
}
