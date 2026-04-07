# Secure Vote AI

Secure Vote AI is a pnpm-based TypeScript monorepo for an AI-powered online voting platform with fraud detection, an Express API, and a React + Vite voting dashboard.

## What’s inside

- `artifacts/api-server` - Express 5 API server backed by PostgreSQL + Drizzle
- `artifacts/voting-system` - React + Vite frontend for the voting experience
- `lib/api-spec` - OpenAPI spec and code generation config
- `lib/api-client-react` - Generated React Query client
- `lib/api-zod` - Generated Zod schemas
- `lib/db` - Shared database schema and connection code

## Key Features

- Election management and candidate setup
- Secure vote casting with voter ID checks
- Fraud detection for rapid voting, duplicate IPs, bot-like activity, and suspicious patterns
- Live dashboards and audit-style views
- Admin tools for election and fraud review workflows

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run type checks:

```bash
pnpm run typecheck
```

Run the frontend locally:

```bash
pnpm --filter @workspace/voting-system dev
```

Run the API server locally:

```bash
pnpm --filter @workspace/api-server run dev
```

Build the workspace:

```bash
pnpm run build
```

## Deployment

The frontend is deployed through GitHub Pages at:

https://sayam-h069.github.io/secure_voting_AI/

The backend API is not hosted on GitHub Pages and needs a separate deployment target.

## Repository

GitHub: https://github.com/sayam-h069/secure_voting_AI