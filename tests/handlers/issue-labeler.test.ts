import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/auth/github-auth.js", () => ({
  getInstallationClient: vi.fn().mockResolvedValue({
    rest: {
      issues: {
        addLabels: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
      },
    },
  }),
}));

import { registerIssueHandlers } from "../../src/handlers/issue-labeler";

describe("registerIssueHandlers", () => {
  let app: any;

  beforeEach(() => {
    app = {
      webhooks: {
        on: vi.fn(),
        onError: vi.fn(),
      },
    };
  });

  it("registers issues.opened handler", () => {
    registerIssueHandlers(app);
    expect(app.webhooks.on).toHaveBeenCalledWith("issues.opened", expect.any(Function));
  });

  it("registers issues.closed handler", () => {
    registerIssueHandlers(app);
    expect(app.webhooks.on).toHaveBeenCalledWith("issues.closed", expect.any(Function));
  });
});
