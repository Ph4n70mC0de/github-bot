import { App } from "@octokit/app";

/**
 * Singleton GitHub App instance.
 *
 * @octokit/app handles:
 * - JWT generation from the private key
 * - Installation token caching (1-hour TTL, auto-refresh)
 * - Webhook verification via the underlying Webhooks instance
 */
export const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
  },
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
