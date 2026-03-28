import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { createRedisClient } from "@crm/redis";

const log = createLogger("notification-service");

const httpServer = createServer();

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.WEB_URL ?? "http://localhost:3004",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// JWT auth middleware — runs before any socket connection is established
io.use((socket, next) => {
  const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization?.replace("Bearer ", "");
  if (!token) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: string };
    (socket as any).userId = payload.sub;
    (socket as any).userRole = payload.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId: string = (socket as any).userId;
  const userRole: string = (socket as any).userRole;

  log.info({ userId, userRole }, "Agent connected");

  // Mark agent as online (expires in 5min — refreshed on reconnect)
  const redis = createRedisClient();
  redis.set(`agent:${userId}:online`, "1", "EX", 300);

  // Join personal room for direct notifications
  socket.join(`agent:${userId}`);

  // Managers join the broadcast room for dashboard updates
  if (userRole === "manager" || userRole === "admin") {
    socket.join("managers");
  }

  // Join a conversation room to receive its messages
  socket.on("join_conversation", ({ conversationId }: { conversationId: string }) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on("leave_conversation", ({ conversationId }: { conversationId: string }) => {
    socket.leave(`conv:${conversationId}`);
  });

  socket.on("typing_start", ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit("agent_typing", { conversationId, agentId: userId });
  });

  socket.on("typing_stop", ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit("agent_typing_stop", { conversationId, agentId: userId });
  });

  socket.on("mark_read", ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit("messages_read", { conversationId, agentId: userId });
  });

  socket.on("disconnect", () => {
    log.info({ userId }, "Agent disconnected");
    redis.del(`agent:${userId}:online`);
    redis.quit();
  });
});

// Subscribe to notification channel published by conversation-service
async function startNotificationSubscriber() {
  const sub = createRedisClient();

  sub.on("message", (channel: string, raw: string) => {
    if (channel !== "notifications") return;
    try {
      const notification = JSON.parse(raw);

      if (notification.type === "new_message") {
        const { conversationId, assignedAgent, ...rest } = notification;

        // Broadcast to all agents watching this conversation
        io.to(`conv:${conversationId}`).emit("new_message", { conversationId, ...rest });

        // Direct notify the assigned agent
        if (assignedAgent) {
          io.to(`agent:${assignedAgent}`).emit("conversation_assigned", {
            conversationId,
            ...rest,
          });
        }

        // Update manager dashboard
        io.to("managers").emit("inbox_update", { conversationId, ...rest });
      }
    } catch (err) {
      log.error({ err, raw }, "Failed to parse notification");
    }
  });

  await sub.subscribe("notifications");
  log.info("Subscribed to Redis notifications channel");
}

startNotificationSubscriber().catch((err) => {
  log.error({ err }, "Notification subscriber failed");
  process.exit(1);
});

httpServer.listen(env.NOTIFICATION_SERVICE_PORT, () => {
  log.info(`Notification service (WebSocket) listening on port ${env.NOTIFICATION_SERVICE_PORT}`);
});
