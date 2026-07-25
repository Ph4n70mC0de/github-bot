import type { FastifyInstance } from "fastify";
import { app } from "../auth/github-auth.js";

/**
 * Registers webhook-related routes on the Fastify instance.
 *
 * Phase 1 deliverable:
 * - POST /webhooks  -> HMAC-SHA256 signature verification + event dispatch
 * - GET  /health     -> liveness probe
 */
export function registerWebhookRoutes(server: FastifyInstance) {
  server.post("/webhooks", async (request, reply) => {
    try {
      await app.webhooks.verifyAndReceive({
        id: request.headers["x-github-delivery"] as string,
        name: request.headers["x-github-event"] as string,
        signature: request.headers["x-hub-signature-256"] as string,
        payload: JSON.stringify(request.body),
      });

      reply.send({ ok: true });
    } catch (error) {
      request.log.error(error, "Invalid webhook");
      reply.code(400).send({ error: "Invalid webhook" });
    }
  });

  server.get("/health", async () => ({ status: "ok" }));
}
