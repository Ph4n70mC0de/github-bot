import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/auth/github-auth.js", () => ({
  getInstallationClient: vi.fn().mockResolvedValue({
    rest: {
      pulls: {
        listFiles: vi.fn().mockResolvedValue({ data: [] }),
        createReview: vi.fn().mockResolvedValue({}),
        listReviews: vi.fn().mockResolvedValue({ data: [] }),
        get: vi.fn().mockResolvedValue({
          data: {
            number: 1,
            labels: [],
            mergeable: true,
            draft: false,
            requested_reviewers: [],
            merged: false,
          },
        }),
      },
    },
  }),
}));

import { registerPRHandlers } from "../../src/handlers/pr-review";

describe("registerPRHandlers", () => {
  let app: any;

  beforeEach(() => {
    app = {
      webhooks: {
        on: vi.fn(),
        onError: vi.fn(),
      },
    };
  });

  it("registers pull_request.opened handler", () => {
    registerPRHandlers(app);
    expect(app.webhooks.on).toHaveBeenCalledWith("pull_request.opened", expect.any(Function));
  });
});
