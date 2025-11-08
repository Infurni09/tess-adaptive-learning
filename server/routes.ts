import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

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
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "Username required" });
      }

      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({ username, replitUserId: null });
      }

      req.session.userId = user.id;
      res.json({ user });
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
      const user = await storage.getUser(req.session.userId);
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

      const questions = await storage.getRandomQuestions(limit, subject, topic);
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
      const { testNumber } = req.body;
      
      if (!testNumber || testNumber < 1 || testNumber > 3) {
        return res.status(400).json({ error: "Valid test number (1-3) required" });
      }

      const test = await storage.createDiagnosticTest(req.session.userId, testNumber);
      
      // Get 30 random questions for the test
      const questions = await storage.getRandomQuestions(30);
      
      res.json({ test, questions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/diagnostic-tests", requireAuth, async (req, res) => {
    try {
      const tests = await storage.getUserDiagnosticTests(req.session.userId);
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

  app.post("/api/diagnostic-tests/:id/submit", requireAuth, async (req, res) => {
    try {
      const { answers } = req.body; // { questionId: selectedAnswer }
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

        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;

        await storage.saveTestResponse({
          testId: test.id,
          questionId,
          selectedAnswer: selectedAnswer as number,
          isCorrect,
        });

        // Update topic performance
        await storage.updateTopicPerformance(req.session.userId, question.topic, isCorrect);

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
      const { topicFilter } = req.body;
      const session = await storage.createPracticeSession(req.session.userId, topicFilter);
      
      // Get questions based on weak topics or random
      const performance = await storage.getTopicPerformance(req.session.userId);
      const weakTopics = performance
        .filter(p => p.averageScore < 70)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, 3)
        .map(p => p.topic);

      let questions;
      if (topicFilter) {
        questions = await storage.getQuestionsByTopic(topicFilter, 20);
      } else if (weakTopics.length > 0) {
        // Mix questions from weak topics
        questions = await storage.getQuestionsByTopic(weakTopics[0], 20);
      } else {
        questions = await storage.getRandomQuestions(20);
      }

      res.json({ session, questions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/practice-sessions/:id/submit", requireAuth, async (req, res) => {
    try {
      const { answers } = req.body;
      const session = await storage.createPracticeSession(req.session.userId);

      let correctCount = 0;
      const results = [];

      for (const [questionId, selectedAnswer] of Object.entries(answers)) {
        const question = await storage.getQuestionById(questionId);
        if (!question) continue;

        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;

        await storage.savePracticeResponse({
          sessionId: req.params.id,
          questionId,
          selectedAnswer: selectedAnswer as number,
          isCorrect,
        });

        await storage.updateTopicPerformance(req.session.userId, question.topic, isCorrect);

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
      const stats = await storage.getUserStats(req.session.userId);
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/topics", requireAuth, async (req, res) => {
    try {
      const performance = await storage.getTopicPerformance(req.session.userId);
      res.json({ performance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
