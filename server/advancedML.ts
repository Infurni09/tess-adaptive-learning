import { db } from "./db";
import {
  questions, testResponses, practiceResponses, topicPerformance,
  bktKnowledgeState, irtParameters, userAbilityEstimate,
  learningCurve, knowledgeGraph, engagementMetrics, banditState,
  modelTrainingState, type Question
} from "@shared/schema";
import { eq, and, gte, sql, desc, asc, inArray, or } from "drizzle-orm";

/**
 * TESS Advanced ML Module
 * 
 * Implements sophisticated machine learning algorithms for personalized adaptive learning:
 * 
 * 1. Bayesian Knowledge Tracing (BKT) - Probabilistic knowledge state modeling
 * 2. Item Response Theory (IRT) - Psychometric question analysis (3PL model)
 * 3. Learning Curve Analysis - Power law learning trajectory modeling
 * 4. Knowledge Graph - Topic prerequisite dependency modeling
 * 5. Multi-Armed Bandit - Thompson Sampling for exploration/exploitation
 * 6. Engagement Prediction - Churn risk and engagement scoring
 * 7. Model Training & Calibration - EM algorithm for parameter estimation
 */

// ==================== BAYESIAN KNOWLEDGE TRACING (BKT) ====================

/**
 * Bayesian Knowledge Tracing - Models the probability a student knows a skill
 * 
 * Hidden Markov Model with 4 parameters:
 * - P(L0): Prior probability of knowing the skill initially
 * - P(T): Probability of learning the skill on each opportunity
 * - P(G): Probability of guessing correctly when not knowing
 * - P(S): Probability of slipping (making mistake) when knowing
 * 
 * Updates P(L) after each observation using Bayes' theorem
 */
export async function updateBKTKnowledgeState(
  userId: string,
  topic: string,
  subject: string,
  isCorrect: boolean
): Promise<{ pKnown: number; mastered: boolean }> {
  try {
    const [existing] = await db.select()
      .from(bktKnowledgeState)
      .where(and(
        eq(bktKnowledgeState.userId, userId),
        eq(bktKnowledgeState.topic, topic)
      ));

    let pKnown = existing?.pKnown ?? 0.3;
    const pLearn = existing?.pLearn ?? 0.2;
    const pGuess = existing?.pGuess ?? 0.25;
    const pSlip = existing?.pSlip ?? 0.1;

    // Bayes' theorem update
    // P(L|correct) = P(correct|L) * P(L) / P(correct)
    // P(correct|L) = 1 - P(S), P(correct|~L) = P(G)
    if (isCorrect) {
      const pCorrectGivenKnown = 1 - pSlip;
      const pCorrectGivenNotKnown = pGuess;
      const pCorrect = pCorrectGivenKnown * pKnown + pCorrectGivenNotKnown * (1 - pKnown);
      
      const pKnownGivenCorrect = (pCorrectGivenKnown * pKnown) / pCorrect;
      pKnown = pKnownGivenCorrect;
    } else {
      const pIncorrectGivenKnown = pSlip;
      const pIncorrectGivenNotKnown = 1 - pGuess;
      const pIncorrect = pIncorrectGivenKnown * pKnown + pIncorrectGivenNotKnown * (1 - pKnown);
      
      const pKnownGivenIncorrect = (pIncorrectGivenKnown * pKnown) / pIncorrect;
      pKnown = pKnownGivenIncorrect;
    }

    // Apply learning: P(L') = P(L) + (1-P(L)) * P(T)
    pKnown = pKnown + (1 - pKnown) * pLearn;
    pKnown = Math.max(0, Math.min(1, pKnown));

    const now = new Date();
    const totalObservations = (existing?.totalObservations ?? 0) + 1;

    if (existing) {
      await db.update(bktKnowledgeState)
        .set({ pKnown, totalObservations, lastUpdated: now })
        .where(eq(bktKnowledgeState.id, existing.id));
    } else {
      await db.insert(bktKnowledgeState).values({
        userId,
        topic,
        subject,
        pKnown,
        pLearn,
        pGuess,
        pSlip,
        totalObservations,
      });
    }

    // Mastery threshold: 95% probability of knowing
    const mastered = pKnown >= 0.95;
    return { pKnown, mastered };
  } catch (error) {
    console.error('[BKT] Error updating knowledge state:', error);
    return { pKnown: 0.5, mastered: false };
  }
}

/**
 * Get all topics where user has achieved mastery (P(L) >= 0.95)
 */
export async function getMasteredTopics(userId: string): Promise<string[]> {
  const mastered = await db.select()
    .from(bktKnowledgeState)
    .where(and(
      eq(bktKnowledgeState.userId, userId),
      gte(bktKnowledgeState.pKnown, 0.95)
    ));
  return mastered.map(m => m.topic);
}

// ==================== ITEM RESPONSE THEORY (IRT) ====================

/**
 * 3-Parameter Logistic (3PL) Item Response Theory Model
 * 
 * Models probability of correct response given:
 * - θ (theta): Student ability level (-3 to +3)
 * - a: Discrimination parameter (how well item differentiates)
 * - b: Difficulty parameter (ability level for 50% success)
 * - c: Guessing parameter (asymptotic lower bound)
 * 
 * P(correct|θ) = c + (1-c) * (1 / (1 + e^(-a(θ-b))))
 */
export function irt3PLProbability(
  theta: number,
  a: number,
  b: number,
  c: number
): number {
  const exponent = -a * (theta - b);
  const logistic = 1 / (1 + Math.exp(exponent));
  return c + (1 - c) * logistic;
}

/**
 * Fisher Information Function - How much info a question provides at ability level
 * Higher info = more precise measurement at that ability level
 */
export function irtInformation(
  theta: number,
  a: number,
  b: number,
  c: number
): number {
  const P = irt3PLProbability(theta, a, b, c);
  const Q = 1 - P;
  
  const numerator = Math.pow(a, 2) * Math.pow(P - c, 2);
  const denominator = Math.pow(1 - c, 2) * P * Q;
  
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Estimate user's ability (theta) using Maximum Likelihood Estimation
 * Uses Newton-Raphson iteration for optimization
 */
export async function estimateUserAbility(
  userId: string,
  subject: string
): Promise<{ ability: number; standardError: number }> {
  try {
    // Get user's responses for this subject
    const responses = await db.select({
      questionId: testResponses.questionId,
      isCorrect: testResponses.isCorrect,
    })
    .from(testResponses)
    .innerJoin(questions, eq(testResponses.questionId, questions.id))
    .where(eq(questions.subject, subject));

    if (responses.length < 5) {
      return { ability: 0, standardError: 1.5 };
    }

    // Get IRT parameters for answered questions
    const questionIds = responses.map(r => r.questionId);
    const irtParams = await db.select()
      .from(irtParameters)
      .where(inArray(irtParameters.questionId, questionIds));

    if (irtParams.length === 0) {
      return { ability: 0, standardError: 1.0 };
    }

    // Build response-parameter pairs
    const pairs = responses.map(r => {
      const params = irtParams.find(p => p.questionId === r.questionId);
      return {
        isCorrect: r.isCorrect,
        a: params?.discrimination ?? 1.0,
        b: params?.difficulty ?? 0.0,
        c: params?.guessing ?? 0.25,
      };
    }).filter(p => p !== null);

    // Newton-Raphson MLE for theta
    let theta = 0;
    const maxIterations = 20;
    const epsilon = 0.001;

    for (let i = 0; i < maxIterations; i++) {
      let firstDerivative = 0;
      let secondDerivative = 0;

      for (const { isCorrect, a, b, c } of pairs) {
        const P = irt3PLProbability(theta, a, b, c);
        const Q = 1 - P;
        const u = isCorrect ? 1 : 0;
        
        const PminusC = P - c;
        const oneMinusC = 1 - c;
        
        firstDerivative += a * (PminusC / oneMinusC) * ((u - P) / (P * Q));
        secondDerivative -= Math.pow(a, 2) * Math.pow(PminusC / oneMinusC, 2) * (1 / (P * Q));
      }

      if (Math.abs(secondDerivative) < epsilon) break;
      
      const delta = firstDerivative / secondDerivative;
      theta = theta - delta;
      theta = Math.max(-3, Math.min(3, theta)); // Bound theta

      if (Math.abs(delta) < epsilon) break;
    }

    // Standard error is inverse sqrt of information
    let totalInfo = 0;
    for (const { a, b, c } of pairs) {
      totalInfo += irtInformation(theta, a, b, c);
    }
    const standardError = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 1.0;

    // Store estimate
    const [existing] = await db.select()
      .from(userAbilityEstimate)
      .where(and(
        eq(userAbilityEstimate.userId, userId),
        eq(userAbilityEstimate.subject, subject)
      ));

    if (existing) {
      await db.update(userAbilityEstimate)
        .set({
          ability: theta,
          standardError,
          responsesUsed: pairs.length,
          lastEstimated: new Date(),
        })
        .where(eq(userAbilityEstimate.id, existing.id));
    } else {
      await db.insert(userAbilityEstimate).values({
        userId,
        subject,
        ability: theta,
        standardError,
        responsesUsed: pairs.length,
        lastEstimated: new Date(),
      });
    }

    return { ability: theta, standardError };
  } catch (error) {
    console.error('[IRT] Error estimating ability:', error);
    return { ability: 0, standardError: 1.0 };
  }
}

/**
 * Select optimal next question using Computerized Adaptive Testing (CAT)
 * Maximizes information at user's current ability level
 */
export async function selectOptimalQuestion(
  userId: string,
  subject: string,
  testType: string,
  excludeQuestionIds: string[] = []
): Promise<Question | null> {
  try {
    // Get user's current ability estimate
    const [abilityEst] = await db.select()
      .from(userAbilityEstimate)
      .where(and(
        eq(userAbilityEstimate.userId, userId),
        eq(userAbilityEstimate.subject, subject)
      ));
    
    const theta = abilityEst?.ability ?? 0;

    // Get available questions with IRT parameters
    const availableQuestions = await db.select({
      question: questions,
      irt: irtParameters,
    })
    .from(questions)
    .leftJoin(irtParameters, eq(questions.id, irtParameters.questionId))
    .where(and(
      eq(questions.subject, subject),
      eq(questions.testType, testType)
    ));

    // Filter excluded questions
    const candidates = availableQuestions.filter(
      q => !excludeQuestionIds.includes(q.question.id)
    );

    if (candidates.length === 0) return null;

    // Score each question by information at user's ability level
    const scored = candidates.map(({ question, irt }) => {
      const a = irt?.discrimination ?? 1.0;
      const b = irt?.difficulty ?? 0.0;
      const c = irt?.guessing ?? 0.25;
      
      const info = irtInformation(theta, a, b, c);
      
      return { question, info };
    });

    // Select question with maximum information
    scored.sort((a, b) => b.info - a.info);
    
    return scored[0].question;
  } catch (error) {
    console.error('[CAT] Error selecting optimal question:', error);
    return null;
  }
}

// ==================== LEARNING CURVE ANALYSIS ====================

/**
 * Power Law of Practice: Performance = A - B * N^(-alpha)
 * 
 * - A: Asymptotic maximum performance (usually ~0.95)
 * - B: Initial gap from asymptote  
 * - N: Number of practice trials
 * - alpha: Learning rate (higher = faster learning)
 * 
 * Tracks and predicts learning trajectory over time
 */
export async function updateLearningCurve(
  userId: string,
  topic: string,
  subject: string,
  accuracy: number,
  responseTimeMs?: number
): Promise<{ trialNumber: number; predictedAccuracy: number; learningRate: number }> {
  try {
    // Get existing curve data
    const existingTrials = await db.select()
      .from(learningCurve)
      .where(and(
        eq(learningCurve.userId, userId),
        eq(learningCurve.topic, topic)
      ))
      .orderBy(asc(learningCurve.trialNumber));

    const trialNumber = existingTrials.length + 1;

    // Fit power law if we have enough data
    let learningRate = 0.3; // Default alpha
    let asymptote = 0.95; // Default A
    let predictedAccuracy = accuracy;

    if (existingTrials.length >= 3) {
      // Simplified power law fitting using log-linear regression
      // log(A - y) = log(B) - alpha * log(N)
      const dataPoints = existingTrials.map((t, i) => ({
        logN: Math.log(i + 1),
        y: t.accuracy,
      }));

      // Estimate asymptote as max observed + small margin
      const maxObserved = Math.max(...existingTrials.map(t => t.accuracy), accuracy);
      asymptote = Math.min(0.99, maxObserved + 0.05);

      // Calculate gaps from asymptote
      const gaps = dataPoints.map(d => ({
        logN: d.logN,
        logGap: Math.log(Math.max(0.01, asymptote - d.y)),
      }));

      // Linear regression on log-log scale
      const n = gaps.length;
      const sumX = gaps.reduce((s, g) => s + g.logN, 0);
      const sumY = gaps.reduce((s, g) => s + g.logGap, 0);
      const sumXY = gaps.reduce((s, g) => s + g.logN * g.logGap, 0);
      const sumX2 = gaps.reduce((s, g) => s + g.logN * g.logN, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      learningRate = Math.max(0.1, Math.min(1.0, -slope)); // alpha = -slope

      // Predict accuracy for current trial
      const logB = (sumY + slope * sumX) / n;
      const B = Math.exp(logB);
      predictedAccuracy = asymptote - B * Math.pow(trialNumber, -learningRate);
      predictedAccuracy = Math.max(0, Math.min(1, predictedAccuracy));
    }

    // Store learning curve data point
    await db.insert(learningCurve).values({
      userId,
      topic,
      subject,
      trialNumber,
      accuracy,
      responseTimeMs,
      predictedAccuracy,
      learningRate,
      asymptote,
    });

    return { trialNumber, predictedAccuracy, learningRate };
  } catch (error) {
    console.error('[LearningCurve] Error updating:', error);
    return { trialNumber: 1, predictedAccuracy: accuracy, learningRate: 0.3 };
  }
}

/**
 * Predict future performance based on learning curve
 */
export async function predictFuturePerformance(
  userId: string,
  topic: string,
  futureTrials: number
): Promise<number[]> {
  try {
    const [latestCurve] = await db.select()
      .from(learningCurve)
      .where(and(
        eq(learningCurve.userId, userId),
        eq(learningCurve.topic, topic)
      ))
      .orderBy(desc(learningCurve.trialNumber))
      .limit(1);

    if (!latestCurve) return [];

    const currentTrial = latestCurve.trialNumber;
    const alpha = latestCurve.learningRate ?? 0.3;
    const A = latestCurve.asymptote ?? 0.95;
    
    // Estimate B from current data
    const B = (A - latestCurve.accuracy) * Math.pow(currentTrial, alpha);

    const predictions: number[] = [];
    for (let i = 1; i <= futureTrials; i++) {
      const n = currentTrial + i;
      const predicted = A - B * Math.pow(n, -alpha);
      predictions.push(Math.max(0, Math.min(1, predicted)));
    }

    return predictions;
  } catch (error) {
    console.error('[LearningCurve] Error predicting:', error);
    return [];
  }
}

// ==================== MULTI-ARMED BANDIT (Thompson Sampling) ====================

/**
 * Thompson Sampling for topic selection
 * 
 * Balances exploration (trying new topics) vs exploitation (focusing on weak topics)
 * Uses Beta distribution for each topic's expected reward
 * 
 * Alpha = successes + 1, Beta = failures + 1
 * Sample from Beta(alpha, beta) and select topic with highest sample
 */
export async function selectTopicThompsonSampling(
  userId: string,
  availableTopics: string[]
): Promise<string> {
  try {
    // Get bandit state for all topics
    const states = await db.select()
      .from(banditState)
      .where(and(
        eq(banditState.userId, userId),
        inArray(banditState.topic, availableTopics)
      ));

    // Initialize missing topics
    const existingTopics = new Set(states.map(s => s.topic));
    const missingTopics = availableTopics.filter(t => !existingTopics.has(t));
    
    // Sample from Beta distribution for each topic
    const samples: { topic: string; sample: number }[] = [];

    for (const topic of availableTopics) {
      const state = states.find(s => s.topic === topic);
      const alpha = state?.thompsonAlpha ?? 1;
      const beta = state?.thompsonBeta ?? 1;
      
      // Sample from Beta(alpha, beta) using the inverse transform
      const sample = betaSample(alpha, beta);
      samples.push({ topic, sample });
    }

    // Select topic with highest sample (Thompson Sampling)
    samples.sort((a, b) => b.sample - a.sample);
    const selectedTopic = samples[0].topic;

    return selectedTopic;
  } catch (error) {
    console.error('[Bandit] Error in Thompson Sampling:', error);
    return availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }
}

/**
 * Update bandit state after observing reward
 */
export async function updateBanditState(
  userId: string,
  topic: string,
  reward: number // 1 for correct, 0 for incorrect
): Promise<void> {
  try {
    const [existing] = await db.select()
      .from(banditState)
      .where(and(
        eq(banditState.userId, userId),
        eq(banditState.topic, topic)
      ));

    const now = new Date();

    if (existing) {
      const newPulls = existing.pulls + 1;
      const newRewards = existing.rewards + reward;
      
      // Thompson Sampling: Beta distribution parameters
      const newAlpha = existing.thompsonAlpha + reward;
      const newBeta = existing.thompsonBeta + (1 - reward);
      
      // UCB1 value for comparison: mean + sqrt(2*ln(n)/n_i)
      const mean = newRewards / newPulls;
      const totalPulls = newPulls; // Simplified - would need global count
      const ucbValue = mean + Math.sqrt(2 * Math.log(totalPulls) / newPulls);

      await db.update(banditState)
        .set({
          pulls: newPulls,
          rewards: newRewards,
          thompsonAlpha: newAlpha,
          thompsonBeta: newBeta,
          ucbValue,
          lastPulled: now,
        })
        .where(eq(banditState.id, existing.id));
    } else {
      await db.insert(banditState).values({
        userId,
        topic,
        pulls: 1,
        rewards: reward,
        thompsonAlpha: 1 + reward,
        thompsonBeta: 1 + (1 - reward),
        ucbValue: reward,
        lastPulled: now,
      });
    }
  } catch (error) {
    console.error('[Bandit] Error updating state:', error);
  }
}

/**
 * Beta distribution sampling using Jöhnk's algorithm
 */
function betaSample(alpha: number, beta: number): number {
  const gamma1 = gammaSample(alpha);
  const gamma2 = gammaSample(beta);
  return gamma1 / (gamma1 + gamma2);
}

/**
 * Gamma distribution sampling using Marsaglia and Tsang's method
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  
  const d = shape - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x, v;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Standard normal sample using Box-Muller transform
 */
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ==================== ENGAGEMENT PREDICTION ====================

/**
 * Update engagement metrics and predict churn risk
 * 
 * Features used for churn prediction:
 * - Session frequency (days between sessions)
 * - Performance trend (improving/declining)
 * - Time spent per session
 * - Streak consistency
 */
export async function updateEngagementMetrics(
  userId: string,
  questionsAttempted: number,
  questionsCorrect: number,
  totalTimeSpentMs: number,
  sessionDurationMs?: number
): Promise<{ engagementScore: number; churnRisk: number }> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get previous session to calculate streak
    const [previousSession] = await db.select()
      .from(engagementMetrics)
      .where(eq(engagementMetrics.userId, userId))
      .orderBy(desc(engagementMetrics.sessionDate))
      .limit(1);

    let streakDays = 1;
    if (previousSession) {
      const prevDate = new Date(previousSession.sessionDate);
      const daysDiff = Math.floor((today.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        streakDays = previousSession.streakDays + 1;
      } else if (daysDiff === 0) {
        streakDays = previousSession.streakDays;
      } else {
        streakDays = 1; // Streak broken
      }
    }

    // Calculate engagement score (0-100)
    const accuracyScore = (questionsCorrect / Math.max(1, questionsAttempted)) * 30;
    const activityScore = Math.min(30, questionsAttempted * 2);
    const streakScore = Math.min(20, streakDays * 2);
    const timeScore = Math.min(20, (totalTimeSpentMs / 60000) * 2); // Minutes spent
    
    const engagementScore = Math.round(accuracyScore + activityScore + streakScore + timeScore);

    // Calculate churn risk using logistic regression-style features
    // Higher risk if: low streak, declining performance, long gaps, short sessions
    let churnRisk = 0.5; // Base risk

    // Streak factor
    if (streakDays >= 7) churnRisk -= 0.2;
    else if (streakDays <= 2) churnRisk += 0.15;

    // Session length factor
    const avgSessionMinutes = (sessionDurationMs ?? totalTimeSpentMs) / 60000;
    if (avgSessionMinutes > 15) churnRisk -= 0.1;
    else if (avgSessionMinutes < 3) churnRisk += 0.2;

    // Performance factor
    const accuracy = questionsCorrect / Math.max(1, questionsAttempted);
    if (accuracy >= 0.7) churnRisk -= 0.1;
    else if (accuracy < 0.4) churnRisk += 0.15;

    // Gap since last session
    if (previousSession) {
      const prevDate = new Date(previousSession.sessionDate);
      const daysSinceLastSession = Math.floor(
        (today.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastSession > 7) churnRisk += 0.25;
      else if (daysSinceLastSession > 3) churnRisk += 0.1;
    }

    churnRisk = Math.max(0, Math.min(1, churnRisk));

    // Store engagement metrics
    const avgResponseTimeMs = Math.round(totalTimeSpentMs / Math.max(1, questionsAttempted));

    await db.insert(engagementMetrics).values({
      userId,
      sessionDate: now,
      questionsAttempted,
      questionsCorrect,
      totalTimeSpentMs,
      avgResponseTimeMs,
      sessionDurationMs,
      streakDays,
      engagementScore,
      churnRisk,
    });

    return { engagementScore, churnRisk };
  } catch (error) {
    console.error('[Engagement] Error updating metrics:', error);
    return { engagementScore: 50, churnRisk: 0.5 };
  }
}

/**
 * Get users at high churn risk for intervention
 */
export async function getHighChurnRiskUsers(threshold: number = 0.7): Promise<string[]> {
  try {
    const atRisk = await db.select({ userId: engagementMetrics.userId })
      .from(engagementMetrics)
      .where(gte(engagementMetrics.churnRisk, threshold))
      .groupBy(engagementMetrics.userId);
    
    return atRisk.map(u => u.userId);
  } catch (error) {
    console.error('[Engagement] Error getting high risk users:', error);
    return [];
  }
}

// ==================== KNOWLEDGE GRAPH ====================

/**
 * Get recommended prerequisites for a topic based on knowledge graph
 */
export async function getPrerequisites(topic: string, testType: string): Promise<string[]> {
  try {
    const prereqs = await db.select()
      .from(knowledgeGraph)
      .where(and(
        eq(knowledgeGraph.dependentTopic, topic),
        eq(knowledgeGraph.testType, testType)
      ))
      .orderBy(desc(knowledgeGraph.strength));
    
    return prereqs.map(p => p.prerequisiteTopic);
  } catch (error) {
    console.error('[KG] Error getting prerequisites:', error);
    return [];
  }
}

/**
 * Check if user has mastered prerequisites for a topic
 */
export async function checkPrerequisitesMastery(
  userId: string,
  topic: string,
  testType: string
): Promise<{ ready: boolean; missingPrereqs: string[] }> {
  try {
    const prerequisites = await getPrerequisites(topic, testType);
    
    if (prerequisites.length === 0) {
      return { ready: true, missingPrereqs: [] };
    }

    // Check BKT mastery for each prerequisite
    const bktStates = await db.select()
      .from(bktKnowledgeState)
      .where(and(
        eq(bktKnowledgeState.userId, userId),
        inArray(bktKnowledgeState.topic, prerequisites)
      ));

    const masteredTopics = new Set(
      bktStates.filter(s => s.pKnown >= 0.8).map(s => s.topic)
    );

    const missingPrereqs = prerequisites.filter(p => !masteredTopics.has(p));
    
    return {
      ready: missingPrereqs.length === 0,
      missingPrereqs,
    };
  } catch (error) {
    console.error('[KG] Error checking prerequisites:', error);
    return { ready: true, missingPrereqs: [] };
  }
}

/**
 * Learn knowledge graph edges from performance data
 * If students who master topic A tend to also master topic B, add edge A->B
 */
export async function learnKnowledgeGraphEdge(
  prerequisiteTopic: string,
  dependentTopic: string,
  testType: string,
  observed: boolean // Did student succeed on dependent after mastering prerequisite?
): Promise<void> {
  try {
    const [existing] = await db.select()
      .from(knowledgeGraph)
      .where(and(
        eq(knowledgeGraph.prerequisiteTopic, prerequisiteTopic),
        eq(knowledgeGraph.dependentTopic, dependentTopic),
        eq(knowledgeGraph.testType, testType)
      ));

    if (existing) {
      const newSupport = existing.empiricalSupport + 1;
      // Update strength using running average
      const newStrength = (existing.strength * existing.empiricalSupport + (observed ? 1 : 0)) / newSupport;
      
      await db.update(knowledgeGraph)
        .set({
          strength: newStrength,
          empiricalSupport: newSupport,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeGraph.id, existing.id));
    } else if (observed) {
      // Only create edge if we observe positive correlation
      await db.insert(knowledgeGraph).values({
        prerequisiteTopic,
        dependentTopic,
        testType,
        strength: 0.5,
        empiricalSupport: 1,
      });
    }
  } catch (error) {
    console.error('[KG] Error learning edge:', error);
  }
}

// ==================== MODEL TRAINING & CALIBRATION ====================

/**
 * Train IRT parameters using Expectation-Maximization
 * Calibrates question difficulty, discrimination, and guessing parameters
 */
export async function trainIRTParameters(testType: string, subject?: string): Promise<void> {
  try {
    console.log(`[IRT Training] Starting for ${testType}${subject ? '/' + subject : ''}`);

    // Get all responses with their questions
    const whereConditions = [eq(questions.testType, testType)];
    if (subject) whereConditions.push(eq(questions.subject, subject));

    const allResponses = await db.select({
      questionId: testResponses.questionId,
      isCorrect: testResponses.isCorrect,
    })
    .from(testResponses)
    .innerJoin(questions, eq(testResponses.questionId, questions.id))
    .where(and(...whereConditions));

    // Group by question
    const questionStats = new Map<string, { correct: number; total: number }>();
    for (const r of allResponses) {
      const stats = questionStats.get(r.questionId) ?? { correct: 0, total: 0 };
      stats.total++;
      if (r.isCorrect) stats.correct++;
      questionStats.set(r.questionId, stats);
    }

    // Calculate and store IRT parameters
    for (const [questionId, stats] of questionStats) {
      if (stats.total < 5) continue; // Need minimum responses

      const accuracy = stats.correct / stats.total;
      
      // Simplified 3PL estimation
      // b (difficulty): transform accuracy to logit scale
      const difficulty = -Math.log(accuracy / (1 - accuracy + 0.01));
      const boundedDifficulty = Math.max(-3, Math.min(3, difficulty));

      // a (discrimination): estimate from variance
      const pq = accuracy * (1 - accuracy);
      const discrimination = Math.max(0.5, Math.min(2.5, 1.7 / (Math.sqrt(pq) + 0.1)));

      // c (guessing): for 4-option MCQ, minimum is ~0.25
      const guessing = 0.25;

      // Information peak: where question is most informative
      const informationPeak = boundedDifficulty;

      // Upsert IRT parameters
      const [existing] = await db.select()
        .from(irtParameters)
        .where(eq(irtParameters.questionId, questionId));

      if (existing) {
        await db.update(irtParameters)
          .set({
            discrimination,
            difficulty: boundedDifficulty,
            guessing,
            informationPeak,
            calibrationCount: stats.total,
            lastCalibrated: new Date(),
          })
          .where(eq(irtParameters.id, existing.id));
      } else {
        await db.insert(irtParameters).values({
          questionId,
          discrimination,
          difficulty: boundedDifficulty,
          guessing,
          informationPeak,
          calibrationCount: stats.total,
          lastCalibrated: new Date(),
        });
      }
    }

    // Update training state
    const [trainingState] = await db.select()
      .from(modelTrainingState)
      .where(and(
        eq(modelTrainingState.modelType, 'IRT'),
        eq(modelTrainingState.testType, testType),
        subject ? eq(modelTrainingState.subject, subject) : sql`${modelTrainingState.subject} IS NULL`
      ));

    if (trainingState) {
      await db.update(modelTrainingState)
        .set({
          lastTrainingRun: new Date(),
          samplesUsed: allResponses.length,
          status: 'trained',
          modelVersion: trainingState.modelVersion + 1,
          updatedAt: new Date(),
        })
        .where(eq(modelTrainingState.id, trainingState.id));
    } else {
      await db.insert(modelTrainingState).values({
        modelType: 'IRT',
        testType,
        subject,
        lastTrainingRun: new Date(),
        samplesUsed: allResponses.length,
        status: 'trained',
        modelVersion: 1,
      });
    }

    console.log(`[IRT Training] Completed. Calibrated ${questionStats.size} questions from ${allResponses.length} responses`);
  } catch (error) {
    console.error('[IRT Training] Error:', error);
  }
}

/**
 * Train BKT parameters using Expectation-Maximization
 * Estimates P(L0), P(T), P(G), P(S) from response sequences
 */
export async function trainBKTParameters(testType: string): Promise<void> {
  try {
    console.log(`[BKT Training] Starting for ${testType}`);

    // Get response sequences per user per topic
    const responses = await db.select({
      userId: testResponses.testId,
      topic: questions.subtopic,
      isCorrect: testResponses.isCorrect,
      createdAt: testResponses.createdAt,
    })
    .from(testResponses)
    .innerJoin(questions, eq(testResponses.questionId, questions.id))
    .where(eq(questions.testType, testType))
    .orderBy(testResponses.createdAt);

    // Group by user-topic
    const sequences = new Map<string, boolean[]>();
    for (const r of responses) {
      if (!r.topic) continue;
      const key = `${r.userId}:${r.topic}`;
      const seq = sequences.get(key) ?? [];
      seq.push(r.isCorrect);
      sequences.set(key, seq);
    }

    // EM algorithm for BKT parameter estimation (simplified)
    // Initial parameters
    let pL0 = 0.3;
    let pT = 0.2;
    let pG = 0.25;
    let pS = 0.1;

    const maxIterations = 20;
    const epsilon = 0.001;

    for (let iter = 0; iter < maxIterations; iter++) {
      let sumL0 = 0, sumT = 0, sumG = 0, sumS = 0;
      let countL0 = 0, countT = 0, countGS = 0;

      for (const seq of sequences.values()) {
        if (seq.length < 2) continue;

        let pL = pL0;

        for (let i = 0; i < seq.length; i++) {
          const correct = seq[i];

          // E-step: estimate hidden state probabilities
          const pCorrectGivenL = 1 - pS;
          const pCorrectGivenNotL = pG;
          const pCorrect = pCorrectGivenL * pL + pCorrectGivenNotL * (1 - pL);

          let pLGivenObs: number;
          if (correct) {
            pLGivenObs = (pCorrectGivenL * pL) / pCorrect;
          } else {
            const pIncorrect = 1 - pCorrect;
            pLGivenObs = (pS * pL) / pIncorrect;
          }

          // M-step accumulators
          if (i === 0) {
            sumL0 += pLGivenObs;
            countL0++;
          } else {
            // Transition probability
            const prevPL = seq[i-1] ? pL : (1 - pL);
            sumT += (1 - pL) * pT; // Contribution to learning
            countT++;
          }

          if (correct) {
            sumG += (1 - pLGivenObs);
            sumS += 0; // Didn't slip
          } else {
            sumG += 0; // Didn't guess
            sumS += pLGivenObs;
          }
          countGS++;

          // Update knowledge state
          pL = pLGivenObs + (1 - pLGivenObs) * pT;
        }
      }

      // M-step: update parameters
      const newPL0 = countL0 > 0 ? sumL0 / countL0 : pL0;
      const newPT = countT > 0 ? sumT / countT : pT;
      const newPG = countGS > 0 ? sumG / countGS : pG;
      const newPS = countGS > 0 ? sumS / countGS : pS;

      // Check convergence
      if (
        Math.abs(newPL0 - pL0) < epsilon &&
        Math.abs(newPT - pT) < epsilon &&
        Math.abs(newPG - pG) < epsilon &&
        Math.abs(newPS - pS) < epsilon
      ) {
        break;
      }

      pL0 = Math.max(0.01, Math.min(0.99, newPL0));
      pT = Math.max(0.01, Math.min(0.99, newPT));
      pG = Math.max(0.01, Math.min(0.5, newPG));
      pS = Math.max(0.01, Math.min(0.5, newPS));
    }

    console.log(`[BKT Training] Estimated parameters: P(L0)=${pL0.toFixed(3)}, P(T)=${pT.toFixed(3)}, P(G)=${pG.toFixed(3)}, P(S)=${pS.toFixed(3)}`);

    // Update training state
    const hyperparameters = JSON.stringify({ pL0, pT, pG, pS });

    const [trainingState] = await db.select()
      .from(modelTrainingState)
      .where(and(
        eq(modelTrainingState.modelType, 'BKT'),
        eq(modelTrainingState.testType, testType)
      ));

    if (trainingState) {
      await db.update(modelTrainingState)
        .set({
          lastTrainingRun: new Date(),
          samplesUsed: sequences.size,
          hyperparameters,
          status: 'trained',
          modelVersion: trainingState.modelVersion + 1,
          updatedAt: new Date(),
        })
        .where(eq(modelTrainingState.id, trainingState.id));
    } else {
      await db.insert(modelTrainingState).values({
        modelType: 'BKT',
        testType,
        lastTrainingRun: new Date(),
        samplesUsed: sequences.size,
        hyperparameters,
        status: 'trained',
        modelVersion: 1,
      });
    }

    console.log(`[BKT Training] Completed for ${testType}`);
  } catch (error) {
    console.error('[BKT Training] Error:', error);
  }
}

/**
 * Run all model training/calibration
 */
export async function runFullModelTraining(testType: string = 'DECA'): Promise<void> {
  console.log(`[Model Training] Starting full training for ${testType}`);
  
  await trainIRTParameters(testType);
  await trainBKTParameters(testType);
  
  console.log(`[Model Training] Completed for ${testType}`);
}

// ==================== ENHANCED QUESTION SELECTION ====================

/**
 * Advanced question selection combining all ML models
 * 
 * Strategy:
 * 1. Check prerequisite mastery (Knowledge Graph)
 * 2. Use Thompson Sampling for topic selection (Bandit)
 * 3. Select optimal question using IRT (CAT)
 * 4. Update BKT and learning curves after response
 */
export async function selectAdvancedQuestion(
  userId: string,
  testType: string,
  subject: string,
  excludeQuestionIds: string[] = []
): Promise<{
  question: Question | null;
  selectedTopic: string | null;
  reason: string;
}> {
  try {
    // Get available topics for this subject
    const availableTopics = await db.selectDistinct({ topic: questions.subtopic })
      .from(questions)
      .where(and(
        eq(questions.testType, testType),
        eq(questions.subject, subject)
      ));

    const topics = availableTopics.map(t => t.topic).filter(Boolean) as string[];
    
    if (topics.length === 0) {
      return { question: null, selectedTopic: null, reason: 'No topics available' };
    }

    // Step 1: Filter topics by prerequisite mastery
    const readyTopics: string[] = [];
    for (const topic of topics) {
      const { ready } = await checkPrerequisitesMastery(userId, topic, testType);
      if (ready) readyTopics.push(topic);
    }

    const candidateTopics = readyTopics.length > 0 ? readyTopics : topics;

    // Step 2: Use Thompson Sampling to select topic
    const selectedTopic = await selectTopicThompsonSampling(userId, candidateTopics);

    // Step 3: Select optimal question using IRT/CAT
    const question = await selectOptimalQuestion(userId, subject, testType, excludeQuestionIds);

    if (!question) {
      return { question: null, selectedTopic, reason: 'No questions available for topic' };
    }

    return {
      question,
      selectedTopic,
      reason: 'Selected using Thompson Sampling + IRT CAT',
    };
  } catch (error) {
    console.error('[AdvancedML] Error selecting question:', error);
    return { question: null, selectedTopic: null, reason: 'Error in selection' };
  }
}

/**
 * Process response with all ML model updates
 */
export async function processResponseAdvanced(
  userId: string,
  questionId: string,
  topic: string,
  subject: string,
  isCorrect: boolean,
  responseTimeMs: number
): Promise<void> {
  try {
    // Update all ML models in parallel
    await Promise.all([
      // BKT knowledge state
      updateBKTKnowledgeState(userId, topic, subject, isCorrect),
      
      // Learning curve
      updateLearningCurve(userId, topic, subject, isCorrect ? 1 : 0, responseTimeMs),
      
      // Bandit state
      updateBanditState(userId, topic, isCorrect ? 1 : 0),
    ]);

    // Update ability estimate (less frequently - async)
    estimateUserAbility(userId, subject).catch(e => 
      console.error('[AdvancedML] Error updating ability:', e)
    );

  } catch (error) {
    console.error('[AdvancedML] Error processing response:', error);
  }
}
