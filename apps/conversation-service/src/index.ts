import { createConsumer, CONSUMER_GROUPS } from "@crm/redis";
import { createLogger } from "@crm/logger";
import { handleInboundMessage } from "./handlers/inbound-message.handler";

const log = createLogger("conversation-service");

const consumer = createConsumer({
  group: CONSUMER_GROUPS.conversation,
  consumer: `worker-${process.env.HOSTNAME ?? "1"}`,
  count: 10,
  blockMs: 5000,
});

log.info("Starting conversation service...");

consumer.run(handleInboundMessage).catch((err) => {
  log.error({ err }, "Consumer crashed");
  process.exit(1);
});
