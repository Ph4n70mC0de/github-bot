# Contributing

Thank you for your interest in contributing to the GitHub App Bot!

## Development Setup

```bash
git clone https://github.com/OWNER/REPO.git
cd github-bot
npm install
cp .env.example .env
npm run dev
```

## Running Tests

```bash
npm run test
```

We use Vitest. Tests cover pure business logic and handler registration.

## Code Style

- TypeScript with strict mode
- Use `async/await` over callbacks
- Keep business logic pure and side-effect free
- Use structured logging (`src/utils/logger.ts`) in handlers
- Follow the existing project structure

## Commit Messages

- Use present tense: "Add feature" not "Added feature"
- Reference issues: `Fix #12`
- Keep the first line under 72 characters

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new behavior
4. Ensure `npm run build` and `npm run test` pass
5. Open a PR with a clear description

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps, expected behavior, and actual behavior
- For security issues, see [SECURITY.md](SECURITY.md)
