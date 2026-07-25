import type { App } from "@octokit/app";
import { getInstallationClient } from "../auth/github-auth.js";
import { logger } from "../utils/logger.js";

const MERGE_METHOD = "squash" as const;
const MERGE_RETRY_DELAY_MS = 2_000;

interface AutoMergePayload {
  check_suite: {
    id: number;
    conclusion: string | null;
    pull_requests: Array<{
      number: number;
      url: string;
    }>;
  };
  repository: {
    full_name: string;
    name: string;
    owner: { login: string };
  };
  installation: {
    id: number;
  };
  sender: { type?: string; login?: string } | null;
}

/**
 * Best-effort wait for GitHub to compute `mergeable` when it comes back as `null`.
 */
async function waitForMergeable(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, MERGE_RETRY_DELAY_MS));
}

async function isAutoMergeCandidate(
  client: Awaited<ReturnType<typeof getInstallationClient>>,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<{ eligible: boolean; reason?: string }> {
  const { data: pr } = await client.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  if (!pr) {
    return { eligible: false, reason: "missing-pull-request" };
  }

  // 1. Explicit opt-in label required (Plan.md section 9.4)
  const hasAutoMergeLabel = (pr.labels ?? []).some(
    (l: { name: string }) => l.name === "auto-merge",
  );
  if (!hasAutoMergeLabel) {
    return { eligible: false, reason: "missing-auto-merge-label" };
  }

  // 2. Already merged? Do not attempt again
  if (pr.merged) {
    return { eligible: false, reason: "already-merged" };
  }

  // 3. Draft PRs are in-progress, do not merge
  if (pr.draft) {
    return { eligible: false, reason: "draft-pr" };
  }

  // 4. Mergeable can be `null` while GitHub computes it (Plan.md section 14)
  if (pr.mergeable === null) {
    await waitForMergeable();
    // After waiting, we do a single re-fetch to avoid blindly merging
    const { data: refetched } = await client.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    if (!refetched) {
      return { eligible: false, reason: "refetch-missing" };
    }

    if (refetched.merged) {
      return { eligible: false, reason: "merged-while-waiting" };
    }
    if (refetched.mergeable !== true) {
      return { eligible: false, reason: "mergeable-false" };
    }
  } else if (pr.mergeable !== true) {
    return { eligible: false, reason: "mergeable-false" };
  }

  // 5. Pending reviews may block merging; safeguard without demanding all approvals
  if ((pr.requested_reviewers ?? []).length > 0) {
    return { eligible: false, reason: "pending-review-requests" };
  }

  return { eligible: true };
}

async function tryAutoMerge(
  client: Awaited<ReturnType<typeof getInstallationClient>>,
  owner: string,
  repo: string,
  pullNumber: number,
) {
  try {
    const { eligible, reason } = await isAutoMergeCandidate(
      client,
      owner,
      repo,
      pullNumber,
    );

    if (!eligible) {
      logger.debug(
        { repo: `${owner}/${repo}`, pr: pullNumber, reason },
        "PR not eligible for auto-merge",
      );
      return;
    }

    await client.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: MERGE_METHOD,
    });

    logger.info(
      { repo: `${owner}/${repo}`, pr: pullNumber, mergeMethod: MERGE_METHOD },
      "Auto-merged pull request",
    );
  } catch (error) {
    // GitHub returns 409 / 405 when the merge state changes between check and merge.
    // Log and swallow so we do not retry blindly.
    logger.error(
      { error, repo: `${owner}/${repo}`, pr: pullNumber },
      "Failed to auto-merge pull request",
    );
  }
}

export function registerMergeHandlers(app: App) {
  // Trigger on check_suite completion, not directly on PR events.
  // This ensures CI has passed before evaluating merge eligibility.
  app.webhooks.on("check_suite.completed", async ({ payload }) => {
    const event = payload as unknown as AutoMergePayload;
    const { check_suite, repository, installation, sender } = event;

    // Ignore events triggered by bots to prevent loops
    if (sender?.type === "Bot") {
      logger.debug("Ignoring bot-generated check_suite.completed event");
      return;
    }

    // Only act on successful CI
    if (!check_suite || check_suite.conclusion !== "success") {
      return;
    }

    if (!repository || !installation?.id || !check_suite.pull_requests) {
      logger.warn(
        { checkSuite: check_suite?.id },
        "Missing fields for auto-merge handler",
      );
      return;
    }

    try {
      const client = await getInstallationClient(installation.id);
      const owner = repository.owner.login;
      const repo = repository.name;

      for (const pr of check_suite.pull_requests) {
        await tryAutoMerge(client, owner, repo, pr.number);
      }
    } catch (error) {
      logger.error(
        {
          error,
          repo: repository.full_name,
          checkSuite: check_suite.id,
        },
        "Failed processing check_suite.completed",
      );
      throw error;
    }
  });
}
