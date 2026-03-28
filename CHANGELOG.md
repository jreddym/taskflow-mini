# Changelog

## v1.0.0 — 2026-03-28

### 🚀 Initial Release — PureAura Command Centre

Complete React dashboard for managing the PureAura Technologies AI dev team.

#### Features
- **Agent Status Panel** — Live status for 7 AI agents, gateway health metrics, 30s auto-refresh
- **Sprint Board (Kanban)** — 8-column drag-and-drop, Supabase realtime, product/agent filters, create task modal
- **API Usage & Cost Tracker** — Token usage charts (Recharts), budget progress bar ($100/mo), daily/weekly/monthly views
- **Cron Job Monitor** — All scheduled jobs with run history, status indicators, 60s auto-refresh
- **Activity Feed** — Real-time agent action log, color-coded agents, filters, pagination
- **Brain Folder Viewer** — Dynamic file serving from filesystem, markdown rendering, priorities highlighted

#### Stack
- Vite + React 18 + TypeScript + Tailwind CSS v4
- Supabase (sprint_board, api_usage, activity_log + Realtime)
- OpenClaw Gateway API (status, sessions, cron)
- Dark mode, desktop-first

#### Security
- Publishable key only (no service_role in client)
- RLS enabled on all Supabase tables
- Path traversal protection on brain file server
- .env gitignored, .env.example provided

#### Bug Fixes
- BUG-001: Deduplicated gateway constants — shared `lib/gateway.ts` (ARJUN)
- BUG-002: Brain Viewer now reads real files via Vite plugin API (PRIYA)
- BUG-003: Replaced service_role key with publishable key + RLS policies (PRIYA)

#### QA
- 2 rounds of QA by VIKRAM — all passed
- Architecture review + security audit by JR — passed

#### Team
- ARJUN — Frontend (7 tasks)
- PRIYA — Backend (4 tasks)
- VIKRAM — QA (2 tasks)
- MEERA — Deployment (1 task)
- RAHUL — Documentation (1 task)
- JR — Orchestration, review

---

*15 tasks | 9 commits | 8,507 additions | 34 files | Approved by Jagadeeswara Reddy (Founder)*
