import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  updateQuestionDifficulty,
  updateSpacedRepetition,
  updateConfidenceScore,
  updateDifficultyProgression,
} from "./adaptiveLearning";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth (OAuth with Google/GitHub/email)
  await setupAuth(app);

  // Auth endpoint - returns current user from OAuth session
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.json(null);
      }
      
      // Sanitize user object - exclude password and other sensitive fields
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Question routes
  app.get("/api/questions/random", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const subject = req.query.subject as string | undefined;
      const topic = req.query.topic as string | undefined;
      const testType = (req.query.testType as string) || "DECA";

      // IMPORTANT: testType separates DECA and FBLA - they NEVER mix
      const questions = await storage.getRandomQuestions(limit, subject, topic, testType);
      res.json({ questions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const question = await storage.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json({ question });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic test routes
  app.post("/api/diagnostic-tests", isAuthenticated, async (req, res) => {
    try {
      const { testNumber, testType } = req.body;
      
      if (!testNumber || testNumber < 1 || testNumber > 3) {
        return res.status(400).json({ error: "Valid test number (1-3) required" });
      }

      // IMPORTANT: testType (DECA or FBLA) separates question sets - they NEVER mix
      const test = await storage.createDiagnosticTest(
        (req.user as any).claims.sub!, 
        testNumber,
        testType || "DECA"
      );
      
      res.json({ test });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests", isAuthenticated, async (req, res) => {
    try {
      const tests = await storage.getUserDiagnosticTests((req.user as any).claims.sub!);
      res.json({ tests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getDiagnosticTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      if (test.userId !== (req.user as any).claims.sub) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json({ test });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const test = await storage.getDiagnosticTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      if (test.userId !== (req.user as any).claims.sub) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Return 100 random questions for the diagnostic test
      // IMPORTANT: Only get questions matching the test's event type (DECA/FBLA)
      const questions = await storage.getRandomQuestions(100, undefined, undefined, test.testType);
      res.json({ questions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/diagnostic-tests/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const { answers } = req.body; // { questionId: selectedAnswer }
      
      // Validate request body
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return res.status(400).json({ 
          error: "Invalid request format. Expected: { answers: { questionId: selectedAnswer, ... } }" 
        });
      }
      
      const test = await storage.getDiagnosticTest(req.params.id);
      
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      if (test.userId !== (req.user as any).claims.sub) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const userId = (req.user as any).claims.sub!;
      let correctCount = 0;
      const results = [];

      for (const [questionId, selectedAnswer] of Object.entries(answers)) {
        const question = await storage.getQuestionById(questionId);
        if (!question) continue;

        // DEFENSIVE: Validate question belongs to same event type (DECA/FBLA)
        if (question.testType !== test.testType) {
          console.error(`Question ${questionId} testType ${question.testType} does not match test testType ${test.testType}`);
          continue;
        }

        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;

        await storage.saveTestResponse({
          testId: test.id,
          questionId,
          selectedAnswer: selectedAnswer as number,
          isCorrect,
        });

        // Update subtopic performance (event-specific and subject-specific)
        // Use subtopic if available (more granular), otherwise fall back to topic
        const performanceTopic = question.subtopic || question.topic;
        await storage.updateTopicPerformance(userId, performanceTopic, isCorrect);

        // ML Algorithm Updates (Phase 3)
        // Note: Errors in ML algorithms should not break test submission
        try {
          console.log(`[ML] Processing question ${questionId} for diagnostic test`);
          
          // 1. Update question difficulty based on historical performance
          await updateQuestionDifficulty(questionId);
          
          // 2. Update spaced repetition (responseTimeMs = 0 for diagnostic tests)
          await updateSpacedRepetition(userId, questionId, isCorrect, 0);
          
          // 3. Update confidence score for the subtopic
          const questionDifficulty = question.difficulty ?? 5;
          await updateConfidenceScore(userId, performanceTopic, isCorrect, questionDifficulty);
          
          // 4. Update difficulty progression for the subtopic
          await updateDifficultyProgression(userId, performanceTopic, isCorrect, questionDifficulty);
          
          console.log(`[ML] Successfully updated ML data for question ${questionId}`);
        } catch (mlError: any) {
          console.error(`[ML] Error updating ML algorithms for question ${questionId}:`, mlError);
          // Continue with test submission even if ML update fails
        }

        results.push({
          questionId,
          isCorrect,
          correctAnswer: question.correctAnswer,
        });
      }

      const score = Math.round((correctCount / Object.keys(answers).length) * 100);
      await storage.updateDiagnosticTestStatus(test.id, "completed", score);

      res.json({ score, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get available subtopics for a given event type
  app.get("/api/subtopics", isAuthenticated, async (req, res) => {
    try {
      const testType = (req.query.testType as string) || "DECA";
      const subtopics = await storage.getAvailableSubtopics(testType);
      res.json({ subtopics });
    } catch (error: any) {
      console.error("[Subtopics] Error fetching subtopics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Practice session routes
  app.post("/api/practice-sessions", isAuthenticated, async (req, res) => {
    try {
      const { topicFilter, testType } = req.body;
      
      // IMPORTANT: testType separates DECA and FBLA - they NEVER mix
      const eventType = testType || "DECA";
      const userId = (req.user as any).claims.sub!;
      const session = await storage.createPracticeSession(userId, topicFilter, eventType);
      
      let questions;
      if (topicFilter) {
        // If specific topic filter is provided, use topic-based questions
        questions = await storage.getQuestionsByTopic(topicFilter, 25, eventType);
        console.log(`[Practice Session] Using topic filter: ${topicFilter}, got ${questions.length} questions`);
      } else {
        // Use ML-based adaptive practice to get prioritized questions
        console.log(`[Practice Session] Using adaptive learning for user ${userId}, testType: ${eventType}`);
        questions = await storage.getQuestionsForAdaptivePractice(userId, eventType, 25);
        console.log(`[Practice Session] Adaptive learning returned ${questions.length} prioritized questions`);
      }

      res.json({ session, questions });
    } catch (error: any) {
      console.error("[Practice Session] Error creating practice session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/practice-sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getPracticeSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: "Practice session not found" });
      }
      if (session.userId !== (req.user as any).claims.sub) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Return 25 random questions for the practice session
      // IMPORTANT: Only get questions matching the session's event type (DECA/FBLA)
      const questions = await storage.getRandomQuestions(25, undefined, undefined, session.testType);
      res.json({ session, questions });
    } catch (error: any) {
      console.error("Error fetching practice session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/practice-sessions/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const { answers, responseTimes } = req.body; // answers: { questionId: selectedAnswer }, responseTimes: { questionId: timeMs }
      
      // Load the existing practice session (don't create a new one!)
      const session = await storage.getPracticeSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: "Practice session not found" });
      }
      if (session.userId !== (req.user as any).claims.sub) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const userId = (req.user as any).claims.sub!;
      let correctCount = 0;
      const results = [];

      for (const [questionId, selectedAnswer] of Object.entries(answers)) {
        const question = await storage.getQuestionById(questionId);
        if (!question) continue;

        // DEFENSIVE: Validate question belongs to same event type (DECA/FBLA)
        if (question.testType !== session.testType) {
          console.error(`Question ${questionId} testType ${question.testType} does not match session testType ${session.testType}`);
          continue;
        }

        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;

        await storage.savePracticeResponse({
          sessionId: req.params.id,
          questionId,
          selectedAnswer: selectedAnswer as number,
          isCorrect,
        });

        // Update subtopic performance (event-specific and subject-specific)
        // Use subtopic if available (more granular), otherwise fall back to topic
        const performanceTopic = question.subtopic || question.topic;
        await storage.updateTopicPerformance(userId, performanceTopic, isCorrect);

        // ML Algorithm Updates (Phase 3)
        // Note: Errors in ML algorithms should not break practice session submission
        try {
          console.log(`[ML] Processing question ${questionId} for practice session`);
          
          // Get response time for this question (default to 0 if not provided)
          const responseTimeMs = (responseTimes && responseTimes[questionId]) ? responseTimes[questionId] : 0;
          
          // 1. Update question difficulty based on historical performance
          await updateQuestionDifficulty(questionId);
          
          // 2. Update spaced repetition with actual response time
          await updateSpacedRepetition(userId, questionId, isCorrect, responseTimeMs);
          
          // 3. Update confidence score for the subtopic
          const questionDifficulty = question.difficulty ?? 5;
          await updateConfidenceScore(userId, performanceTopic, isCorrect, questionDifficulty);
          
          // 4. Update difficulty progression for the subtopic
          await updateDifficultyProgression(userId, performanceTopic, isCorrect, questionDifficulty);
          
          console.log(`[ML] Successfully updated ML data for question ${questionId}`);
        } catch (mlError: any) {
          console.error(`[ML] Error updating ML algorithms for question ${questionId}:`, mlError);
          // Continue with session submission even if ML update fails
        }

        results.push({
          questionId,
          isCorrect,
          correctAnswer: question.correctAnswer,
        });
      }

      const score = Math.round((correctCount / Object.keys(answers).length) * 100);
      await storage.updatePracticeSession(req.params.id, score, Object.keys(answers).length);

      res.json({ score, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics routes
  app.get("/api/analytics/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserStats((req.user as any).claims.sub!);
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/topics", isAuthenticated, async (req, res) => {
    try {
      const performance = await storage.getTopicPerformance((req.user as any).claims.sub!);
      res.json({ performance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/diagnostics", isAuthenticated, async (req, res) => {
    try {
      const testType = req.query.type as 'DECA' | 'FBLA' | undefined;
      
      if (testType && testType !== 'DECA' && testType !== 'FBLA') {
        return res.status(400).json({ error: "Invalid test type. Must be 'DECA' or 'FBLA'" });
      }

      const analytics = await storage.getDiagnosticAnalytics((req.user as any).claims.sub!, testType);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Adaptive Learning routes
  app.get("/api/adaptive/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub!;
      const testType = (req.query.testType as string) || "DECA";
      const limit = parseInt(req.query.limit as string) || 25;

      // Validate testType
      if (testType !== 'DECA' && testType !== 'FBLA') {
        return res.status(400).json({ error: "Invalid test type. Must be 'DECA' or 'FBLA'" });
      }

      console.log(`[Adaptive Learning] Getting ${limit} prioritized questions for user ${userId}, testType: ${testType}`);

      // Get adaptive prioritized questions using ML algorithms
      const questions = await storage.getQuestionsForAdaptivePractice(userId, testType, limit);

      console.log(`[Adaptive Learning] Successfully retrieved ${questions.length} prioritized questions`);

      res.json({ questions });
    } catch (error: any) {
      console.error("[Adaptive Learning] Error getting recommendations:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
