# VW Control Tower - Development Standards & Guidelines (Gemini/Claude)

This document serves as the absolute source of truth for architectural integrity, code quality, and development standards for the VW Control Tower project. All AI agents, engineers, and contributors MUST strictly adhere to these rules.

## 1. Next.js 15 App Router Best Practices
- **Server-First Paradigm**: Default to React Server Components (RSC). Only use `'use client'` when interactivity (hooks, event listeners) or browser APIs are strictly required.
- **Routing & Layouts**: Utilize route groups `(groupName)` to organize logical segments without affecting the URL. Always implement `error.tsx` and `loading.tsx` for robust state handling.
- **Data Fetching**: Leverage Next.js extended `fetch` API with appropriate caching and revalidation strategies. Avoid fetching data in Client Components unless absolutely necessary (e.g., highly dynamic user-specific data).
- **Server Actions**: Prefer Server Actions for data mutations instead of dedicated API routes when interacting within the App Router context. Ensure all Server Actions validate inputs securely.

## 2. TypeScript Strictness
- **Strict Mode**: `tsconfig.json` MUST have `"strict": true`.
- **No `any`**: The use of `any` is strictly forbidden. Use `unknown` if the type is truly dynamic, and narrow it down via type guards.
- **Explicit Returns**: All functions and methods must have explicit return types.
- **Interfaces over Types**: Prefer `interface` for object shapes and class contracts. Use `type` aliases primarily for unions, intersections, and utility types.
- **Null Checks**: Ensure all potential `null` or `undefined` states are explicitly handled.

## 3. Tailwind CSS Design Constraints (VW Brand Theme)
- **Design System Adherence**: All styling must strictly utilize the predefined VW Brand Tailwind configuration variables (colors, typography, spacing).
- **No Arbitrary Values**: Avoid arbitrary Tailwind classes (e.g., `text-[#123456]`). If a value is needed repeatedly, add it to `tailwind.config.ts`.
- **Component Abstraction**: Extract complex, repeated UI patterns into reusable components rather than applying massive utility class strings across multiple files.
- **Responsive Design**: Always build mobile-first. Ensure seamless scaling using Tailwind's standard breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).

## 4. Event-Sourced Architecture (ESAA) Integrity
- **Immutability**: Events are immutable facts. Once an event is written to the event store, it cannot be altered or deleted.
- **Command / Event Separation**: Commands represent *intent* (e.g., `CreateOrder`), which validate and produce Events representing *facts* (e.g., `OrderCreated`).
- **Single Source of Truth**: The Event Store is the authoritative source. Read models (Projections) are derivative and must be completely rebuildable from the Event Store.
- **Idempotency**: All command handlers and event consumers must be idempotent to handle potential at-least-once delivery mechanisms safely.

## 5. Python / ADK Agent Rules
- **Stateless Execution**: Agents must remain as stateless as possible between invocations. Any required state must be persisted explicitly or passed via context.
- **Error Handling**: Agents must fail gracefully, providing structured error outputs (JSON) rather than raw stack traces.
- **Tool / MCP Constraints**: Agents must explicitly state tool invocation intents. Limit API surface area to only the necessary ADK (Agent Development Kit) functions.
- **Asynchronous IO**: Use `asyncio` for all network bounds or IO-heavy operations to ensure the agent orchestrator does not block.

*Note: These guidelines are enforced systematically. Deviations require explicit architectural review.*