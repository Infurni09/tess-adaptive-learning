# TESS - Targeted Educational Support System

## Overview

TESS is an adaptive learning platform designed for business education students preparing for DECA and FBLA competitions. The system provides diagnostic testing, adaptive practice generation, and comprehensive performance analytics to help students identify knowledge gaps and improve their exam readiness through targeted practice.

The platform offers a complete learning workflow: students take 100-question diagnostic tests to establish baseline performance, receive adaptive practice sets targeting weak areas, and track their progress through detailed analytics dashboards. The system manages multiple business education subjects including Finance, Marketing, Business Administration, Hospitality & Tourism, and Entrepreneurship.

**Core Features:**
- **100-Question Diagnostic Tests**: Comprehensive assessment with timer, progress tracking, and full question navigation
- **Real-Time Analytics**: Dashboard displays DECA/FBLA performance by subject with weak topic identification
- **Adaptive Practice**: Targeted practice sessions based on diagnostic results
- **Performance Tracking**: Detailed analytics showing strengths, weaknesses, and improvement trends

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript using Vite as the build tool. The UI is built with shadcn/ui component library on top of Radix UI primitives and Tailwind CSS for styling.

**Design Philosophy**: The application follows a "reference-based hybrid" approach drawing inspiration from Khan Academy's clarity, Linear's polished interfaces, and Notion's content organization. Typography uses Inter/DM Sans as primary fonts with Source Sans Pro for dense content areas. The design system emphasizes credibility and sophistication suitable for educational contexts.

**Component Structure**: The application uses a component-based architecture with reusable UI components (`MetricCard`, `QuestionCard`, `DiagnosticTestCard`, `TopicPill`) and page-level components for major features (Dashboard, Practice, Analytics, AdaptivePractice, DiagnosticTest). A sidebar navigation pattern provides access to major platform features.

**Pages:**
- **DiagnosticTest** (`/diagnostic-test`): 100-question comprehensive assessment with full navigation, progress tracking, timer (150 minutes), and answer persistence. Accessed via "Diagnostic Engine" in sidebar.
- **Dashboard** (`/dashboard`): Real-time analytics showing DECA/FBLA performance by subject
- **Practice** (`/practice`): Practice session interface
- **AdaptivePractice** (`/adaptive-practice`): Targeted practice based on weak topics
- **Analytics** (`/analytics`): Proficiency tracking and detailed performance insights

**State Management**: React Query (TanStack Query) handles server state management, providing caching, background updates, and optimistic updates for API interactions. Local component state is managed with React hooks.

**Routing**: Uses Wouter for client-side routing, providing a lightweight routing solution for the single-page application.

### Backend Architecture

**Framework**: Express.js server with TypeScript, serving both the API and static frontend assets.

**API Design**: RESTful API architecture with routes organized by feature domain:
- Authentication endpoints (`/api/auth/*`)
- Diagnostic test operations:
  - POST `/api/diagnostic-tests` - Create new diagnostic test
  - GET `/api/diagnostic-tests/:id/questions` - Fetch 100 random questions for test
  - POST `/api/diagnostic-tests/:id/submit` - Submit answers in format `{ answers: { questionId: selectedAnswer } }`
  - GET `/api/analytics/diagnostics?type=DECA|FBLA` - Get diagnostic analytics by test type
- Practice session management (`/api/practice-sessions/*`)
- Analytics and performance tracking

**Session Management**: Cookie-based session authentication using express-session with PostgreSQL session store (connect-pg-simple). Session data tracks authenticated users throughout their learning journey.

**Database Layer**: Drizzle ORM provides type-safe database access with PostgreSQL as the underlying database. The storage layer implements a repository pattern (`IStorage` interface) abstracting database operations from route handlers.

### Data Architecture

**Database Schema** (PostgreSQL via Drizzle ORM):

- **users**: User accounts with username and optional Replit integration
- **questions**: Question bank with multiple choice options, correct answers, explanations, topics, subjects, and **testType** (DECA or FBLA)
- **diagnosticTests**: Tracks diagnostic test sessions with status, scores, completion data, and **testType** (DECA or FBLA)
- **testResponses**: Individual question responses within diagnostic tests
- **practiceSessions**: Practice session metadata, configuration, and **testType** (DECA or FBLA)
- **practiceResponses**: Question responses within practice sessions
- **topicPerformance**: Aggregated performance metrics per topic per user

**Key Design Decisions**:
- UUID primary keys for all entities ensure global uniqueness and security
- Cascade deletion maintains referential integrity (e.g., deleting a user removes their tests and sessions)
- Separate tables for test vs. practice responses allow different analytics approaches
- Topic performance aggregation enables adaptive practice generation
- **Event Separation**: DECA and FBLA question sets are completely isolated at every layer via `testType` field - they NEVER mix under any circumstance

### Question Management

**Data Source**: Questions are stored in JSON files in `attached_assets/` organized by subject (Business Administration, Business Management, Entrepreneurship, Finance, Hospitality & Tourism, Marketing). Each question includes topic categorization for granular performance tracking.

**Import Strategy**: Server-side import script (`server/import-questions.ts`) processes JSON files, cleans question text and options, extracts correct answers, and populates the database. The script automatically detects event type (DECA or FBLA) from filenames and sets the `testType` field accordingly, ensuring complete separation of question sets.

**Event Separation (CRITICAL)**: DECA and FBLA questions are completely isolated across the entire system:
- **Schema Level**: All questions, diagnostic tests, and practice sessions include a `testType` field
- **Storage Layer**: Every question-fetching method (`getRandomQuestions`, `getQuestionsByTopic`) filters by `testType`
- **API Layer**: All endpoints accept and enforce `testType` parameters
- **Frontend**: Users must explicitly select DECA or FBLA before starting tests or practice sessions
- **Defensive Validation**: Submission endpoints validate that question `testType` matches test/session `testType`, rejecting mismatches
- **Import Script**: Automatically detects "DECA" or "FBLA" from filename and sets `testType` accordingly

This multi-layered approach ensures DECA and FBLA questions can NEVER mix, even under malicious input.

### Analytics and Adaptive Learning

**Performance Tracking**: The system tracks user performance at multiple levels:
- Overall accuracy and question counts
- Per-topic performance metrics
- Diagnostic test scores and progress
- Practice session results

**Adaptive Practice Logic**: The platform generates targeted practice sets based on topic performance data, focusing on areas where users demonstrate lower mastery. The `topicPerformance` table maintains running statistics used to identify weak areas.

**Visualization**: Uses Recharts library for data visualization (bar charts, radar charts) to display performance trends, strengths/weaknesses analysis, and progress over time.

### UI Component System

**shadcn/ui Integration**: The project uses shadcn/ui configured with the "new-york" style variant. Components are customized through Tailwind configuration with HSL-based color tokens supporting both light and dark modes.

**Styling Approach**: Custom CSS classes (`hover-elevate`, `active-elevate-2`) provide consistent interactive feedback across buttons and clickable elements. The color system uses CSS custom properties for theming flexibility.

**Accessibility**: Radix UI primitives ensure keyboard navigation, screen reader support, and ARIA attributes are built into interactive components.

## External Dependencies

### Database Service
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database accessed via `@neondatabase/serverless` driver with WebSocket support for serverless environments
- Connection configured via `DATABASE_URL` environment variable
- Drizzle ORM provides migration management (`drizzle-kit`) and type-safe query building

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessible components (dialogs, dropdowns, menus, tooltips, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix UI
- **Recharts**: Charting library for analytics visualizations

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **React Hook Form**: Form state management with Zod schema validation

### Authentication
- Session-based authentication using express-session
- Optional Replit user integration for deployment on Replit platform

### Fonts
- Google Fonts CDN: Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono, Source Sans Pro