import dotenv from "dotenv";
import Fastify from "fastify";
import { app } from "../auth/github-auth.js";
import { registerHandlers } from "../handlers/index.js";
import { registerWebhookRoutes, setJobQueue } from "./webhook-server.js";
import { createJobQueue, createEventWorker } from "../queue/job-queue.js";

dotenv.config();

async function main() {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY || !process.env.GITHUB_WEBHOOK_SECRET) {
    console.error("Missing required environment variables: GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET");
    process.exit(1);
  }

  const server = Fastify({ logger: true });

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  let jobQueue: ReturnType<typeof createJobQueue> | undefined;
  let worker: ReturnType<typeof createEventWorker> | undefined;

  try {
    jobQueue = createJobQueue(redisUrl);
    worker = createEventWorker(redisUrl, app);
    setJobQueue(jobQueue);
    console.log(`BullMQ worker started with Redis at ${redisUrl}`);
  } catch (error) {
    console.warn(`Failed to connect to Redis at ${redisUrl}. Falling back to inline webhook dispatch.`, error);
    setJobQueue(undefined);
  }

  registerWebhookRoutes(server);
  registerHandlers(app);

  const port = Number(process.env.PORT ?? 3000);
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on http://0.0.0.0:${port}`);

  const shutdown = async () => {
    if (worker) await worker.close();
    if (jobQueue) await jobQueue.close();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
