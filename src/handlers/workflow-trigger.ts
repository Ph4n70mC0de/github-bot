import type { App } from "@octokit/app";
import { getInstallationClient } from "../auth/github-auth.js";
import { logger } from "../utils/logger.js";

const DEFAULT_WORKFLOW_FILE = "ci.yml";
const DEFAULT_REF = "main";

export interface WorkflowTriggerOptions {
  readonly workflowId?: string;
  readonly ref?: string;
  readonly inputs?: Record<string, string>;
}

/**
 * Triggers a GitHub Actions workflow run via `workflow_dispatch`.
 *
 * This is the core reusable utility from Phase 5.
 */
export async function triggerWorkflow(
  client: Awaited<ReturnType<typeof getInstallationClient>>,
  owner: string,
  repo: string,
  options: WorkflowTriggerOptions = {},
) {
  const {
    workflowId = DEFAULT_WORKFLOW_FILE,
    ref = DEFAULT_REF,
    inputs = {},
  } = options;

  await client.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs,
  });

  logger.info(
    { owner, repo, workflowId: workflowId, ref, inputs },
    "Triggered workflow_dispatch",
  );
}

function parseWorkflowTriggerFromTitle(title: string): { workflowId: string; ref: string } | null {
  const match = title.match(/^workflow:\s*([^;]+)(?:;\s*ref=(.+))?$/i);
  if (!match) return null;

  return {
    workflowId: match[1].trim(),
    ref: match[2]?.trim() ?? DEFAULT_REF,
  };
}

export function registerWorkflowHandlers(app: App) {
  /**
   * Example configurable trigger:
   * - Listens on `issues.opened`.
   * - If the issue title starts with `workflow: <workflow-id>[; ref=<branch>]`,
   *   dispatch that workflow.
   *
   * This is intentionally narrow to avoid accidental triggers.
   */
  app.webhooks.on("issues.opened", async ({ payload }) => {
    const { issue, repository, installation, sender } = payload as any;

    if (sender?.type === "Bot") {
      logger.debug("Skipping bot-generated issues.opened in workflow trigger");
      return;
    }

    if (!issue || !repository || !installation?.id) {
      logger.warn(
        { issue, repository, installation },
        "Missing required fields for workflow trigger handler",
      );
      return;
    }

    const trigger = parseWorkflowTriggerFromTitle(issue.title);
    if (!trigger) {
      return;
    }

    try {
      const client = await getInstallationClient(installation.id);
      const owner = repository.owner.login;
      const repo = repository.name;

      await triggerWorkflow(client, owner, repo, {
        workflowId: trigger.workflowId,
        ref: trigger.ref,
      });

      await client.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `? Triggered workflow \`${trigger.workflowId}\` on ref \`${trigger.ref}\`.`,
      });
    } catch (error) {
      logger.error(
        {
          error,
          repo: repository.full_name,
          issue: issue.number,
        },
        "Failed triggering workflow from issue",
      );
      throw error;
    }
  });
}
