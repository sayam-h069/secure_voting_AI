# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Wouter routing
- **AI Fraud Detection**: Rule-based analysis engine with pattern recognition

## Application: AI-Powered Online Voting System with Fraud Detection

A full-stack civic tech platform for creating and managing elections with real-time AI fraud detection.

### Features

- **Election Management**: Create, manage, and close elections with multiple candidates
- **Secure Voting**: One vote per voter ID per election, session tracking via localStorage
- **AI Fraud Detection**: Analyzes voting patterns for duplicate IPs, rapid voting bursts, bot behavior, suspicious timing
- **Live Results Dashboard**: Real-time vote tallies with Recharts visualizations
- **Fraud Alert System**: Review, filter, and resolve fraud alerts with resolution notes
- **Admin Panel**: Manage elections, update statuses, view risk scores

### Pages

- `/` — Command Center dashboard with live stats and audit log
- `/elections` — Operations registry (list all elections with filtering)
- `/elections/new` — Create election with inline candidate management
- `/elections/:id` — Election detail + voting interface + AI analysis trigger
- `/elections/:id/results` — Results with charts and winner announcement
- `/fraud` — Security subsystem: view and resolve fraud alerts
- `/admin` — Admin control panel

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── voting-system/      # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Database Schema

Tables: `elections`, `candidates`, `votes`, `fraud_alerts`, `activity_log`

Enums: `election_status` (upcoming/active/closed), `fraud_severity` (low/medium/high/critical), `fraud_type` (duplicate_ip/rapid_voting/unusual_pattern/bot_behavior/coordinated_attack/suspicious_timing)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## API Endpoints

All routes prefixed with `/api`:

- `GET /healthz` — Health check
- `GET/POST /elections` — List / Create elections
- `GET/PATCH /elections/:id` — Get / Update election
- `GET /elections/:id/results` — Election results
- `POST /elections/:id/candidates` — Add candidate
- `POST /votes` — Cast vote
- `GET /votes/check` — Check vote status
- `GET /fraud/alerts` — List fraud alerts
- `PATCH /fraud/alerts/:id/resolve` — Resolve alert
- `POST /fraud/analyze/:electionId` — Trigger AI analysis
- `GET /dashboard/summary` — Dashboard stats
- `GET /dashboard/activity` — Recent activity
- `GET /dashboard/fraud-stats` — Fraud statistics
