import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth OAuth state management
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - migrated to support Replit Auth OAuth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep existing default
  // OAuth fields from Replit Auth
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Legacy fields (nullable for backward compatibility during migration)
  username: text("username").unique(),
  password: text("password"),
  replitUserId: text("replit_user_id").unique(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: integer("correct_answer").notNull(), // 0-3 for A-D
  explanation: text("explanation"),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"), // CRITICAL: More granular categorization - MUST be event-specific AND subject-specific
  subject: text("subject").notNull(), // Marketing, Finance, etc.
  testType: text("test_type").notNull().default("DECA"), // DECA or FBLA - events are separate
  difficulty: integer("difficulty").default(5), // 1-10 scale, calculated from historical accuracy
  timesAnswered: integer("times_answered").default(0), // Track how many times this question has been answered
  timesCorrect: integer("times_correct").default(0), // Track how many times answered correctly
});

export const diagnosticTests = pgTable("diagnostic_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testNumber: integer("test_number").notNull(), // 1, 2, or 3
  testType: text("test_type").notNull().default("DECA"), // DECA or FBLA - events are separate, cannot mix
  subject: text("subject"), // Optional: specific subject within the event (Finance, Marketing, etc.)
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed
  score: integer("score"),
  totalQuestions: integer("total_questions").default(100),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testResponses = pgTable("test_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => diagnosticTests.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedAnswer: integer("selected_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const practiceSessions = pgTable("practice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicFilter: text("topic_filter"), // optional topic focus
  testType: text("test_type").default("DECA").notNull(), // DECA or FBLA - events NEVER mix
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const practiceResponses = pgTable("practice_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedAnswer: integer("selected_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeSpent: integer("time_spent"), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const topicPerformance = pgTable("topic_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  subject: text("subject"), // Subject for easier filtering (Finance, Marketing, etc.)
  totalAttempted: integer("total_attempted").default(0).notNull(),
  totalCorrect: integer("total_correct").default(0).notNull(),
  averageScore: integer("average_score").default(0).notNull(),
  lastPracticed: timestamp("last_practiced"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  confidenceScore: real("confidence_score").notNull().default(50), // 0-100 scale for ML confidence
  lastConfidenceUpdate: timestamp("last_confidence_update").defaultNow(),
  lastDifficultyLevel: integer("last_difficulty_level").notNull().default(5), // Track progression
});

// Question Difficulty History - tracks historical difficulty metrics over time windows
export const questionDifficultyHistory = pgTable(
  "question_difficulty_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start").notNull(),
    windowEnd: timestamp("window_end").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    computedDifficulty: integer("computed_difficulty").notNull().default(5), // 1-10 scale
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_difficulty_question").on(table.questionId),
    index("idx_difficulty_window").on(table.windowStart, table.windowEnd),
  ],
);

// User Question History - for spaced repetition (SM-2 algorithm)
export const userQuestionHistory = pgTable(
  "user_question_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    lastSeen: timestamp("last_seen").notNull().defaultNow(),
    nextReview: timestamp("next_review").notNull(),
    intervalDays: integer("interval_days").notNull().default(1),
    easeFactor: real("ease_factor").notNull().default(2.5),
    repetitions: integer("repetitions").notNull().default(0),
    lastResult: boolean("last_result"),
    streak: integer("streak").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_question_history_user").on(table.userId),
    index("idx_user_question_history_next_review").on(table.nextReview),
  ],
);

// ===== ADVANCED ML MODELS =====

// Bayesian Knowledge Tracing (BKT) - Per user/topic knowledge state
export const bktKnowledgeState = pgTable(
  "bkt_knowledge_state",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    subject: text("subject"),
    pKnown: real("p_known").notNull().default(0.3), // P(L) - Probability student knows the skill
    pLearn: real("p_learn").notNull().default(0.2), // P(T) - Probability of learning on attempt
    pGuess: real("p_guess").notNull().default(0.25), // P(G) - Probability of guessing correctly
    pSlip: real("p_slip").notNull().default(0.1), // P(S) - Probability of making mistake despite knowing
    totalObservations: integer("total_observations").notNull().default(0),
    lastUpdated: timestamp("last_updated").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_bkt_user_topic").on(table.userId, table.topic),
  ],
);

// Item Response Theory (IRT) Parameters - Per question psychometric properties
export const irtParameters = pgTable(
  "irt_parameters",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }).unique(),
    discrimination: real("discrimination").notNull().default(1.0), // 'a' parameter - how well question differentiates
    difficulty: real("difficulty").notNull().default(0.0), // 'b' parameter - question difficulty (-3 to +3)
    guessing: real("guessing").notNull().default(0.25), // 'c' parameter - probability of guessing (for 4 options)
    informationPeak: real("information_peak").default(0.0), // Ability level where question is most informative
    calibrationCount: integer("calibration_count").notNull().default(0), // Number of responses used for calibration
    lastCalibrated: timestamp("last_calibrated"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_irt_question").on(table.questionId),
    index("idx_irt_difficulty").on(table.difficulty),
  ],
);

// User Ability Estimates (IRT) - Per user latent ability level
export const userAbilityEstimate = pgTable(
  "user_ability_estimate",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    ability: real("ability").notNull().default(0.0), // Theta - latent ability (-3 to +3)
    standardError: real("standard_error").notNull().default(1.0), // Measurement uncertainty
    responsesUsed: integer("responses_used").notNull().default(0),
    lastEstimated: timestamp("last_estimated"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_ability_user_subject").on(table.userId, table.subject),
  ],
);

// Learning Curves - Track learning trajectory over time (Power Law model)
export const learningCurve = pgTable(
  "learning_curve",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    subject: text("subject"),
    trialNumber: integer("trial_number").notNull().default(1), // nth attempt at this topic
    accuracy: real("accuracy").notNull(), // Performance on this trial (0-1)
    responseTimeMs: integer("response_time_ms"), // Average response time
    predictedAccuracy: real("predicted_accuracy"), // Model prediction (power law)
    learningRate: real("learning_rate").default(0.3), // Fitted 'alpha' parameter
    asymptote: real("asymptote").default(0.95), // Fitted maximum performance
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_learning_curve_user_topic").on(table.userId, table.topic),
    index("idx_learning_curve_trial").on(table.userId, table.topic, table.trialNumber),
  ],
);

// Knowledge Graph - Topic prerequisites and dependencies
export const knowledgeGraph = pgTable(
  "knowledge_graph",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    prerequisiteTopic: text("prerequisite_topic").notNull(),
    dependentTopic: text("dependent_topic").notNull(),
    strength: real("strength").notNull().default(0.5), // How strong the dependency is (0-1)
    empiricalSupport: integer("empirical_support").notNull().default(0), // Count of observations supporting this edge
    testType: text("test_type").notNull().default("DECA"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_kg_prerequisite").on(table.prerequisiteTopic),
    index("idx_kg_dependent").on(table.dependentTopic),
  ],
);

// Engagement Metrics - Track engagement patterns for dropout prediction
export const engagementMetrics = pgTable(
  "engagement_metrics",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionDate: timestamp("session_date").notNull(),
    questionsAttempted: integer("questions_attempted").notNull().default(0),
    questionsCorrect: integer("questions_correct").notNull().default(0),
    totalTimeSpentMs: integer("total_time_spent_ms").notNull().default(0),
    avgResponseTimeMs: integer("avg_response_time_ms"),
    sessionDurationMs: integer("session_duration_ms"),
    streakDays: integer("streak_days").notNull().default(1),
    engagementScore: real("engagement_score").default(50), // 0-100 engagement health
    churnRisk: real("churn_risk").default(0.5), // Probability of disengagement
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_engagement_user").on(table.userId),
    index("idx_engagement_date").on(table.sessionDate),
  ],
);

// Multi-Armed Bandit State - For exploration vs exploitation
export const banditState = pgTable(
  "bandit_state",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    pulls: integer("pulls").notNull().default(0), // Number of times this topic was "pulled"
    rewards: real("rewards").notNull().default(0), // Sum of rewards (correct answers)
    ucbValue: real("ucb_value").default(0), // Upper Confidence Bound value
    thompsonAlpha: real("thompson_alpha").notNull().default(1), // Beta distribution alpha (successes + 1)
    thompsonBeta: real("thompson_beta").notNull().default(1), // Beta distribution beta (failures + 1)
    lastPulled: timestamp("last_pulled"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_bandit_user_topic").on(table.userId, table.topic),
  ],
);

// Model Training State - Track model calibration and training status
export const modelTrainingState = pgTable(
  "model_training_state",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    modelType: text("model_type").notNull(), // 'BKT', 'IRT', 'LearningCurve', 'KnowledgeGraph'
    testType: text("test_type").notNull().default("DECA"),
    subject: text("subject"),
    lastTrainingRun: timestamp("last_training_run"),
    samplesUsed: integer("samples_used").notNull().default(0),
    modelAccuracy: real("model_accuracy"), // Cross-validation accuracy
    modelVersion: integer("model_version").notNull().default(1),
    hyperparameters: text("hyperparameters"), // JSON string of model hyperparameters
    status: text("status").notNull().default("untrained"), // 'untrained', 'training', 'trained', 'needs_update'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_training_model_type").on(table.modelType),
  ],
);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const upsertUserSchema = insertUserSchema.partial();

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertDiagnosticTestSchema = createInsertSchema(diagnosticTests).omit({
  id: true,
  createdAt: true,
});

export const insertTestResponseSchema = createInsertSchema(testResponses).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeResponseSchema = createInsertSchema(practiceResponses).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionDifficultyHistorySchema = createInsertSchema(questionDifficultyHistory).omit({
  id: true,
  createdAt: true,
});

export const insertUserQuestionHistorySchema = createInsertSchema(userQuestionHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopicPerformanceSchema = createInsertSchema(topicPerformance).omit({
  id: true,
  updatedAt: true,
  lastConfidenceUpdate: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertDiagnosticTest = z.infer<typeof insertDiagnosticTestSchema>;
export type DiagnosticTest = typeof diagnosticTests.$inferSelect;

export type InsertTestResponse = z.infer<typeof insertTestResponseSchema>;
export type TestResponse = typeof testResponses.$inferSelect;

export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type PracticeSession = typeof practiceSessions.$inferSelect;

export type InsertPracticeResponse = z.infer<typeof insertPracticeResponseSchema>;
export type PracticeResponse = typeof practiceResponses.$inferSelect;

export type InsertTopicPerformance = z.infer<typeof insertTopicPerformanceSchema>;
export type TopicPerformance = typeof topicPerformance.$inferSelect;

export type InsertQuestionDifficultyHistory = z.infer<typeof insertQuestionDifficultyHistorySchema>;
export type QuestionDifficultyHistory = typeof questionDifficultyHistory.$inferSelect;

export type InsertUserQuestionHistory = z.infer<typeof insertUserQuestionHistorySchema>;
export type UserQuestionHistory = typeof userQuestionHistory.$inferSelect;
