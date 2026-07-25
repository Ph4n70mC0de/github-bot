import { Queue, Worker, type Job } from "bullmq";
import type { App } from "@octokit/app";
import { logger } from "../utils/logger.js";

export interface GitHubEventJobData {
  readonly id: string;
  readonly name: string;
  readonly payload: unknown;
}

export interface JobQueue {
  add(name: string, data: GitHubEventJobData): Promise<Job<GitHubEventJobData>>;
  close(): Promise<void>;
}

export function createJobQueue(redisUrl: string): JobQueue {
  const queue = new Queue<GitHubEventJobData>("github-events", {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 3600,
      },
    },
  });

  return {
    add: (name, data) => queue.add(name, data),
    close: async () => {
      await queue.close();
    },
  };
}

export function createEventWorker(
  redisUrl: string,
  app: App,
): Worker<GitHubEventJobData> {
  const worker = new Worker<GitHubEventJobData>(
    "github-events",
    async (job) => {
      await app.webhooks.receive({
        id: job.data.id,
        name: job.data.name,
        payload: job.data.payload,
      } as any);
    },
    {
      connection: { url: redisUrl },
      concurrency: 10,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, event: job?.data?.name, error: err },
      "Worker job failed",
    );
  });

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, event: job.data.name },
      "Worker job completed",
    );
  });

  return worker;
}
