import { logger } from "./logger.js";

/**
 * Wraps an async GitHub API call with rate-limit awareness.
 *
 * If GitHub responds with 403 and an exhausted rate limit header,
 * this waits until the reset time and retries once.
 */
export async function withRateLimitHandling<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      error.status === 403 &&
      error.response?.headers?.["x-ratelimit-remaining"] === "0"
    ) {
      const resetAt = parseInt(error.response.headers["x-ratelimit-reset"]) * 1000;
      const waitMs = resetAt - Date.now() + 1000; // +1s buffer
      if (waitMs > 0) {
        logger.warn(
          { waitMs },
          "Rate limit hit; waiting before retry",
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      return fn(); // retry once
    }
    throw error;
  }
}
