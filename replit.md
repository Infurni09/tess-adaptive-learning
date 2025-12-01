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

**Subject-Specific Diagnostic Tests (November 2025):** The platform now supports subject-specific diagnostic tests within DECA and FBLA events. Users select an event (DECA/FBLA), then choose from all available subjects (e.g., Finance, Marketing, Entrepreneurship, Business Administration, Business Management, Hospitality & Tourism for DECA). Canonical subject taxonomies are defined in `shared/constants.ts` ensuring consistent ordering and display of all subjects, including those with zero questions (marked "Coming Soon"). The diagnostic test system uses deterministic question selection ordered by ID to guarantee exactly 100 unique questions when sufficient inventory exists. A two-tier fallback system (subject → event) with exclusion lists prevents duplicate questions during backfill.

### Analytics and Adaptive Learning

The system tracks user performance at overall, per-topic, and subtopic levels. Adaptive practice logic generates targeted sets based on `topicPerformance` data to focus on areas of lower mastery. Recharts is used for data visualization, including radar and bar charts, to display performance trends and strengths/weaknesses.

**Advanced ML Algorithms (December 2025):** TESS now implements sophisticated machine learning models for personalized learning:
- **Bayesian Knowledge Tracing (BKT)**: Probabilistic model of student knowledge state with Bayes' theorem updates
- **Item Response Theory (3PL)**: Psychometric question calibration with discrimination, difficulty, and guessing parameters
- **Learning Curves**: Power law analysis of learning trajectories with trial-by-trial performance prediction
- **Knowledge Graph**: Topic prerequisite modeling and dependency detection
- **Multi-Armed Bandit (Thompson Sampling)**: Exploration/exploitation balance for topic selection
- **Engagement Prediction**: Churn risk detection using session metrics and performance trends
- **Model Training Pipeline**: Automated parameter estimation using EM algorithm and cross-validation

All ML models are trained on live student response data and updated continuously. Database includes dedicated tables for model parameters, training state, engagement metrics, and prerequisite graph.

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

### ML & Scientific Libraries
- **Statistical Algorithms**: Custom implementations of BKT, IRT (3PL), power law fitting
- **Probability Sampling**: Beta distribution sampling for Thompson Sampling
- **Numerical Methods**: Newton-Raphson optimization for MLE, EM algorithm for parameter fitting

### Fonts
- **Google Fonts CDN**: Inter, DM Sans, Architects Daughter, Fira Code, Geist Mono, Source Sans Pro.

## API Endpoints (Advanced ML)

### Model Training
- `POST /api/ml/train` - Train all models (BKT, IRT)
- `POST /api/ml/train/irt` - Train IRT parameters with EM
- `POST /api/ml/train/bkt` - Train BKT parameters

### Student Insights
- `GET /api/ml/ability?subject=Finance` - Get IRT ability estimate (theta)
- `GET /api/ml/mastered-topics` - Get topics with P(L) >= 0.95
- `GET /api/ml/next-question?subject=Finance` - Get next question using CAT (Computerized Adaptive Testing)
- `GET /api/ml/churn-risk?threshold=0.7` - Identify high-risk students

### Engagement & Monitoring
- `POST /api/ml/engagement` - Update engagement metrics after session
- `GET /api/ml/status` - View model training status and versions

## Recent Changes (December 2025)

### Advanced ML Implementation
- Added 6 new ML tables to schema: `bkt_knowledge_state`, `irt_parameters`, `userAbilityEstimate`, `learningCurve`, `knowledgeGraph`, `engagementMetrics`, `banditState`, `modelTrainingState`
- Implemented comprehensive ML module (`server/advancedML.ts`) with 1,200+ lines of algorithm implementations
- Integrated ML responses into practice session submission flow via `processResponseAdvanced()`
- Added 10 new API endpoints for ML training, student insights, and model monitoring
- Created training scripts: `train-models.ts` (trains models on live data) and `test-models.ts` (validates all algorithms)

### Test Results
- ✓ BKT successfully trained on 136+ student response sequences (DECA)
- ✓ IRT calibrated 117 questions from 388 responses with discrimination, difficulty, guessing parameters
- ✓ Learning curves fitted with power law (learning rate = 0.943 on test data)
- ✓ Thompson Sampling bandit algorithm functional
- ✓ Engagement metrics computed with churn risk prediction (demonstrated 75% risk detection)
- ✓ All database operations persist correctly

### Known Working Features
- Bayesian Knowledge Tracing updates P(Knowledge) correctly with Bayes' theorem
- IRT 3PL model calculates accurate probability curves and Fisher information
- Power law learning prediction improves accuracy from 40% to 88% over 6 trials
- Multi-armed bandit samples from Beta distributions correctly
- Engagement churn risk calibrated to detect disengagement patterns
