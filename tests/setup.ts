import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.GITHUB_APP_ID = "123";
  process.env.GITHUB_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ndummy\n-----END RSA PRIVATE KEY-----";
  process.env.GITHUB_WEBHOOK_SECRET = "secret";
});
