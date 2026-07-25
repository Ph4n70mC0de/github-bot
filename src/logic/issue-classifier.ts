/**
 * Deterministic, synchronous issue label classifier.
 *
 * Strategy:
 * - Use title/body keyword heuristics to suggest labels.
 * - Keep logic pure and side-effect free so it is easily unit-testable.
 * - Return deduplicated labels in a stable order.
 */

const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "bug", regex: /\b(bug|error|crash|broken|failing|failure|fixme|todo)\b/i },
  { label: "enhancement", regex: /\b(enhancement|feature|improvement|proposal|roadmap)\b/i },
  { label: "question", regex: /\b(question|how to|why|support|help)\b/i },
  { label: "documentation", regex: /\b(documentation|docs|readme|wiki|guide)\b/i },
  { label: "help wanted", regex: /\b(help wanted|good first issue|beginner|starter)\b/i },
  { label: "security", regex: /\b(security|vulnerability|cve|exploit|secre)\b/i },
  { label: "performance", regex: /\b(performance|slow|latency|throughput|memory|leak)\b/i },
  { label: "dependencies", regex: /\b(dependabot|dependencies|lockfile|npm|yarn|pnpm)\b/i },
];

export interface IssueClassificationResult {
  readonly labels: string[];
  readonly confidence: "low" | "medium" | "high";
}

export function classifyIssue(title: string, body: string): IssueClassificationResult {
  const text = `${title}\n${body}`;

  const matches = PATTERNS.filter(({ regex }) => regex.test(text)).map(({ label }) => label);

  const labels = Array.from(new Set(matches));

  let confidence: IssueClassificationResult["confidence"] = "low";
  if (labels.length >= 3) confidence = "high";
  else if (labels.length >= 1) confidence = "medium";

  return {
    labels,
    confidence,
  };
}
