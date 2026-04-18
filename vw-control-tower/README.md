# VW Finance Control Tower

A premium, event-sourced financial dashboard and risk management platform for the VW Group Finance Division.

## Overview

The VW Finance Control Tower is a high-performance analytics platform designed to monitor competitive benchmarks, financial KPIs, and strategic risks in real-time. It leverages an **Event-Sourced Architecture (ESAA)** to ensure data integrity, auditability, and the ability to project complex business states from historical facts.

### Key Features

- **Financial KPIs**: Real-time tracking of Operating Margin, Cash Conversion, and BEV Delivery Share.
- **Risk Roadmap**: Strategic threat assessment, including US Tariff exposure and China NEV competition.
- **China Competitiveness (CMP)**: Specialized dashboard for managing the 40% cost-reduction target in the China market.
- **Supply Chain Traceability**: Battery passport tracking and sustainability gate management.
- **Event History**: Full audit trail of all financial updates and risk adjustments.
- **AI-Driven Insights**: Integration with Gemini for automated risk mitigation recommendations and report generation.

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **State Management**: ESAA (Event Sourced) with Zustand & Immer
- **Database/Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS (VW Brand Theme)
- **Components**: Framer Motion for premium micro-animations
- **AI Integration**: Google Gemini via ADK

## Architecture: ESAA

This project implements an **Event-Sourced Architecture**:
1. **Events**: Immutable facts stored in the `events` table.
2. **Commands**: User actions that validate business logic and append events.
3. **Projections**: Materialized business states produced by the `materializer`.
4. **Snapshotting**: Real-time state updates via optimistic client-side projections.

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase Project (URL and Anon Key required)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*VW Group · Finance Division · Strategic Planning & Risk Management*

