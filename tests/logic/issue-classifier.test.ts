import { describe, it, expect } from "vitest";
import { classifyIssue } from "../../src/logic/issue-classifier";

describe("classifyIssue", () => {
  it("classifies bug reports", () => {
    const result = classifyIssue("Bug in login", "The app crashes when clicking submit");
    expect(result.labels).toContain("bug");
  });

  it("classifies documentation requests", () => {
    const result = classifyIssue("Update README", "Please improve the docs");
    expect(result.labels).toContain("documentation");
  });

  it("returns confidence high when multiple labels match", () => {
    const result = classifyIssue("Bug: performance issue", "This is a security vulnerability");
    expect(result.confidence).toBe("high");
  });

  it("returns empty labels when no patterns match", () => {
    const result = classifyIssue("General feedback", "Just some thoughts");
    expect(result.labels).toEqual([]);
    expect(result.confidence).toBe("low");
  });
});
