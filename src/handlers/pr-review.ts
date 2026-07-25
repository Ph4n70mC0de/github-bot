import type { App } from "@octokit/app";
import { getInstallationClient } from "../auth/github-auth.js";
import { logger } from "../utils/logger.js";
import { analyzeFiles, type FileAnalysisInput, type FileIssue } from "../logic/file-analyzer.js";

const BOT_LOGIN_CACHE_KEY = Symbol("botLoginCache");

declare module "@octokit/app" {
  interface App {
    [BOT_LOGIN_CACHE_KEY]?: string;
  }
}

/**
 * Lazily fetch and cache the GitHub App slug/login so we can identify
 * our own reviews and keep the handler idempotent across webhook retries.
 */
async function getBotLogin(app: App): Promise<string> {
  if (!app[BOT_LOGIN_CACHE_KEY]) {
    const { data } = await app.octokit.request("GET /app");
    if (!data) {
      throw new Error("Failed to fetch app info from GitHub");
    }
    app[BOT_LOGIN_CACHE_KEY] = data.slug as string;
  }
  return app[BOT_LOGIN_CACHE_KEY];
}

/**
 * Check whether the bot already reviewed this PR.
 *
 * This prevents duplicate reviews when GitHub retries webhook delivery.
 */
async function hasBotReviewed(
  client: Awaited<ReturnType<typeof getInstallationClient>>,
  owner: string,
  repo: string,
  pullNumber: number,
  botLogin: string,
): Promise<boolean> {
  try {
    const { data: reviews } = await client.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    return reviews.some(
      (review: { user?: { type?: string; login?: string } }) =>
        review.user?.type === "Bot" && review.user?.login === botLogin,
    );
  } catch (error) {
    logger.warn(
      { error, owner, repo, pullNumber },
      "Failed to list existing reviews; assuming no prior review",
    );
    return false;
  }
}

function mapFileToAnalysisInput(file: {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}): FileAnalysisInput {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
  };
}

export function registerPRHandlers(app: App) {
  app.webhooks.on("pull_request.opened", async ({ payload }) => {
    const eventPayload = payload as any;
    const pr = eventPayload.pull_request;
    const repository = eventPayload.repository;
    const installation = eventPayload.installation;

    if (!pr || !repository || !installation?.id) {
      logger.warn(
        { pull_request: pr, repository, installation },
        "Missing required fields for pull_request.opened handler",
      );
      return;
    }

    try {
      const client = await getInstallationClient(installation.id);
      const owner = repository.owner.login;
      const repo = repository.name;

      // Idempotency: skip if we already reviewed this PR
      const botLogin = await getBotLogin(app);
      if (await hasBotReviewed(client, owner, repo, pr.number, botLogin)) {
        logger.info(
          { repo: repository.full_name, pr: pr.number },
          "Skipping pull_request.opened; bot already reviewed",
        );
        return;
      }

      const { data: files } = await client.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
      });

      const analysisInputs: FileAnalysisInput[] = files.map(mapFileToAnalysisInput);
      const issues: FileIssue[] = analyzeFiles(analysisInputs);

      if (issues.length > 0) {
        await client.rest.pulls.createReview({
          owner,
          repo,
          pull_number: pr.number,
          event: "REQUEST_CHANGES" as const,
          body:
            "Automated review found issues. Please review the inline comments below.",
          comments: issues.map((issue) => ({
            path: issue.filePath,
            line: issue.line,
            body: `[${issue.severity.toUpperCase()}] ${issue.message}`,
          })),
        });

        logger.info(
          { repo: repository.full_name, pr: pr.number, issueCount: issues.length },
          "Posted REQUEST_CHANGES review",
        );
      } else {
        await client.rest.pulls.createReview({
          owner,
          repo,
          pull_number: pr.number,
          event: "APPROVE" as const,
          body: "? Automated checks passed.",
        });

        logger.info(
          { repo: repository.full_name, pr: pr.number },
          "Posted APPROVE review",
        );
      }
    } catch (error) {
      logger.error(
        {
          error,
          repo: repository?.full_name,
          pr: pr?.number,
          installation: installation?.id,
        },
        "Failed processing pull_request.opened",
      );
      throw error;
    }
  });
}
