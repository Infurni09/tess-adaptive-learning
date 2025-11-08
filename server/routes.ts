import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple session-based auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Registration route
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const user = await storage.createUser({ username, password: hashedPassword, replitUserId: null });

      req.session.userId = user.id;
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Question routes
  app.get("/api/questions/random", requireAuth, async (req, res) => {
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

  app.get("/api/questions/:id", requireAuth, async (req, res) => {
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
  app.post("/api/diagnostic-tests", requireAuth, async (req, res) => {
    try {
      const { testNumber, testType } = req.body;
      
      if (!testNumber || testNumber < 1 || testNumber > 3) {
        return res.status(400).json({ error: "Valid test number (1-3) required" });
      }

      // IMPORTANT: testType (DECA or FBLA) separates question sets - they NEVER mix
      const test = await storage.createDiagnosticTest(
        req.session.userId!, 
        testNumber,
        testType || "DECA"
      );
      
      res.json({ test });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests", requireAuth, async (req, res) => {
    try {
      const tests = await storage.getUserDiagnosticTests(req.session.userId!);
      res.json({ tests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests/:id", requireAuth, async (req, res) => {
    try {
      const test = await storage.getDiagnosticTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      if (test.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json({ test });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests/:id/questions", requireAuth, async (req, res) => {
    try {
      const test = await storage.getDiagnosticTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "Test not found" });
      }
      if (test.userId !== req.session.userId) {
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

  app.post("/api/diagnostic-tests/:id/submit", requireAuth, async (req, res) => {
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
      if (test.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

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
        await storage.updateTopicPerformance(req.session.userId!, performanceTopic, isCorrect);

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

  // Practice session routes
  app.post("/api/practice-sessions", requireAuth, async (req, res) => {
    try {
      const { topicFilter, testType } = req.body;
      
      // IMPORTANT: testType separates DECA and FBLA - they NEVER mix
      const eventType = testType || "DECA";
      const session = await storage.createPracticeSession(req.session.userId!, topicFilter, eventType);
      
      // Get questions based on weak topics or random
      // CRITICAL: Filter performance by event type to prevent DECA/FBLA mixing
      const performance = await storage.getTopicPerformance(req.session.userId!);
      const weakTopics = performance
        .filter(p => p.averageScore < 70 && p.topic.startsWith(eventType + "-"))
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 3)
        .map(p => p.topic);

      let questions;
      if (topicFilter) {
        questions = await storage.getQuestionsByTopic(topicFilter, 20, eventType);
      } else if (weakTopics.length > 0) {
        // Mix questions from weak topics
        questions = await storage.getQuestionsByTopic(weakTopics[0], 20, eventType);
      } else {
        questions = await storage.getRandomQuestions(20, undefined, undefined, eventType);
      }

      res.json({ session, questions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/practice-sessions/:id/submit", requireAuth, async (req, res) => {
    try {
      const { answers } = req.body;
      
      // Load the existing practice session (don't create a new one!)
      const session = await storage.getPracticeSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: "Practice session not found" });
      }
      if (session.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

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
        await storage.updateTopicPerformance(req.session.userId!, performanceTopic, isCorrect);

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
  app.get("/api/analytics/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.session.userId!);
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/topics", requireAuth, async (req, res) => {
    try {
      const performance = await storage.getTopicPerformance(req.session.userId!);
      res.json({ performance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/diagnostics", requireAuth, async (req, res) => {
    try {
      const testType = req.query.type as 'DECA' | 'FBLA' | undefined;
      
      if (testType && testType !== 'DECA' && testType !== 'FBLA') {
        return res.status(400).json({ error: "Invalid test type. Must be 'DECA' or 'FBLA'" });
      }

      const analytics = await storage.getDiagnosticAnalytics(req.session.userId!, testType);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
