# TESS - Targeted Educational Support System

## Overview

TESS is an adaptive learning platform designed for business education students preparing for DECA and FBLA competitions. The system provides diagnostic testing, adaptive practice generation, and comprehensive performance analytics to help students identify knowledge gaps and improve their exam readiness through targeted practice.

The platform offers a complete learning workflow: students take 100-question diagnostic tests to establish baseline performance, receive adaptive practice sets targeting weak areas, and track their progress through detailed analytics dashboards. The system manages multiple business education subjects including Finance, Marketing, Business Administration, Hospitality & Tourism, and Entrepreneurship.

**Core Features:**
- **100-Question Diagnostic Tests**: Comprehensive assessment with timer, progress tracking, and full question navigation
- **Real-Time Analytics**: Dashboard displays DECA/FBLA performance by subject with granular subtopic-level weak area identification
- **Targeted Practice**: One-click practice buttons create sessions filtered to specific weak subtopics (e.g., "DECA-Finance-Financial Analysis")
- **Adaptive Practice**: Automated practice sessions based on diagnostic results with event-specific question filtering
- **Performance Tracking**: Detailed analytics showing subtopic mastery with radar charts, bar charts, strengths/weaknesses panels, and comprehensive subtopic grid
- **Granular Analytics**: Analytics page displays real-time subtopic performance data with DECA/FBLA filtering and individual practice buttons for each subtopic

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript using Vite as the build tool. The UI is built with shadcn/ui component library on top of Radix UI primitives and Tailwind CSS for styling.

**Design Philosophy**: The application follows a "reference-based hybrid" approach drawing inspiration from Khan Academy's clarity, Linear's polished interfaces, and Notion's content organization. Typography uses Inter/DM Sans as primary fonts with Source Sans Pro for dense content areas. The design system emphasizes credibility and sophistication suitable for educational contexts.

**Component Structure**: The application uses a component-based architecture with reusable UI components (`MetricCard`, `QuestionCard`, `DiagnosticTestCard`, `TopicPill`, `ProtectedRoute`) and page-level components for major features (Landing, Login, Dashboard, Practice, Analytics, AdaptivePractice, DiagnosticTest). A sidebar navigation pattern provides access to major platform features with username display and logout button for authenticated users.

**Authentication System**: OAuth-based authentication via Replit Auth with Google/GitHub/email sign-in:
- Users sign in with Google, GitHub, X, Apple, or email via OAuth 2.0
- JWT token-based authentication with automatic token refresh
- Sessions managed by Passport.js with PostgreSQL session store
- `useAuth` hook checks `/api/auth/user` endpoint to determine authentication status  
- `ProtectedRoute` component wraps protected pages and redirects unauthenticated users to `/login`
- Landing page redirects authenticated users to dashboard
- All feature pages (dashboard, diagnostic test, practice, analytics) require authentication
- All API requests include `credentials: "include"` to ensure session cookies are transmitted
- Sidebar displays user's first name, last name, or email from OAuth profile
- Logout redirects to `/api/logout` for proper OAuth session termination

**Pages:**
- **Landing** (`/`): Public landing page showing TESS features with "Get Started" button. Authenticated users are automatically redirected to dashboard.
- **Login** (`/login`): OAuth redirect page that immediately redirects users to Replit Auth for sign-in with Google, GitHub, X, Apple, or email. No password required - uses secure OAuth 2.0 flow.
- **DiagnosticTest** (`/diagnostic-test`): Protected. 100-question comprehensive assessment with DECA/FBLA event type selection, full navigation, progress tracking, timer (150 minutes), and answer persistence. Accessed via "Diagnostic Engine" in sidebar.
- **Dashboard** (`/dashboard`): Protected. Real-time analytics showing DECA/FBLA performance by subject with "Topics Needing Improvement" section displaying weak subtopics (<60% accuracy) with one-click "Targeted Practice" buttons
- **Practice** (`/practice`): Protected. Practice session interface for completing question sets
- **AdaptivePractice** (`/adaptive-practice`): Protected. Targeted practice based on weak topics
- **Analytics** (`/analytics`): Protected. Comprehensive performance analytics displaying real subtopic mastery data with:
  - Event type toggle (DECA/FBLA) for filtering analytics
  - Radar chart showing top 6 subtopic performance
  - Bar chart showing top 10 subtopics by score
  - "Top Strengths" panel (≥70% accuracy)
  - "Areas for Improvement" panel (<70% accuracy) with individual practice buttons
  - "All Subtopics" grid with performance cards and practice buttons for each subtopic
  - Subtopic names formatted for readability (e.g., "Finance - Financial Analysis" instead of "DECA-Finance-Financial Analysis")

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

**Session Management**: OAuth-based session management using Passport.js with PostgreSQL session store (connect-pg-simple) for persistent sessions across server restarts. Session cookies expire after 7 days and include httpOnly, secure (production only), and SameSite=Lax security settings. JWT tokens automatically refresh before expiration. All API requests include credentials to ensure cookies are transmitted properly.

**Database Layer**: Drizzle ORM provides type-safe database access with PostgreSQL as the underlying database. The storage layer implements a repository pattern (`IStorage` interface) abstracting database operations from route handlers.

### Data Architecture

**Database Schema** (PostgreSQL via Drizzle ORM):

- **users**: User accounts with OAuth fields (email, firstName, lastName, profileImageUrl) from Google/GitHub/email sign-in. Legacy username/password fields are nullable for backward compatibility.
- **sessions**: PostgreSQL session store table (managed by connect-pg-simple via Passport.js) for persistent OAuth login sessions with JWT token management
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

**Subtopic System (Granular Performance Tracking)**: Questions include event-specific and subject-specific subtopics for precise weakness identification:
- **Format**: `EVENT-SUBJECT-CATEGORY` (e.g., "DECA-Finance-Analysis", "DECA-Marketing-Product")
- **Generation**: Automated keyword-based analysis creates 20-30 subtopics per subject
- **Separation Guarantee**: Every subtopic prefixed with event type ensures DECA/FBLA never mix
- **Performance Tracking**: System tracks user performance by subtopic instead of coarse topics
- **Practice Sessions**: Adaptive practice filters weak subtopics by event type before question selection
- **Query Layer**: `getQuestionsByTopic()` searches both `topic` and `subtopic` fields for compatibility
- **Auto-Import**: New questions automatically receive subtopics during import process

All 2,485 DECA questions currently have subtopics generated. This provides students with granular analytics showing specific weak areas (e.g., "DECA-Finance-Financial Statements" at 65% vs "DECA-Finance-Financial Markets" at 85%).

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
- **Production**: OAuth-based authentication using Replit Auth (automatic setup with REPL_ID/ISSUER_URL env vars)
- **Development**: OAuth gracefully disabled with 503 responses when env vars missing
- Supports Google, GitHub, X, Apple, and email sign-in via OAuth 2.0
- Session persistence with PostgreSQL session store (7-day expiration)

### Fonts
- Google Fonts CDN: Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono, Source Sans Pro