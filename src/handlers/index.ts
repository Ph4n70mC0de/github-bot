import type { App } from "@octokit/app";
import { registerPRHandlers } from "./pr-review.js";
import { registerIssueHandlers } from "./issue-labeler.js";
import { registerMergeHandlers } from "./auto-merge.js";
import { registerWorkflowHandlers } from "./workflow-trigger.js";
import { logger } from "../utils/logger.js";

/**
 * Registers all webhook event handlers on the Octokit App.
 */
export function registerHandlers(app: App) {
  registerPRHandlers(app);
  registerIssueHandlers(app);
  registerMergeHandlers(app);
  registerWorkflowHandlers(app);

  // Global error handler for all webhooks
  app.webhooks.onError((error) => {
    logger.error(error, "Webhook handler error");
  });
}
