import { db } from "./db";
import { 
  questions, questionDifficultyHistory, userQuestionHistory, topicPerformance,
  testResponses, practiceResponses, type Question 
} from "@shared/schema";
import { eq, and, gte, sql, desc, inArray } from "drizzle-orm";

/**
 * Phase 2: Adaptive Learning ML Algorithms
 * 
 * This module implements machine learning algorithms for personalized learning:
 * 1. Difficulty Computation (EMA-based)
 * 2. Spaced Repetition (SM-2 Algorithm)
 * 3. Confidence Scoring (Temporal Decay)
 * 4. Smart Question Prioritization
 * 5. Difficulty Progression
 */

const EMA_ALPHA = 0.3; // Weight for exponential moving average
const LAMBDA_DECAY = 0.1; // Temporal decay rate for confidence
const PRIORITY_WEIGHTS = {
  w1_confidence: 0.4,     // Weight for low confidence topics
  w2_difficulty_gap: 0.25, // Weight for difficulty alignment
  w3_spaced: 0.2,          // Weight for spaced repetition
  w4_recency: 0.15,        // Weight for question freshness
};

/**
 * 1. Difficulty Computation (EMA-based)
 * 
 * Calculates question difficulty based on historical accuracy using
 * Exponential Moving Average for smooth adaptation over time.
 * 
 * Algorithm:
 * - Get last 30 days of responses
 * - Calculate current accuracy = correct / total
 * - Apply EMA: ema = alpha * curr_accuracy + (1-alpha) * prev_ema
 * - Difficulty = clamp(10 - round(accuracy * 10)) // 1=easy, 10=hard
 */
export async function updateQuestionDifficulty(questionId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all responses from last 30 days for this question
    const testResp = await db.select()
      .from(testResponses)
      .where(and(
        eq(testResponses.questionId, questionId),
        gte(testResponses.createdAt, thirtyDaysAgo)
      ));

    const practiceResp = await db.select()
      .from(practiceResponses)
      .where(eq(practiceResponses.questionId, questionId));

    const allResponses = [...testResp, ...practiceResp];
    
    if (allResponses.length === 0) {
      // No data yet, return default difficulty
      return 5;
    }

    // Calculate current accuracy
    const totalAttempts = allResponses.length;
    const correctAttempts = allResponses.filter(r => r.isCorrect).length;
    const currentAccuracy = correctAttempts / totalAttempts;

    // Get previous EMA from history
    const [previousHistory] = await db.select()
      .from(questionDifficultyHistory)
      .where(eq(questionDifficultyHistory.questionId, questionId))
      .orderBy(desc(questionDifficultyHistory.windowEnd))
      .limit(1);

    let previousEMA = 0.5; // Default to 50% accuracy
    if (previousHistory) {
      previousEMA = previousHistory.correct / Math.max(previousHistory.attempts, 1);
    }

    // Apply EMA smoothing
    const emaAccuracy = EMA_ALPHA * currentAccuracy + (1 - EMA_ALPHA) * previousEMA;

    // Calculate difficulty: high accuracy = low difficulty
    // Difficulty scale: 1 (easy) to 10 (hard)
    const computedDifficulty = Math.max(1, Math.min(10, 
      Math.round(10 - emaAccuracy * 10)
    ));

    // Store in history
    const now = new Date();
    await db.insert(questionDifficultyHistory).values({
      questionId,
      windowStart: thirtyDaysAgo,
      windowEnd: now,
      attempts: totalAttempts,
      correct: correctAttempts,
      computedDifficulty,
    });

    // Update question difficulty
    await db.update(questions)
      .set({ difficulty: computedDifficulty })
      .where(eq(questions.id, questionId));

    return computedDifficulty;
  } catch (error) {
    console.error('Error updating question difficulty:', error);
    return 5; // Return default on error
  }
}

/**
 * 2. Spaced Repetition (SM-2 Algorithm)
 * 
 * Implements the SuperMemo 2 algorithm for optimal review scheduling.
 * Adapts review intervals based on user performance.
 * 
 * Quality Score:
 * - 5: Perfect response (fast & correct)
 * - 4: Good response (slow & correct)
 * - 3: Hesitant correct
 * - 0-2: Incorrect (reset interval)
 */
export async function updateSpacedRepetition(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  responseTimeMs: number
): Promise<void> {
  try {
    // Get existing history or create new
    const [existing] = await db.select()
      .from(userQuestionHistory)
      .where(and(
        eq(userQuestionHistory.userId, userId),
        eq(userQuestionHistory.questionId, questionId)
      ));

    const now = new Date();

    // Determine quality score based on correctness and speed
    // Fast: < 15 seconds, Slow: > 30 seconds
    let quality: number;
    if (!isCorrect) {
      quality = 0; // Incorrect
    } else if (responseTimeMs < 15000) {
      quality = 5; // Fast correct
    } else if (responseTimeMs < 30000) {
      quality = 4; // Normal correct
    } else {
      quality = 3; // Slow correct
    }

    let easeFactor = existing?.easeFactor ?? 2.5;
    let repetitions = existing?.repetitions ?? 0;
    let intervalDays = existing?.intervalDays ?? 1;
    let streak = existing?.streak ?? 0;

    // SM-2 Algorithm
    if (quality >= 3) {
      // Correct response
      repetitions += 1;
      streak += 1;

      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }

      // Adjust ease factor
      easeFactor = Math.max(1.3, 
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      // Incorrect response - reset
      repetitions = 0;
      intervalDays = 1;
      streak = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    // Calculate next review date
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + intervalDays);

    // Upsert user question history
    if (existing) {
      await db.update(userQuestionHistory)
        .set({
          lastSeen: now,
          nextReview,
          intervalDays,
          easeFactor,
          repetitions,
          lastResult: isCorrect,
          streak,
          updatedAt: now,
        })
        .where(eq(userQuestionHistory.id, existing.id));
    } else {
      await db.insert(userQuestionHistory).values({
        userId,
        questionId,
        lastSeen: now,
        nextReview,
        intervalDays,
        easeFactor,
        repetitions,
        lastResult: isCorrect,
        streak,
      });
    }
  } catch (error) {
    console.error('Error updating spaced repetition:', error);
    throw error;
  }
}

/**
 * 3. Confidence Scoring (Temporal Decay)
 * 
 * Updates user confidence in a topic with temporal decay.
 * Recent performance weighs more heavily than older performance.
 * 
 * Formula:
 * - Apply temporal decay: confidence *= e^(-lambda * days_since_update)
 * - Adjust based on result + difficulty weight
 */
export async function updateConfidenceScore(
  userId: string,
  subtopic: string,
  isCorrect: boolean,
  questionDifficulty: number
): Promise<void> {
  try {
    // Get or create topic performance
    const [existing] = await db.select()
      .from(topicPerformance)
      .where(and(
        eq(topicPerformance.userId, userId),
        eq(topicPerformance.topic, subtopic)
      ));

    const now = new Date();
    let confidence = existing?.confidenceScore ?? 50; // Start at neutral

    if (existing && existing.lastConfidenceUpdate) {
      // Apply temporal decay
      const daysSinceUpdate = Math.floor(
        (now.getTime() - existing.lastConfidenceUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate > 0) {
        const decayFactor = Math.exp(-LAMBDA_DECAY * daysSinceUpdate);
        confidence *= decayFactor;
      }
    }

    // Adjust confidence based on result and difficulty
    // Difficulty weight: harder questions have more impact
    const difficultyWeight = questionDifficulty / 10; // 0.1 to 1.0
    const baseAdjustment = isCorrect ? 5 : -8;
    const adjustment = baseAdjustment * (0.5 + 0.5 * difficultyWeight);

    confidence = Math.max(0, Math.min(100, confidence + adjustment));

    // Update or insert topic performance
    if (existing) {
      await db.update(topicPerformance)
        .set({
          confidenceScore: confidence,
          lastConfidenceUpdate: now,
          updatedAt: now,
        })
        .where(eq(topicPerformance.id, existing.id));
    } else {
      await db.insert(topicPerformance).values({
        userId,
        topic: subtopic,
        totalAttempted: 0,
        totalCorrect: 0,
        averageScore: 0,
        confidenceScore: confidence,
        lastConfidenceUpdate: now,
      });
    }
  } catch (error) {
    console.error('Error updating confidence score:', error);
    throw error;
  }
}

/**
 * 4. Smart Question Prioritization
 * 
 * Selects optimal questions based on multiple factors:
 * - User's weak topics (low confidence)
 * - Difficulty alignment with user level
 * - Spaced repetition schedule
 * - Question recency (avoid recent questions)
 * 
 * Mix strategy:
 * - 60% from weak topics
 * - 25% from due reviews (spaced repetition)
 * - 15% stretch questions (slightly harder)
 */
export async function getPrioritizedQuestions(
  userId: string,
  testType: string,
  limit: number
): Promise<Question[]> {
  try {
    const now = new Date();

    // Get user's topic performance
    const performance = await db.select()
      .from(topicPerformance)
      .where(eq(topicPerformance.userId, userId));

    // Get user's question history for recency filtering
    const history = await db.select()
      .from(userQuestionHistory)
      .where(eq(userQuestionHistory.userId, userId));

    // Get candidate questions
    const allQuestions = await db.select()
      .from(questions)
      .where(eq(questions.testType, testType));

    // Calculate user's average difficulty level
    const avgDifficulty = performance.length > 0
      ? performance.reduce((sum, p) => sum + (p.lastDifficultyLevel || 5), 0) / performance.length
      : 5;

    // Score each question
    interface ScoredQuestion {
      question: Question;
      priority: number;
      category: 'weak' | 'review' | 'stretch';
    }

    const scored: ScoredQuestion[] = allQuestions.map(q => {
      const subtopic = q.subtopic || q.topic;
      
      // Find topic performance
      const topicPerf = performance.find(p => p.topic === subtopic);
      const confidence = topicPerf?.confidenceScore ?? 50;

      // Find question history
      const qHistory = history.find(h => h.questionId === q.id);
      
      // Calculate priority components
      const w1 = PRIORITY_WEIGHTS.w1_confidence;
      const w2 = PRIORITY_WEIGHTS.w2_difficulty_gap;
      const w3 = PRIORITY_WEIGHTS.w3_spaced;
      const w4 = PRIORITY_WEIGHTS.w4_recency;

      // Component 1: Low confidence = high priority
      const confidenceScore = (100 - confidence) / 100;

      // Component 2: Difficulty alignment (prefer questions near user level)
      const difficultyGap = Math.abs((q.difficulty ?? 5) - avgDifficulty);
      const difficultyScore = 1 - (difficultyGap / 10);

      // Component 3: Spaced repetition (due for review?)
      let spacedScore = 0;
      if (qHistory && qHistory.nextReview) {
        const daysUntilReview = Math.floor(
          (qHistory.nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilReview <= 0) {
          spacedScore = 1; // Due or overdue
        } else if (daysUntilReview <= 2) {
          spacedScore = 0.5; // Almost due
        }
      }

      // Component 4: Recency penalty (avoid recently seen questions)
      let recencyScore = 1;
      if (qHistory && qHistory.lastSeen) {
        const daysSinceSeen = Math.floor(
          (now.getTime() - qHistory.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceSeen < 3) {
          recencyScore = 0.2; // Very recent
        } else if (daysSinceSeen < 7) {
          recencyScore = 0.6; // Recent
        }
      }

      // Calculate total priority
      const priority = 
        w1 * confidenceScore +
        w2 * difficultyScore +
        w3 * spacedScore +
        w4 * recencyScore;

      // Categorize question
      let category: 'weak' | 'review' | 'stretch';
      if (confidence < 60) {
        category = 'weak';
      } else if (spacedScore > 0.5) {
        category = 'review';
      } else {
        category = 'stretch';
      }

      return { question: q, priority, category };
    });

    // Sort by priority
    scored.sort((a, b) => b.priority - a.priority);

    // Apply mix rules: 60% weak, 25% review, 15% stretch
    const weakCount = Math.ceil(limit * 0.6);
    const reviewCount = Math.ceil(limit * 0.25);
    const stretchCount = limit - weakCount - reviewCount;

    const weak = scored.filter(s => s.category === 'weak').slice(0, weakCount);
    const review = scored.filter(s => s.category === 'review').slice(0, reviewCount);
    const stretch = scored.filter(s => s.category === 'stretch').slice(0, stretchCount);

    let selected = [...weak, ...review, ...stretch];

    // Fill remaining if needed
    if (selected.length < limit) {
      const remaining = scored.filter(s => !selected.includes(s))
        .slice(0, limit - selected.length);
      selected = [...selected, ...remaining];
    }

    // Shuffle to avoid predictable patterns
    selected = shuffleArray(selected);

    // Prevent >3 consecutive hard questions (difficulty > 7)
    const final: ScoredQuestion[] = [];
    let consecutiveHard = 0;

    for (const item of selected) {
      const difficulty = item.question.difficulty ?? 5;
      
      if (difficulty > 7) {
        if (consecutiveHard < 3) {
          final.push(item);
          consecutiveHard++;
        }
      } else {
        final.push(item);
        consecutiveHard = 0;
      }

      if (final.length >= limit) break;
    }

    return final.map(s => s.question);
  } catch (error) {
    console.error('Error prioritizing questions:', error);
    // Fallback to random questions
    return db.select()
      .from(questions)
      .where(eq(questions.testType, testType))
      .orderBy(sql`RANDOM()`)
      .limit(limit);
  }
}

/**
 * 5. Difficulty Progression
 * 
 * Tracks user progression and adjusts target difficulty band.
 * 
 * Rules:
 * - After 3 consecutive successes at current level: advance +1
 * - After 2 consecutive failures: drop -1
 * - Updates lastDifficultyLevel in topic_performance
 */
export async function updateDifficultyProgression(
  userId: string,
  subtopic: string,
  isCorrect: boolean,
  questionDifficulty: number
): Promise<void> {
  try {
    const [existing] = await db.select()
      .from(topicPerformance)
      .where(and(
        eq(topicPerformance.userId, userId),
        eq(topicPerformance.topic, subtopic)
      ));

    if (!existing) {
      // Create initial entry
      await db.insert(topicPerformance).values({
        userId,
        topic: subtopic,
        totalAttempted: 1,
        totalCorrect: isCorrect ? 1 : 0,
        averageScore: isCorrect ? 100 : 0,
        lastDifficultyLevel: questionDifficulty,
      });
      return;
    }

    let targetLevel = existing.lastDifficultyLevel || 5;

    // Get recent history for this topic to check consecutive results
    // We'll use a simplified approach: track in memory for now
    // In production, you'd want to track this in a separate table
    
    // For now, use simple heuristic based on average score
    const newTotalAttempted = existing.totalAttempted + 1;
    const newTotalCorrect = existing.totalCorrect + (isCorrect ? 1 : 0);
    const recentAccuracy = newTotalCorrect / newTotalAttempted;

    // Adjust difficulty based on performance at current level
    if (questionDifficulty === targetLevel) {
      if (recentAccuracy > 0.8 && existing.totalAttempted >= 3) {
        // High success rate - advance
        targetLevel = Math.min(10, targetLevel + 1);
      } else if (recentAccuracy < 0.4 && existing.totalAttempted >= 2) {
        // Low success rate - drop back
        targetLevel = Math.max(1, targetLevel - 1);
      }
    }

    await db.update(topicPerformance)
      .set({
        lastDifficultyLevel: targetLevel,
        updatedAt: new Date(),
      })
      .where(eq(topicPerformance.id, existing.id));
  } catch (error) {
    console.error('Error updating difficulty progression:', error);
    throw error;
  }
}

/**
 * Helper: Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
