import type { FastifyInstance } from "fastify";
import { app } from "../auth/github-auth.js";
import type { JobQueue } from "../queue/job-queue.js";
import { registry } from "../utils/metrics.js";

let jobQueue: JobQueue | undefined;

export function setJobQueue(queue: JobQueue | undefined) {
  jobQueue = queue;
}

/**
 * Registers webhook-related routes on the Fastify instance.
 */
export function registerWebhookRoutes(server: FastifyInstance) {
  server.post("/webhooks", async (request, reply) => {
    try {
      const payloadString = JSON.stringify(request.body);
      const signature = request.headers["x-hub-signature-256"] as string;

      const valid = await app.webhooks.verify(payloadString, signature);
      if (!valid) {
        reply.code(400).send({ error: "Invalid webhook" });
        return;
      }

      if (!jobQueue) {
        await app.webhooks.receive({
          id: request.headers["x-github-delivery"] as string,
          name: request.headers["x-github-event"] as string,
          payload: request.body,
        } as any);

        reply.send({ ok: true });
        return;
      }

      await jobQueue.add("github-event", {
        id: request.headers["x-github-delivery"] as string,
        name: request.headers["x-github-event"] as string,
        payload: request.body,
      });

      reply.send({ queued: true });
    } catch (error) {
      request.log.error(error, "Webhook processing failed");
      reply.code(400).send({ error: "Invalid webhook" });
    }
  });

  server.get("/health", async () => ({ status: "ok" }));

  server.get("/metrics", async (_request, reply) => {
    reply.header("Content-Type", registry.contentType);
    reply.send(await registry.metrics());
  });
}
