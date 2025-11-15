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
