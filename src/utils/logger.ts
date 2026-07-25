import pino from "pino";

/**
 * Structured logger for the GitHub App bot.
 *
 * Uses Pino with pretty-printing in development,
 * JSON output in production for log aggregation.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export type Logger = typeof logger;
