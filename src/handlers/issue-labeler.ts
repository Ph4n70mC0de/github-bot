import type { App } from "@octokit/app";
import { getInstallationClient } from "../auth/github-auth.js";
import { logger } from "../utils/logger.js";
import { classifyIssue, type IssueClassificationResult } from "../logic/issue-classifier.js";

/**
 * Core issue-handling behavior.
 *
 * Current Phase 2 deliverable:
 * - `issues.opened`: apply heuristic labels and post an initial guidance comment.
 * - `issues.closed`: post a closure comment unless the bot itself closed it.
 *
 * Idempotency:
 * - We only add labels/comment if the classified labels are not already present.
 * - This makes the handler safe to replay on webhook retries.
 */
export function registerIssueHandlers(app: App) {
  app.webhooks.on("issues.opened", async ({ payload }) => {
    const { issue, repository, installation, sender } = payload;

    // Guard against bot loops and self-triggered events
    if (sender?.type === "Bot") {
      logger.debug(
        { repo: repository?.full_name, issue: issue?.number },
        "Skipping issues.opened because sender is a Bot",
      );
      return;
    }

    if (!issue || !repository || !installation?.id) {
      logger.warn(
        { payload: { issue, repository, installation } },
        "Missing required fields for issues.opened handler",
      );
      return;
    }

    try {
      const client = await getInstallationClient(installation.id);
      const title = issue.title ?? "";
      const body = (issue.body as string | undefined) ?? "";
      const { labels }: IssueClassificationResult = classifyIssue(title, body);

      if (labels.length === 0) {
        logger.info(
          { repo: repository.full_name, issue: issue.number },
          "No labels matched for issue",
        );
        return;
      }

      // Avoid duplicate labeling on retries
      const existing = new Set((issue.labels ?? []).map((l) => l.name));
      const newLabels = labels.filter((l) => !existing.has(l));

      if (newLabels.length > 0) {
        await client.rest.issues.addLabels({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          labels: newLabels,
        });

        await client.rest.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: `I\'ve automatically labeled this issue as: ${newLabels.map((l) => `\`${l}\``).join(", ")}.\n\nIf these labels are incorrect, feel free to adjust them.`,
        });

        logger.info(
          {
            repo: repository.full_name,
            issue: issue.number,
            labels: newLabels,
          },
          "Applied labels to issue",
        );
      }
    } catch (error) {
      logger.error(
        {
          error,
          repo: repository.full_name,
          issue: issue.number,
          installation: installation.id,
        },
        "Failed processing issues.opened",
      );
      // Rethrow so app.webhooks.onError can capture it globally
      throw error;
    }
  });

  app.webhooks.on("issues.closed", async ({ payload }) => {
    const { issue, repository, installation, sender } = payload;

    // Avoid commenting on our own close actions
    if (sender?.type === "Bot") {
      logger.debug(
        { repo: repository?.full_name, issue: issue?.number },
        "Skipping issues.closed because sender is a Bot",
      );
      return;
    }

    if (!issue || !repository || !installation?.id) {
      logger.warn(
        { payload: { issue, repository, installation } },
        "Missing required fields for issues.closed handler",
      );
      return;
    }

    try {
      // Idempotency: if issue.body already contains our closing marker, skip
      const bodyText = (issue.body as string | undefined) ?? "";
      if (bodyText.includes("<!-- issue-closed-by-bot -->")) {
        return;
      }

      const client = await getInstallationClient(installation.id);

      await client.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: `Issue has been closed. Thanks for the report!\n\n<!-- issue-closed-by-bot -->`,
      });

      logger.info(
        { repo: repository.full_name, issue: issue.number },
        "Posted closure comment",
      );
    } catch (error) {
      logger.error(
        {
          error,
          repo: repository.full_name,
          issue: issue.number,
          installation: installation.id,
        },
        "Failed processing issues.closed",
      );
      throw error;
    }
  });
}
