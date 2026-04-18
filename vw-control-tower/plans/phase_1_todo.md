# Phase 1: Foundation & ESAA Checklist

## 1.1 Scaffolding
- [ ] Initialize Next.js in `vw-control-tower/`
- [ ] Install deps: `lucide-react`, `recharts`, `framer-motion`, `zustand`, `@supabase/supabase-js`
- [ ] Initialize Shadcn/UI components (`src/lib/esaa`, `src/store`, `src/components/dashboard`)

## 1.2 Database
- [ ] `supabase init`
- [ ] Create `supabase/migrations/001_initial_schema.sql`
- [ ] Start Supabase local instance

## 1.3 ESAA Logic
- [ ] Implement `event-store.ts`
- [ ] Implement `materializer.ts`
- [ ] Setup Zustand store for real-time state

## 1.4 Initial State
- [ ] Populate `seed.sql` with VW baseline data
- [ ] Verify event-to-snapshot flow