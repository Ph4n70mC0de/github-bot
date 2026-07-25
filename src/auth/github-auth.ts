import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

/**
 * Singleton GitHub App instance.
 *
 * @octokit/app handles:
 * - JWT generation from the private key
 * - Installation token caching (1-hour TTL, auto-refresh)
 * - Webhook verification via the underlying Webhooks instance
 *
 * We pass `@octokit/rest` as the Octokit constructor so returned
 * installation clients expose the `.rest` plugin used by handlers.
 */
export const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
  Octokit: Octokit as any,
});

/**
 * Returns an authenticated Octokit client scoped to a specific installation.
 *
 * This is the preferred way to call GitHub in webhook handlers.
 * Do NOT manually generate JWT/installation tokens.
 */
export async function getInstallationClient(installationId: number) {
  return app.getInstallationOctokit(installationId);
}

export type { App };
