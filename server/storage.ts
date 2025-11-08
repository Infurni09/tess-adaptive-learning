import { db } from "./db";
import { 
  users, questions, diagnosticTests, testResponses, 
  practiceSessions, practiceResponses, topicPerformance,
  type User, type InsertUser, type Question, type DiagnosticTest,
  type TestResponse, type PracticeSession, type TopicPerformance
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReplitId(replitUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Question operations
  getRandomQuestions(limit: number, subject?: string, topic?: string): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | undefined>;
  getQuestionsByTopic(topic: string, limit: number): Promise<Question[]>;
  
  // Diagnostic test operations
  createDiagnosticTest(userId: string, testNumber: number): Promise<DiagnosticTest>;
  getDiagnosticTest(testId: string): Promise<DiagnosticTest | undefined>;
  getUserDiagnosticTests(userId: string): Promise<DiagnosticTest[]>;
  updateDiagnosticTestStatus(testId: string, status: string, score?: number): Promise<void>;
  
  // Test response operations
  saveTestResponse(response: { testId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }): Promise<void>;
  getTestResponses(testId: string): Promise<TestResponse[]>;
  
  // Practice session operations
  createPracticeSession(userId: string, topicFilter?: string): Promise<PracticeSession>;
  updatePracticeSession(sessionId: string, score: number, totalQuestions: number): Promise<void>;
  savePracticeResponse(response: { sessionId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }): Promise<void>;
  
  // Topic performance operations
  getTopicPerformance(userId: string): Promise<TopicPerformance[]>;
  updateTopicPerformance(userId: string, topic: string, isCorrect: boolean): Promise<void>;
  
  // Analytics
  getUserStats(userId: string): Promise<{
    totalQuestions: number;
    totalCorrect: number;
    accuracyRate: number;
    topicsMastered: number;
    studyStreak: number;
  }>;
  
  getDiagnosticAnalytics(userId: string, testType?: 'DECA' | 'FBLA'): Promise<{
    subjects: Array<{ name: string; value: number; total: number; percentage: number }>;
    weakTopics: Array<{ topic: string; subject: string; accuracy: number }>;
    overallScore: number;
    completedTests: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByReplitId(replitUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitUserId, replitUserId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Question operations
  async getRandomQuestions(limit: number, subject?: string, topic?: string): Promise<Question[]> {
    let query = db.select().from(questions);
    
    if (subject && topic) {
      query = query.where(and(
        eq(questions.subject, subject),
        eq(questions.topic, topic)
      )) as any;
    } else if (subject) {
      query = query.where(eq(questions.subject, subject)) as any;
    } else if (topic) {
      query = query.where(eq(questions.topic, topic)) as any;
    }
    
    return query.orderBy(sql`RANDOM()`).limit(limit);
  }

  async getQuestionById(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async getQuestionsByTopic(topic: string, limit: number): Promise<Question[]> {
    return db.select().from(questions)
      .where(eq(questions.topic, topic))
      .orderBy(sql`RANDOM()`)
      .limit(limit);
  }

  // Diagnostic test operations
  async createDiagnosticTest(userId: string, testNumber: number): Promise<DiagnosticTest> {
    const [test] = await db.insert(diagnosticTests).values({
      userId,
      testNumber,
      status: "in_progress",
    }).returning();
    return test;
  }

  async getDiagnosticTest(testId: string): Promise<DiagnosticTest | undefined> {
    const [test] = await db.select().from(diagnosticTests).where(eq(diagnosticTests.id, testId));
    return test;
  }

  async getUserDiagnosticTests(userId: string): Promise<DiagnosticTest[]> {
    return db.select().from(diagnosticTests)
      .where(eq(diagnosticTests.userId, userId))
      .orderBy(diagnosticTests.testNumber);
  }

  async updateDiagnosticTestStatus(testId: string, status: string, score?: number): Promise<void> {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
      if (score !== undefined) {
        updateData.score = score;
      }
    }
    await db.update(diagnosticTests)
      .set(updateData)
      .where(eq(diagnosticTests.id, testId));
  }

  // Test response operations
  async saveTestResponse(response: { testId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }): Promise<void> {
    await db.insert(testResponses).values(response);
  }

  async getTestResponses(testId: string): Promise<TestResponse[]> {
    return db.select().from(testResponses).where(eq(testResponses.testId, testId));
  }

  // Practice session operations
  async createPracticeSession(userId: string, topicFilter?: string): Promise<PracticeSession> {
    const [session] = await db.insert(practiceSessions).values({
      userId,
      topicFilter: topicFilter || null,
    }).returning();
    return session;
  }

  async updatePracticeSession(sessionId: string, score: number, totalQuestions: number): Promise<void> {
    await db.update(practiceSessions)
      .set({
        score,
        totalQuestions,
        completedAt: new Date(),
      })
      .where(eq(practiceSessions.id, sessionId));
  }

  async savePracticeResponse(response: { sessionId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }): Promise<void> {
    await db.insert(practiceResponses).values(response);
  }

  // Topic performance operations
  async getTopicPerformance(userId: string): Promise<TopicPerformance[]> {
    return db.select().from(topicPerformance)
      .where(eq(topicPerformance.userId, userId))
      .orderBy(desc(topicPerformance.averageScore));
  }

  async updateTopicPerformance(userId: string, topic: string, isCorrect: boolean): Promise<void> {
    const [existing] = await db.select().from(topicPerformance)
      .where(and(
        eq(topicPerformance.userId, userId),
        eq(topicPerformance.topic, topic)
      ));

    if (existing) {
      const newTotalAttempted = existing.totalAttempted + 1;
      const newTotalCorrect = existing.totalCorrect + (isCorrect ? 1 : 0);
      const newAverageScore = Math.round((newTotalCorrect / newTotalAttempted) * 100);

      await db.update(topicPerformance)
        .set({
          totalAttempted: newTotalAttempted,
          totalCorrect: newTotalCorrect,
          averageScore: newAverageScore,
          lastPracticed: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(topicPerformance.userId, userId),
          eq(topicPerformance.topic, topic)
        ));
    } else {
      await db.insert(topicPerformance).values({
        userId,
        topic,
        totalAttempted: 1,
        totalCorrect: isCorrect ? 1 : 0,
        averageScore: isCorrect ? 100 : 0,
        lastPracticed: new Date(),
      });
    }
  }

  // Analytics
  async getUserStats(userId: string): Promise<{
    totalQuestions: number;
    totalCorrect: number;
    accuracyRate: number;
    topicsMastered: number;
    studyStreak: number;
  }> {
    // Get all practice responses
    const userSessions = await db.select().from(practiceSessions)
      .where(eq(practiceSessions.userId, userId));
    
    const sessionIds = userSessions.map(s => s.id);
    
    let totalQuestions = 0;
    let totalCorrect = 0;

    if (sessionIds.length > 0) {
      const responses = await db.select().from(practiceResponses)
        .where(inArray(practiceResponses.sessionId, sessionIds));
      
      totalQuestions = responses.length;
      totalCorrect = responses.filter(r => r.isCorrect).length;
    }

    // Get test responses too
    const userTests = await db.select().from(diagnosticTests)
      .where(eq(diagnosticTests.userId, userId));
    
    const testIds = userTests.map(t => t.id);
    
    if (testIds.length > 0) {
      const testResp = await db.select().from(testResponses)
        .where(inArray(testResponses.testId, testIds));
      
      totalQuestions += testResp.length;
      totalCorrect += testResp.filter(r => r.isCorrect).length;
    }

    const accuracyRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Get topics mastered (>80% accuracy)
    const performance = await this.getTopicPerformance(userId);
    const topicsMastered = performance.filter(p => p.averageScore >= 80).length;

    // Calculate study streak (simplified - consecutive days)
    const studyStreak = 14; // TODO: implement actual streak calculation

    return {
      totalQuestions,
      totalCorrect,
      accuracyRate,
      topicsMastered,
      studyStreak,
    };
  }

  async getDiagnosticAnalytics(userId: string, testType?: 'DECA' | 'FBLA'): Promise<{
    subjects: Array<{ name: string; value: number; total: number; percentage: number }>;
    weakTopics: Array<{ topic: string; subject: string; accuracy: number }>;
    overallScore: number;
    completedTests: number;
  }> {
    const DECA_SUBJECTS = ['Finance', 'Marketing', 'Operations', 'Management', 'Hospitality & Tourism', 'Entrepreneurship', 'Business Administration', 'Business Management'];
    const FBLA_SUBJECTS = ['Business Knowledge', 'Communication', 'Finance', 'Marketing'];

    const userTests = await db.select().from(diagnosticTests)
      .where(and(
        eq(diagnosticTests.userId, userId),
        eq(diagnosticTests.status, "completed")
      ));

    if (userTests.length === 0) {
      return {
        subjects: [],
        weakTopics: [],
        overallScore: 0,
        completedTests: 0,
      };
    }

    const testIds = userTests.map(t => t.id);
    
    const responses = await db.select({
      testResponse: testResponses,
      question: questions,
    })
    .from(testResponses)
    .innerJoin(questions, eq(testResponses.questionId, questions.id))
    .where(inArray(testResponses.testId, testIds));

    const filteredSubjects = testType === 'DECA' ? DECA_SUBJECTS : 
                             testType === 'FBLA' ? FBLA_SUBJECTS : 
                             [...DECA_SUBJECTS, ...FBLA_SUBJECTS];

    const filteredResponses = responses.filter(r => 
      filteredSubjects.includes(r.question.subject)
    );

    const subjectStats = new Map<string, { correct: number; total: number }>();
    const topicStats = new Map<string, { correct: number; total: number; subject: string }>();

    for (const { testResponse, question } of filteredResponses) {
      const subject = question.subject;
      const topic = question.topic;

      if (!subjectStats.has(subject)) {
        subjectStats.set(subject, { correct: 0, total: 0 });
      }
      const subjectStat = subjectStats.get(subject)!;
      subjectStat.total++;
      if (testResponse.isCorrect) {
        subjectStat.correct++;
      }

      if (!topicStats.has(topic)) {
        topicStats.set(topic, { correct: 0, total: 0, subject });
      }
      const topicStat = topicStats.get(topic)!;
      topicStat.total++;
      if (testResponse.isCorrect) {
        topicStat.correct++;
      }
    }

    const subjects = Array.from(subjectStats.entries()).map(([name, stats]) => ({
      name,
      value: stats.correct,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));

    const weakTopics = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        subject: stats.subject,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .filter(t => t.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy);

    const totalCorrect = filteredResponses.filter(r => r.testResponse.isCorrect).length;
    const totalQuestions = filteredResponses.length;
    const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const uniqueTestIds = new Set(filteredResponses.map(r => r.testResponse.testId));
    const completedTests = uniqueTestIds.size;

    return {
      subjects,
      weakTopics,
      overallScore,
      completedTests,
    };
  }
}

export const storage = new DatabaseStorage();
