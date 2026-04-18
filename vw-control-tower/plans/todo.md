# 🏗️ VW Finance Control Tower - Execution Roadmap

## Phase 1: Foundation & ESAA (The Engine)
- [ ] **1.1 Next.js Scaffolding**
    - [ ] Initialize Next.js 15 (App Router, TS, Tailwind) in `vw-control-tower/`
    - [ ] Install UI/State Deps: `lucide-react`, `recharts`, `framer-motion`, `zustand`, `clsx`, `tailwind-merge`
    - [ ] Install Backend Deps: `@supabase/supabase-js`, `zod`
    - [ ] Configure VW Brand Theme in `tailwind.config.ts` (VW Blue: #001E50, Secondary: #00B0F0)
    - [ ] Setup folder structure: `src/lib/esaa`, `src/store`, `src/components/dashboard`, `src/hooks`
- [ ] **1.2 Supabase Local Infrastructure**
    - [ ] Initialize Supabase local environment (`supabase init`)
    - [ ] Create `supabase/migrations/001_initial_schema.sql` (events, kpi_snapshots, risks, agent_proposals)
    - [ ] Start Supabase local containers (Requires Docker)
- [ ] **1.3 ESAA Implementation (The Engine)**
    - [ ] Build `src/lib/esaa/types.ts` (Event schemas and State shapes)
    - [ ] Build `src/lib/esaa/event-store.ts` (Event emitters)
    - [ ] Build `src/lib/esaa/materializer.ts` (Projection logic)
    - [ ] Setup Zustand store for real-time reactivity
- [ ] **1.4 VW Seed Data & Scenarios**
    - [ ] Generate `src/lib/esaa/seed-events.json` (Historical VW finance events)
    - [ ] Create seed script to populate local Supabase

## Phase 2: Dashboard UI (The Shell)
- [ ] **2.1 Global Shell**: Sidebar in VW Blue (#001E50), TopBar with agent status.
- [ ] **2.2 KPI Command Center**: Implement Gauges and Line charts with target bands.
- [ ] **2.3 Risk & Roadmap**: Build the 4-lane roadmap timeline and Probability/Impact plot.
- [ ] **2.4 Audit Trail**: Event log table with JSON payload viewer.

## Phase 3: Agentic Layer (The Brain)
- [ ] **3.1 Python Environment**: Setup `agents/` utilizing Google Agent Development Kit (ADK) and Gemini.
- [ ] **3.2 MCP Integration**: Implement Model Context Protocol (MCP) servers (e.g., Supabase/PostgreSQL MCP) to securely connect ADK agents with our database and Next.js backend.
- [ ] **3.3 Agent Tools & Skills**: Create `McpToolset` based tools for reading KPI state, fetching historical context, and appending events.
- [ ] **3.4 Approval Loop**: UI in Next.js for `agent_proposals` to orchestrate Approve/Reject flows using the ADK API runtime.

## Phase 4: Polish & Pitch
- [ ] **4.1 Animations**: Framer Motion transitions for data updates.
- [ ] **4.2 Demo Scripting**: Ensure the "Scenario Flow" works flawlessly.