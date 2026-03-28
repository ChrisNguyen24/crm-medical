import type { FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "agent" | "manager" | "admin";
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export async function requireManager(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  const user = req.user as JwtPayload;
  if (user.role !== "manager" && user.role !== "admin") {
    return reply.code(403).send({ error: "Forbidden" });
  }
}
