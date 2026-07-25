import { vi } from "vitest";

export interface MockReview {
  id: number;
  user: { type: string; login: string };
}

export interface MockPullRequest {
  number: number;
  labels: Array<{ name: string }>;
  mergeable: boolean | null;
  draft: boolean;
  requested_reviewers: Array<unknown>;
  merged: boolean;
}

export interface MockIssue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
}

export function createMockOctokit() {
  const reviews: MockReview[] = [];
  const labels: string[] = [];

  const mockOctokit = {
    rest: {
      pulls: {
        listFiles: vi.fn().mockResolvedValue({ data: [] }),
        createReview: vi.fn().mockResolvedValue({}),
        listReviews: vi.fn().mockResolvedValue({ data: reviews }),
        get: vi.fn().mockResolvedValue({
          data: {
            number: 1,
            labels,
            mergeable: true,
            draft: false,
            requested_reviewers: [],
            merged: false,
          } as MockPullRequest,
        }),
        merge: vi.fn().mockResolvedValue({}),
      },
      issues: {
        addLabels: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({
          data: {
            number: 1,
            title: "Test issue",
            body: "Test body",
            labels: [],
          } as MockIssue,
        }),
      },
    },
    request: vi.fn().mockResolvedValue({
      data: { slug: "github-bot" },
    }),
  };

  return mockOctokit as unknown as ReturnType<typeof import("@octokit/rest").Octokit>;
}
