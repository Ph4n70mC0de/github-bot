import dotenv from "dotenv";
import Fastify from "fastify";
import { app } from "../auth/github-auth.js";
import { registerHandlers } from "../handlers/index.js";
import { registerWebhookRoutes } from "./webhook-server.js";

dotenv.config();

async function main() {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY || !process.env.GITHUB_WEBHOOK_SECRET) {
    console.error("Missing required environment variables: GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET");
    process.exit(1);
  }

  const server = Fastify({ logger: true });

  registerWebhookRoutes(server);
  registerHandlers(app);

  const port = Number(process.env.PORT ?? 3000);
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on http://0.0.0.0:${port}`);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
