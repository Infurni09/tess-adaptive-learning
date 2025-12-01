# TESS - Targeted Educational Support System

An adaptive learning platform designed for business education students preparing for DECA and FBLA competitions. TESS provides diagnostic testing, adaptive practice generation, and comprehensive performance analytics to help students identify knowledge gaps and improve exam readiness.

## Features

- **Subject-Specific Diagnostic Tests**: 100-question adaptive tests for DECA and FBLA across 6 subjects each
- **ML-Powered Adaptive Learning**: Smart question selection based on user performance using EMA difficulty calculation, SM-2 spaced repetition, and confidence scoring
- **Real-Time Analytics**: Track performance by topic, subject, and event with interactive visualizations
- **Hierarchical Navigation**: Event → Subject → Subtopic for granular performance tracking
- **OAuth Authentication**: Secure login via Replit Auth (Google, GitHub, email, X, Apple)
- **Dark Mode Support**: Full light/dark theme with CSS variable-based color system

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and building
- shadcn/ui component library (Radix UI + Tailwind CSS)
- React Query (TanStack Query v5) for server state management
- Wouter for client-side routing

**Backend:**
- Express.js with TypeScript
- PostgreSQL (Neon serverless) via Drizzle ORM
- Passport.js for OAuth session management
- Custom ML algorithms for adaptive learning

**Database:**
- PostgreSQL with Drizzle ORM migrations
- 11,539+ hand-curated DECA and FBLA questions
- Hierarchical schema: events → subjects → subtopics → questions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Replit's built-in PostgreSQL)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/Infurni09/tess-adaptive-learning.git
cd tess-adaptive-learning
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in your database credentials:
```
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your-neon-hostname
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=your-database-name
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Setup

Push the schema to your database:
```bash
npm run db:push
```

### Running the Application

Start the development server (runs both Express backend and Vite frontend):
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

### Production Build

Build for production:
```bash
npm run build
```

## Project Structure

```
.
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable UI components
│   │   ├── lib/                    # Utilities and hooks
│   │   └── App.tsx                 # Main app component
│   └── index.html
├── server/                          # Express backend
│   ├── routes.ts                   # API endpoint definitions
│   ├── storage.ts                  # Database interface
│   ├── adaptiveLearning.ts         # ML algorithms
│   ├── db.ts                       # Database connection
│   ├── index.ts                    # Server entry point
│   └── vite.ts                     # Vite server integration
├── shared/                          # Shared code
│   ├── schema.ts                   # Database schema (Drizzle ORM)
│   └── constants.ts                # Subject lists and constants
└── drizzle.config.ts               # Drizzle ORM configuration
```

## Key Pages

- **Landing** (`/`): Introduction and authentication
- **Dashboard** (`/dashboard`): Main hub with test selection
- **Diagnostic Test** (`/diagnostic-test`): Event/subject selection and 100-question test
- **Analytics** (`/analytics`): Performance dashboard with charts and statistics
- **Adaptive Practice** (`/adaptive-practice`): Subject-based practice with real mastery percentages
- **Practice** (`/practice`): Interactive practice session

## ML Algorithms

TESS implements adaptive learning through four core algorithms:

### 1. EMA Difficulty Calculation
- Exponential Moving Average of question accuracy (last 30 days)
- Continuously updates question difficulty (1-10 scale)
- Adapts to learner performance in real-time

### 2. SM-2 Spaced Repetition
- SuperMemo 2 algorithm for optimal review scheduling
- Adapts intervals based on user performance and response time
- Ensures efficient long-term retention

### 3. Confidence Scoring
- Temporal decay function tracking system confidence in topic mastery
- Prioritizes topics with low confidence scores
- Updates with each practice session

### 4. Smart Question Prioritization
- Weighted scoring across 4 dimensions:
  - Low confidence topics (40% weight)
  - Difficulty alignment to learner level (25%)
  - Spaced repetition scheduling (20%)
  - Question recency (15%)

## Data Insights

**Question Database:**
- 11,539 hand-curated DECA questions
- 6 DECA subjects: Finance, Marketing, Entrepreneurship, Business Administration, Business Management, Hospitality & Tourism
- 5 FBLA subjects: Business Law, Economics, Accounting, Management, Computer Applications

**Performance Tracking:**
- User-level metrics: overall accuracy, study streak, topics mastered
- Topic-level metrics: mastery percentage, confidence score, last practiced
- Subtopic-level tracking for granular performance analysis

## Authentication

The app uses **Replit Auth** for OAuth-based authentication, supporting:
- Google Sign-In
- GitHub Sign-In
- Email/Password
- Apple Sign-In
- X (Twitter) Sign-In

Sessions are stored in PostgreSQL using `connect-pg-simple`.

## API Endpoints

### Diagnostic Tests
- `POST /api/diagnostic-tests` - Create a new diagnostic test
- `GET /api/diagnostic-tests/:id` - Get test questions
- `POST /api/diagnostic-tests/:id/submit` - Submit test responses
- `GET /api/subjects` - Get available subjects for an event

### Analytics
- `GET /api/analytics/stats` - User statistics
- `GET /api/analytics/topics` - Topic performance data
- `GET /api/analytics/subject-mastery` - Subject-level mastery percentages
- `GET /api/analytics/diagnostics` - Diagnostic test analytics

### Practice
- `POST /api/practice-sessions` - Create a practice session
- `GET /api/practice-sessions/:id` - Get practice questions
- `POST /api/practice-sessions/:id/submit` - Submit practice responses

## Contributing

Contributions are welcome! Please ensure:
- TypeScript code follows existing patterns
- All secrets remain in `.env` (never commit actual values)
- Database changes use Drizzle ORM migrations

## License

This project is part of an educational platform for DECA and FBLA competitions.

## Support

For issues or questions, please open an issue in the repository or contact the project maintainers.

---

**Built with TypeScript, React, Express, and PostgreSQL**
