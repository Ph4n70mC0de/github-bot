# GitHub App Bot

A production-grade GitHub App built with Node.js, Octokit, Fastify, and BullMQ. It automates repository workflows including issue labeling, PR review, auto-merge, and workflow dispatch.

## Features

- **Issue Handling**: Automatic issue labeling and closure comments
- **PR Review**: Automated file analysis with inline review comments
- **Auto-Merge**: CI-gated merge with safety checks (`auto-merge` label required)
- **Workflow Trigger**: Dispatch GitHub Actions workflows via issue titles
- **Queue + Retry**: BullMQ integration with exponential backoff and dead-letter handling
- **Observability**: Structured logging (Pino), Sentry error tracking, Prometheus `/metrics`
- **Testing**: Vitest unit tests for business logic and handler registration

## Tech Stack

- Node.js 20 LTS
- `@octokit/app` + `@octokit/rest` — GitHub API
- Fastify — webhook server
- Pino — structured logging
- BullMQ + Redis — job queue
- Vitest — testing
- Prometheus client — metrics
- Sentry — error tracking

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run in development
npm run dev

# Run tests
npm run test

# Build for production
npm run build
npm start
```

## Environment Variables

See `.env.example` for required variables:

- `GITHUB_APP_ID` — GitHub App ID
- `GITHUB_PRIVATE_KEY` — PEM private key (newlines preserved)
- `GITHUB_WEBHOOK_SECRET` — webhook HMAC secret
- `REDIS_URL` — optional, for BullMQ queue
- `SENTRY_DSN` — optional, for error tracking
- `PORT` — server port (default: 3000)

## Deployment

### Docker

```bash
docker build -t github-bot .
docker run -p 3000:3000 --env-file .env github-bot
```

### GitHub Actions

Push to `main` to trigger CI/CD. The workflow builds, tests, and pushes a Docker image to GitHub Container Registry (`ghcr.io`).

## Project Structure

```
src/
  auth/          # GitHub App singleton + token helpers
  handlers/      # Webhook event handlers
  logic/         # Pure business logic
  queue/         # BullMQ job queue
  server/        # Fastify webhook server
  utils/         # Logger, metrics, retry, rate limiter
tests/           # Vitest tests + fixtures
```

## Documentation

- [Plan.md](Plan.md) — Comprehensive architecture and phased build plan
- [Contributing](CONTRIBUTING.md) — Contribution guidelines
- [Security](SECURITY.md) — Security policy and reporting
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community standards

## License

MIT — see [LICENSE](LICENSE).
