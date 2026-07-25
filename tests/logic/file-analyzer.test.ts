import { describe, it, expect } from "vitest";
import { analyzeFiles } from "../../src/logic/file-analyzer";

describe("analyzeFiles", () => {
  it("flags large files by additions", () => {
    const issues = analyzeFiles([
      { filename: "big.ts", status: "added", additions: 1200, deletions: 0, changes: 1200 },
    ]);
    expect(issues).toContainEqual(
      expect.objectContaining({
        filePath: "big.ts",
        severity: "warning",
      }),
    );
  });

  it("flags deleted files", () => {
    const issues = analyzeFiles([
      { filename: "old.ts", status: "removed", additions: 0, deletions: 10, changes: 10 },
    ]);
    expect(issues).toContainEqual(
      expect.objectContaining({
        filePath: "old.ts",
        message: "Deleted file detected. Ensure this removal is intentional and documented.",
        severity: "info",
      }),
    );
  });

  it("warns about generated files", () => {
    const issues = analyzeFiles([
      { filename: "dist/bundle.js", status: "added", additions: 500, deletions: 0, changes: 500 },
    ]);
    expect(issues).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("Generated file"),
        severity: "warning",
      }),
    );
  });

  it("returns empty array for clean PRs", () => {
    const issues = analyzeFiles([
      { filename: "main.ts", status: "added", additions: 50, deletions: 0, changes: 50 },
    ]);
    expect(issues).toEqual([]);
  });
});
