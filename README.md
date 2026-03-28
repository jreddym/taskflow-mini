# PureAura Command Centre

Internal engineering dashboard for PureAura Technologies' AI development team.

## Overview

A React-based command centre for monitoring and managing the PureAura AI engineering team, sprint tasks, costs, and system health across all products (Dental Flow, StayHunt, Dentestock).

## Tech Stack

- **Vite + React 18 + TypeScript** — Fast, typed frontend
- **Tailwind CSS v4** — Utility-first styling (dark Discord aesthetic)
- **React Router v6** — Client-side navigation
- **Supabase** — Backend database and real-time
- **OpenClaw Gateway** — Agent orchestration API

## Sections

| Section | Route | Status |
|---------|-------|--------|
| Agent Status | `/agents` | Scaffold |
| Sprint Board | `/sprint` | Scaffold |
| Cost Tracker | `/costs` | Scaffold |
| Cron Monitor | `/cron` | Scaffold |
| Activity Feed | `/activity` | Scaffold |
| Brain Viewer | `/brain` | Scaffold |

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_KEY` — Supabase service role key
- `VITE_GATEWAY_URL` — OpenClaw Gateway WebSocket URL
- `VITE_GATEWAY_TOKEN` — Gateway auth token

## Structure

```
src/
├── components/     # Layout components (TopBar, Sidebar, Layout)
├── lib/            # API clients (supabase.ts, gateway.ts)
├── pages/          # Route pages (6 sections)
└── types/          # TypeScript types for all data models
```
