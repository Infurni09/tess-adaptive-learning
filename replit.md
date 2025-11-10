# TESS - Targeted Educational Support System

## Overview

TESS is an adaptive learning platform designed for business education students preparing for DECA and FBLA competitions. Its purpose is to provide diagnostic testing, adaptive practice generation, and comprehensive performance analytics to help students identify knowledge gaps and improve exam readiness through targeted practice. The platform supports multiple business education subjects and offers a complete workflow from diagnostic tests to adaptive practice and detailed performance tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite, styled with shadcn/ui (based on Radix UI) and Tailwind CSS. The design is a "reference-based hybrid" inspired by Khan Academy, Linear, and Notion, emphasizing clarity, polish, and content organization. It utilizes a component-based architecture for reusability and structured page-level components. Authentication is OAuth-based via Replit Auth, supporting Google/GitHub/email sign-in with JWT token management and a `ProtectedRoute` for secured routes. Key pages include Landing, Login, Diagnostic Test, Dashboard, Practice, and Analytics. State management is handled by React Query for server state and React hooks for local state, with Wouter for client-side routing.

### Backend Architecture

The backend uses an Express.js server with TypeScript, serving both the API and static frontend assets. It follows a RESTful API design with organized routes. Session management is OAuth-based using Passport.js with a PostgreSQL session store. The database layer employs Drizzle ORM for type-safe PostgreSQL access, implementing a repository pattern.

### Data Architecture

The database schema (PostgreSQL via Drizzle ORM) includes tables for `users`, `sessions`, `questions`, `diagnosticTests`, `testResponses`, `practiceSessions`, `practiceResponses`, and `topicPerformance`. UUID primary keys are used, and cascade deletion maintains referential integrity. A critical design decision is the complete isolation of DECA and FBLA question sets using a `testType` field across all layers. Questions are managed from JSON files, imported via a server-side script, and categorized with a granular subtopic system (e.g., `EVENT-SUBJECT-CATEGORY`) for precise performance tracking.

### Analytics and Adaptive Learning

The system tracks user performance at overall, per-topic, and subtopic levels. Adaptive practice logic generates targeted sets based on `topicPerformance` data to focus on areas of lower mastery. Recharts is used for data visualization, including radar and bar charts, to display performance trends and strengths/weaknesses.

### UI Component System

The UI leverages shadcn/ui with the "new-york" style, customized via Tailwind CSS with HSL-based color tokens for light and dark modes. Custom CSS classes provide consistent interactive feedback. Radix UI primitives ensure accessibility, including keyboard navigation and screen reader support.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL accessed via `@neondatabase/serverless`.
- **Drizzle ORM**: For type-safe database access and migration management.

### UI Component Libraries
- **Radix UI**: Headless UI primitives.
- **shadcn/ui**: Pre-styled component library built on Radix UI.
- **Recharts**: Charting library for data visualizations.

### Development Tools
- **Vite**: Frontend build tool.
- **TypeScript**: For type safety.
- **Tailwind CSS**: Utility-first CSS framework.
- **React Hook Form**: Form state management with Zod validation.

### Authentication
- **Replit Auth**: OAuth-based authentication (Google, GitHub, X, Apple, email sign-in).
- **Passport.js**: For session management with PostgreSQL session store.

### Fonts
- **Google Fonts CDN**: Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono, Source Sans Pro.