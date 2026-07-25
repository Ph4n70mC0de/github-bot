import type { App } from "@octokit/app";
import { logger } from "../utils/logger.js";

/**
 * Registers all webhook event handlers on the Octokit App.
 *
 * Phase 1: This is a logging-only router. Handler logic lands in later phases.
 * Every supported event type is wired up with structured logging so we can
 * verify end-to-end delivery before adding business logic.
 */
export function registerHandlers(app: App) {
  app.webhooks.on("push", async ({ payload }) => {
    logger.info(
      {
        repo: payload.repository?.full_name,
        branch: payload.ref,
        sender: payload?.sender?.login,
      },
      "Received push event",
    );
  });

  app.webhooks.on("pull_request.opened", async ({ payload }) => {
    const { pull_request: pr, repository } = payload;
    logger.info(
      {
        repo: repository?.full_name,
        pr: pr?.number,
        sender: payload?.sender?.type,
      },
      "Received pull_request.opened event",
    );
  });

  app.webhooks.on("pull_request.closed", async ({ payload }) => {
    const { pull_request: pr, repository } = payload;
    logger.info(
      {
        repo: repository?.full_name,
        pr: pr?.number,
        merged: pr?.merged,
      },
      "Received pull_request.closed event",
    );
  });

  app.webhooks.on("issues.opened", async ({ payload }) => {
    const { issue, repository } = payload;
    logger.info(
      {
        repo: repository?.full_name,
        issue: issue?.number,
        sender: payload?.sender?.type,
      },
      "Received issues.opened event",
    );
  });

  app.webhooks.on("issue_comment.created", async ({ payload }) => {
    // Guard against bot-triggered event loops per plan Section 14
    if (payload.sender?.type === "Bot") {
      logger.debug("Ignoring bot-generated issue_comment event");
      return;
    }

    logger.info(
      {
        repo: payload.repository?.full_name,
        issue: payload.issue?.number,
        comment: payload.comment?.id,
        sender: payload?.sender?.login,
      },
      "Received issue_comment.created event",
    );
  });

  app.webhooks.on("check_suite.completed", async ({ payload }) => {
    const { check_suite, repository } = payload;
    logger.info(
      {
        repo: repository?.full_name,
        checkSuite: check_suite?.id,
        conclusion: check_suite?.conclusion,
      },
      "Received check_suite.completed event",
    );
  });

  app.webhooks.on("workflow_run.completed", async ({ payload }) => {
    const { workflow_run, repository } = payload;
    logger.info(
      {
        repo: repository?.full_name,
        workflowRun: workflow_run?.id,
        conclusion: workflow_run?.conclusion,
      },
      "Received workflow_run.completed event",
    );
  });

  // Global error logger for all registered handlers
  app.webhooks.onError((error) => {
    logger.error(error, "Webhook handler error");
  });
}
