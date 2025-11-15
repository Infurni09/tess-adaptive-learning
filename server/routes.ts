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
import { DECA_SUBJECTS, FBLA_SUBJECTS } from "../shared/constants";

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
      const { testNumber, testType, subject } = req.body;
      
      if (!testNumber || testNumber < 1 || testNumber > 3) {
        return res.status(400).json({ error: "Valid test number (1-3) required" });
      }

      // IMPORTANT: testType (DECA or FBLA) separates question sets - they NEVER mix
      // subject (optional) filters to specific subject within the event
      const test = await storage.createDiagnosticTest(
        (req.user as any).claims.sub!, 
        testNumber,
        testType || "DECA",
        subject
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
      
      // Deterministic approach - no random sampling limits
      let questions = [];

      if (test.subject) {
        // Step 1: Get ALL available questions from the specific subject
        const subjectQuestions = await storage.getRandomQuestions(1000, test.subject, undefined, test.testType);
        questions = subjectQuestions.slice(0, Math.min(100, subjectQuestions.length));
        
        // Step 2: If we need more, backfill from the broader event
        if (questions.length < 100) {
          const excludeIds = questions.map(q => q.id);
          const additionalNeeded = 100 - questions.length;
          
          // Get all remaining event questions, excluding already-selected ones
          const eventQuestions = await storage.getRandomQuestions(1000, undefined, undefined, test.testType, excludeIds);
          
          // Add exactly as many as we need
          questions = [...questions, ...eventQuestions.slice(0, additionalNeeded)];
        }
      } else {
        // No subject - get 100 from entire event
        const allQuestions = await storage.getRandomQuestions(1000, undefined, undefined, test.testType);
        questions = allQuestions.slice(0, Math.min(100, allQuestions.length));
      }

      // This approach guarantees exactly 100 questions if the event has >=100 total
      if (questions.length < 100) {
        console.warn(`[Diagnostic] Only ${questions.length} questions available in ${test.testType}. Database needs more questions.`);
      }
      
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
      const questionIds = Object.keys(answers);

      // Fetch all questions at once (batch query)
      const questionsPromises = questionIds.map(qId => storage.getQuestionById(qId));
      const questionsResults = await Promise.all(questionsPromises);
      const questions = questionsResults.filter(q => q !== null);

      // Calculate score quickly (just count correct answers)
      let correctCount = 0;
      const results = [];

      for (const question of questions) {
        if (!question) continue;

        // DEFENSIVE: Validate question belongs to same event type (DECA/FBLA)
        if (question.testType !== test.testType) {
          console.error(`Question ${question.id} testType ${question.testType} does not match test testType ${test.testType}`);
          continue;
        }

        const selectedAnswer = answers[question.id];
        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;

        results.push({
          questionId: question.id,
          isCorrect,
          correctAnswer: question.correctAnswer,
        });
      }

      const score = Math.round((correctCount / questionIds.length) * 100);
      await storage.updateDiagnosticTestStatus(test.id, "completed", score);

      // Send response immediately
      res.json({ score, results });

      // Process ALL data persistence and ML updates in background
      console.log(`[Background] Starting async processing for test ${test.id} (${questionIds.length} questions)`);
      
      (async () => {
        try {
          // Background processing: save responses, update performance, run ML
          for (const question of questions) {
            if (!question) continue;
            
            const selectedAnswer = answers[question.id];
            const isCorrect = question.correctAnswer === selectedAnswer;
            
            // Save response
            await storage.saveTestResponse({
              testId: test.id,
              questionId: question.id,
              selectedAnswer: selectedAnswer as number,
              isCorrect,
            });

            // Update topic performance
            const performanceTopic = question.subtopic || question.topic;
            await storage.updateTopicPerformance(userId, performanceTopic, isCorrect);

            // ML updates
            const questionDifficulty = question.difficulty ?? 5;
            await Promise.all([
              updateQuestionDifficulty(question.id),
              updateSpacedRepetition(userId, question.id, isCorrect, 0),
              updateConfidenceScore(userId, performanceTopic, isCorrect, questionDifficulty),
              updateDifficultyProgression(userId, performanceTopic, isCorrect, questionDifficulty),
            ]).catch(mlError => console.error(`[ML] Error for question ${question.id}:`, mlError));
          }
          
          console.log(`[Background] Completed processing for test ${test.id}`);
        } catch (bgError: any) {
          console.error(`[Background] Error processing test ${test.id}:`, bgError);
        }
      })();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get available subjects for a given event type (public endpoint - no auth required)
  app.get("/api/subjects", async (req, res) => {
    try {
      const testType = (req.query.testType as string) || "DECA";
      
      // Get canonical subject list for the event type
      const canonicalSubjects = testType === "FBLA" ? FBLA_SUBJECTS : DECA_SUBJECTS;
      
      // Get actual question counts from database
      const actualSubjects = await storage.getAvailableSubjects(testType);
      
      // Create a map of actual counts for quick lookup
      const countMap = new Map<string, number>();
      actualSubjects.forEach(s => {
        countMap.set(s.subject, s.count);
      });
      
      // Merge canonical subjects with actual counts
      // All canonical subjects will appear, even those with 0 questions
      const subjects = canonicalSubjects.map(canonical => ({
        subject: canonical.name,
        count: countMap.get(canonical.name) || 0,
        displayOrder: canonical.displayOrder,
      })).sort((a, b) => a.displayOrder - b.displayOrder);
      
      res.json({ subjects });
    } catch (error: any) {
      console.error("[Subjects] Error fetching subjects:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get available subtopics for a given event type and optional subject (public endpoint - no auth required)
  app.get("/api/subtopics", async (req, res) => {
    try {
      const testType = (req.query.testType as string) || "DECA";
      const subject = req.query.subject as string | undefined;
      
      // Filter by subject in SQL (not in memory) for performance
      const subtopics = await storage.getAvailableSubtopics(testType, subject);
      
      res.json({ subtopics });
    } catch (error: any) {
      console.error("[Subtopics] Error fetching subtopics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Practice session routes
  app.post("/api/practice-sessions", isAuthenticated, async (req, res) => {
    try {
      const { topicFilter, testType, practiceType } = req.body;
      
      // IMPORTANT: testType separates DECA and FBLA - they NEVER mix
      const eventType = testType || "DECA";
      const userId = (req.user as any).claims.sub!;
      const session = await storage.createPracticeSession(userId, topicFilter, eventType);
      
      let questions;
      const TARGET_QUESTION_COUNT = 25;
      
      if (topicFilter) {
        // Determine if this is subject-level or subtopic-level based on filter format
        // Subject: "Marketing", "Finance" (no hyphen)
        // Subtopic: "DECA-Marketing-Product" (contains hyphen)
        if (topicFilter.includes("-")) {
          // Subtopic-level practice with cascading fallback
          questions = await storage.getQuestionsByTopic(topicFilter, TARGET_QUESTION_COUNT, eventType);
          console.log(`[Practice Session] Subtopic filter: ${topicFilter}, got ${questions.length} questions`);
          
          // Cascading backfill to guarantee 25 questions
          if (questions.length < TARGET_QUESTION_COUNT) {
            const parts = topicFilter.split("-");
            const subject = parts[1]; // Extract subject from "DECA-Finance-Analysis"
            let existingIds = new Set(questions.map(q => q.id));
            
            // Step 1: Backfill from parent subject
            console.log(`[Practice Session] Backfilling from subject: ${subject} (need ${TARGET_QUESTION_COUNT - questions.length} more)`);
            const subjectQuestions = await storage.getQuestionsBySubject(subject, 100, eventType); // Get more to filter
            const fromSubject = subjectQuestions.filter(q => !existingIds.has(q.id));
            questions = [...questions, ...fromSubject];
            
            // Step 2: If still not enough, backfill from entire event
            if (questions.length < TARGET_QUESTION_COUNT) {
              existingIds = new Set(questions.map(q => q.id));
              console.log(`[Practice Session] Still need ${TARGET_QUESTION_COUNT - questions.length} more, backfilling from entire ${eventType} event`);
              const eventQuestions = await storage.getRandomQuestions(100, undefined, undefined, eventType);
              const fromEvent = eventQuestions.filter(q => !existingIds.has(q.id));
              questions = [...questions, ...fromEvent];
            }
            
            questions = questions.slice(0, TARGET_QUESTION_COUNT);
            console.log(`[Practice Session] After cascading backfill: ${questions.length} questions total`);
          }
        } else {
          // Subject-level practice with event-level fallback
          questions = await storage.getQuestionsBySubject(topicFilter, TARGET_QUESTION_COUNT, eventType);
          console.log(`[Practice Session] Subject filter: ${topicFilter}, got ${questions.length} questions`);
          
          // Fallback to event-level if subject has insufficient questions
          if (questions.length < TARGET_QUESTION_COUNT) {
            const existingIds = new Set(questions.map(q => q.id));
            console.log(`[Practice Session] Subject has only ${questions.length} questions, backfilling from ${eventType} event`);
            const eventQuestions = await storage.getRandomQuestions(100, undefined, undefined, eventType);
            const fromEvent = eventQuestions.filter(q => !existingIds.has(q.id));
            questions = [...questions, ...fromEvent].slice(0, TARGET_QUESTION_COUNT);
            console.log(`[Practice Session] After event backfill: ${questions.length} questions total`);
          }
        }
      } else if (practiceType === 'event') {
        // Event-level practice: all questions from the event
        questions = await storage.getRandomQuestions(TARGET_QUESTION_COUNT, undefined, undefined, eventType);
        console.log(`[Practice Session] Event-level practice for ${eventType}, got ${questions.length} questions`);
      } else {
        // ML-based adaptive practice (default when no filter and no practiceType)
        console.log(`[Practice Session] Using adaptive learning for user ${userId}, testType: ${eventType}`);
        questions = await storage.getQuestionsForAdaptivePractice(userId, eventType, TARGET_QUESTION_COUNT);
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

  // ADMIN: One-time database seeding endpoint for production deployment
  // Security: Requires authentication + environment variable authorization + empty database check
  app.post("/api/admin/seed-database", isAuthenticated, async (req, res) => {
    try {
      console.log("[ADMIN SEED] Database seeding request received");
      
      // Admin authorization check: require ADMIN_SEED_SECRET environment variable
      const adminSecret = process.env.ADMIN_SEED_SECRET;
      const providedSecret = req.headers['x-admin-secret'] as string;
      
      if (!adminSecret || !providedSecret || adminSecret !== providedSecret) {
        console.log("[ADMIN SEED] Unauthorized: missing or invalid admin secret");
        return res.status(403).json({ 
          error: "Forbidden: Admin authorization required. Set ADMIN_SEED_SECRET env var and provide X-Admin-Secret header." 
        });
      }
      
      // Safety check: only allow seeding if database is empty
      const existingCount = await storage.getQuestionCount();
      if (existingCount > 0) {
        console.log(`[ADMIN SEED] Database already has ${existingCount} questions - seeding not allowed`);
        return res.status(400).json({ 
          error: "Database already contains questions. Seeding is only allowed on empty databases.", 
          currentCount: existingCount 
        });
      }

      console.log("[ADMIN SEED] Database is empty - starting import...");
      
      // Import questions from JSON files using same logic as import-questions.ts
      const fs = await import("fs");
      const path = await import("path");
      
      interface RawQuestion {
        Question: string;
        A: string;
        B: string;
        C: string;
        D: string;
        answer: string;
        topic: string;
      }

      const cleanOption = (text: string): string => text.replace(/^[A-D]:\s*/, "").trim();
      const extractCorrectAnswer = (answerText: string): number => {
        const match = answerText.match(/^([A-D]):/);
        return match ? match[1].charCodeAt(0) - 65 : 0;
      };
      const cleanQuestionText = (text: string): string => text.replace(/\s+/g, " ").trim();

      const generateSubtopic = (question: string, topic: string, subject: string, testType: string): string => {
        const lowerQuestion = question.toLowerCase();
        const lowerTopic = topic.toLowerCase();
        const context = `${lowerQuestion} ${lowerTopic}`;
        
        const patterns: Record<string, string[]> = {
          analysis: ["ratio", "analysis", "analyze", "interpret", "evaluate"],
          planning: ["budget", "forecast", "plan", "project"],
          markets: ["stock", "bond", "equity", "debt", "market"],
          credit: ["credit", "loan", "lending", "borrow"],
          risk: ["risk", "insurance", "protect"],
          strategy: ["strategy", "objective", "goal", "positioning"],
          product: ["product", "brand", "feature", "quality"],
          pricing: ["price", "pricing", "cost", "value"],
          promotion: ["promotion", "advertising", "publicity"],
          customer: ["customer", "consumer", "buyer", "satisfaction"],
          management: ["management", "manager", "supervise", "organize"],
          leadership: ["leadership", "leader", "motivate", "inspire"],
          hr: ["human resource", "employee", "recruit", "hire"],
          law: ["law", "legal", "regulation", "compliance"],
          ethics: ["ethics", "ethical", "responsibility"],
          technology: ["technology", "software", "system", "data"],
        };
        
        for (const [category, keywords] of Object.entries(patterns)) {
          if (keywords.some(kw => context.includes(kw))) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            return `${testType}-${subject}-${categoryName}`;
          }
        }
        
        return `${testType}-${subject}-${topic}`;
      };

      const questionFiles = [
        { file: "attached_assets/Finance DECA_1762624175016.json", subject: "Finance" },
        { file: "attached_assets/Marketing DECA_1762624175016.json", subject: "Marketing" },
        { file: "attached_assets/Business Administration Core DECA_1762624175016.json", subject: "Business Administration" },
        { file: "attached_assets/Business Management and Adminstration DECA_1762624175016.json", subject: "Business Management" },
        { file: "attached_assets/Entrepreneurship DECA_1762624175016.json", subject: "Entrepreneurship" },
        { file: "attached_assets/Hospitality and Tourism DECA_1762624175016.json", subject: "Hospitality & Tourism" },
      ];

      let totalImported = 0;
      const importResults = [];

      for (const { file, subject } of questionFiles) {
        if (!fs.existsSync(file)) {
          console.log(`[ADMIN SEED] File not found: ${file}`);
          importResults.push({ subject, status: "File not found", imported: 0 });
          continue;
        }

        console.log(`[ADMIN SEED] Importing ${subject}...`);
        const fileName = path.basename(file);
        const testType = fileName.toUpperCase().includes("FBLA") ? "FBLA" : "DECA";
        
        const fileContent = fs.readFileSync(file, "utf-8");
        const rawQuestions: RawQuestion[] = JSON.parse(fileContent);
        
        const questionsToInsert = [];
        let skipped = 0;

        for (const raw of rawQuestions) {
          if (!raw.Question || !raw.A || !raw.B || !raw.C || !raw.D || !raw.answer) {
            skipped++;
            continue;
          }

          const question = cleanQuestionText(raw.Question);
          const optionA = cleanOption(raw.A);
          const optionB = cleanOption(raw.B);
          const optionC = cleanOption(raw.C);
          const optionD = cleanOption(raw.D);

          if (optionA.length > 500 || optionB.length > 500 || optionC.length > 500 || optionD.length > 500) {
            skipped++;
            continue;
          }
          if (question.length < 10 || question.length > 1000) {
            skipped++;
            continue;
          }

          const correctAnswer = extractCorrectAnswer(raw.answer);
          const topic = raw.topic || "General";
          const subtopic = generateSubtopic(question, topic, subject, testType);

          questionsToInsert.push({
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            topic,
            subtopic,
            subject,
            testType,
            difficulty: 1,
          });
        }

        if (questionsToInsert.length > 0) {
          await storage.bulkInsertQuestions(questionsToInsert);
          totalImported += questionsToInsert.length;
          console.log(`[ADMIN SEED] ✓ Imported ${questionsToInsert.length} ${subject} questions`);
          importResults.push({ subject, status: "Success", imported: questionsToInsert.length, skipped });
        }
      }

      console.log(`[ADMIN SEED] ✓ Complete! Imported ${totalImported} questions total`);
      
      res.json({ 
        success: true, 
        totalImported,
        results: importResults,
        message: `Successfully imported ${totalImported} DECA questions into production database` 
      });
    } catch (error: any) {
      console.error("[ADMIN SEED] Error seeding database:", error);
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
