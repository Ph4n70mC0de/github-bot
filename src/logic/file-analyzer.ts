/**
 * Pure, synchronous business logic for analyzing changed files in a PR.
 *
 * This is intentionally kept side-effect free so it is easy to unit-test
 * and reason about independently of GitHub API calls.
 */

export interface FileIssue {
  readonly filePath: string;
  readonly line: number;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface FileAnalysisInput {
  readonly filename: string;
  readonly status: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
}

const MAX_ADDITIONS_PER_FILE = 1000;
const MAX_DELETIONS_PER_FILE = 1000;
const MAX_CHANGES_PER_FILE = 1500;

function hasBinaryExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "ico",
    "pdf",
    "zip",
    "tar",
    "gz",
    "7z",
    "exe",
    "dll",
    "so",
    "dylib",
    "wasm",
  ].includes(ext);
}

function isLargeFile(file: FileAnalysisInput): FileIssue | null {
  if (file.additions > MAX_ADDITIONS_PER_FILE) {
    return {
      filePath: file.filename,
      line: 1,
      message: `File has ${file.additions} additions, which exceeds the recommended limit of ${MAX_ADDITIONS_PER_FILE}. Consider splitting this into smaller PRs.`,
      severity: "warning",
    };
  }
  if (file.deletions > MAX_DELETIONS_PER_FILE) {
    return {
      filePath: file.filename,
      line: 1,
      message: `File has ${file.deletions} deletions, which exceeds the recommended limit of ${MAX_DELETIONS_PER_FILE}. Consider splitting this into smaller PRs.`,
      severity: "warning",
    };
  }
  if (file.changes > MAX_CHANGES_PER_FILE) {
    return {
      filePath: file.filename,
      line: 1,
      message: `File has ${file.changes} total changes, which exceeds the recommended limit of ${MAX_CHANGES_PER_FILE}. Consider splitting this into smaller PRs.`,
      severity: "warning",
    };
  }
  return null;
}

function isGeneratedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.includes(".generated.")) return true;
  if (lower.includes("/generated/")) return true;
  if (lower.endsWith(".d.ts") && !lower.endsWith(".test-d.ts")) return true;
  if (lower.includes("/dist/")) return true;
  if (lower.includes("/build/")) return true;
  if (lower.includes("/coverage/")) return true;
  return false;
}

function isDeletedFile(file: FileAnalysisInput): boolean {
  return file.status === "removed";
}

export function analyzeFiles(files: FileAnalysisInput[]): FileIssue[] {
  const issues: FileIssue[] = [];

  for (const file of files) {
    if (isDeletedFile(file)) {
      issues.push({
        filePath: file.filename,
        line: 1,
        message: "Deleted file detected. Ensure this removal is intentional and documented.",
        severity: "info",
      });
      continue;
    }

    if (hasBinaryExtension(file.filename)) {
      issues.push({
        filePath: file.filename,
        line: 1,
        message: "Binary file changed. Ensure it is necessary and optimally compressed.",
        severity: "info",
      });
      continue;
    }

    if (isGeneratedFile(file.filename)) {
      issues.push({
        filePath: file.filename,
        line: 1,
        message: "Generated file changed. Usually these should not be committed directly.",
        severity: "warning",
      });
    }

    const largeFileIssue = isLargeFile(file);
    if (largeFileIssue) {
      issues.push(largeFileIssue);
    }
  }

  return issues;
}
