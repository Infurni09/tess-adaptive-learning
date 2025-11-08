import { db } from "./db";
import { questions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// CRITICAL: Subtopic keywords must be event-specific AND subject-specific
// These patterns help identify subtopics within topics for each DECA/FBLA event

const subtopicPatterns = {
  // Common patterns across all subjects - will be combined with subject/topic context
  financial: {
    analysis: ["ratio", "analysis", "analyze", "interpret", "evaluate"],
    statements: ["balance sheet", "income statement", "cash flow", "financial statement"],
    planning: ["budget", "forecast", "plan", "project"],
    markets: ["stock", "bond", "equity", "debt", "market", "investor"],
    credit: ["credit", "loan", "lending", "borrow", "debt"],
    risk: ["risk", "insurance", "hedge", "protect"],
    time: ["time value", "present value", "future value", "discount", "compound"],
    corporate: ["corporate", "governance", "shareholder", "board", "ethics"],
  },
  marketing: {
    research: ["research", "survey", "data", "analysis", "consumer insight"],
    strategy: ["strategy", "plan", "objective", "goal", "positioning"],
    product: ["product", "brand", "feature", "quality", "development"],
    pricing: ["price", "pricing", "cost", "value", "discount"],
    promotion: ["promotion", "advertising", "publicity", "sales promotion"],
    distribution: ["distribution", "channel", "logistics", "supply chain"],
    digital: ["digital", "social media", "online", "e-commerce", "web"],
    customer: ["customer", "consumer", "buyer", "satisfaction", "loyalty"],
  },
  business: {
    management: ["management", "manager", "supervise", "delegate", "organize"],
    leadership: ["leadership", "leader", "motivate", "inspire", "team"],
    hr: ["human resource", "employee", "recruit", "hire", "training"],
    operations: ["operations", "process", "efficiency", "quality", "production"],
    law: ["law", "legal", "regulation", "compliance", "contract"],
    ethics: ["ethics", "ethical", "responsibility", "integrity"],
    communication: ["communication", "presentation", "speaking", "writing"],
    technology: ["technology", "software", "system", "data", "information"],
  },
  entrepreneurship: {
    opportunity: ["opportunity", "idea", "innovation", "discover", "identify"],
    planning: ["business plan", "planning", "feasibility", "model"],
    funding: ["funding", "capital", "investment", "venture", "financing"],
    growth: ["growth", "scale", "expansion", "development"],
    startup: ["startup", "launch", "establish", "founding"],
  },
};

function generateSubtopic(
  question: string,
  topic: string,
  subject: string,
  testType: string
): string | null {
  const lowerQuestion = question.toLowerCase();
  const lowerTopic = topic.toLowerCase();
  
  // Combine question and topic for better context
  const context = `${lowerQuestion} ${lowerTopic}`;
  
  // Track matched patterns
  const matches: { category: string; score: number }[] = [];
  
  // Check financial patterns
  for (const [category, keywords] of Object.entries(subtopicPatterns.financial)) {
    const score = keywords.filter(kw => context.includes(kw)).length;
    if (score > 0) {
      matches.push({ category: `Financial ${category.charAt(0).toUpperCase() + category.slice(1)}`, score });
    }
  }
  
  // Check marketing patterns
  for (const [category, keywords] of Object.entries(subtopicPatterns.marketing)) {
    const score = keywords.filter(kw => context.includes(kw)).length;
    if (score > 0) {
      matches.push({ category: `Marketing ${category.charAt(0).toUpperCase() + category.slice(1)}`, score });
    }
  }
  
  // Check business patterns
  for (const [category, keywords] of Object.entries(subtopicPatterns.business)) {
    const score = keywords.filter(kw => context.includes(kw)).length;
    if (score > 0) {
      matches.push({ category: `Business ${category.charAt(0).toUpperCase() + category.slice(1)}`, score });
    }
  }
  
  // Check entrepreneurship patterns
  for (const [category, keywords] of Object.entries(subtopicPatterns.entrepreneurship)) {
    const score = keywords.filter(kw => context.includes(kw)).length;
    if (score > 0) {
      matches.push({ category: `Entrepreneurship ${category.charAt(0).toUpperCase() + category.slice(1)}`, score });
    }
  }
  
  // Sort by score and get best match
  matches.sort((a, b) => b.score - a.score);
  
  if (matches.length > 0 && matches[0].score > 0) {
    // CRITICAL: Prepend subject and testType to ensure NO MIXING between events
    return `${testType}-${subject}-${matches[0].category}`;
  }
  
  // Default: use topic as subtopic with event/subject prefix
  return `${testType}-${subject}-${topic}`;
}

async function generateSubtopicsForAllQuestions() {
  console.log("CRITICAL: Generating event-specific and subject-specific subtopics");
  console.log("Subtopics will NEVER mix between DECA/FBLA or between the 6 subject areas\n");
  
  // Get all questions grouped by subject and testType
  const allQuestions = await db.select().from(questions);
  
  console.log(`Found ${allQuestions.length} questions to process\n`);
  
  let updated = 0;
  let byEvent: Record<string, Record<string, number>> = {};
  const batchSize = 100;
  const updates: Array<{ id: string; subtopic: string }> = [];
  
  for (const q of allQuestions) {
    const subtopic = generateSubtopic(q.question, q.topic, q.subject, q.testType);
    
    if (subtopic) {
      updates.push({ id: q.id, subtopic });
      
      // Track statistics by event and subject
      if (!byEvent[q.testType]) byEvent[q.testType] = {};
      if (!byEvent[q.testType][q.subject]) byEvent[q.testType][q.subject] = 0;
      byEvent[q.testType][q.subject]++;
      
      // Batch update every 100 questions
      if (updates.length >= batchSize) {
        await Promise.all(
          updates.map(({ id, subtopic }) =>
            db.update(questions).set({ subtopic }).where(eq(questions.id, id))
          )
        );
        updated += updates.length;
        console.log(`  Processed ${updated} questions...`);
        updates.length = 0;
      }
    }
  }
  
  // Process remaining updates
  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, subtopic }) =>
        db.update(questions).set({ subtopic }).where(eq(questions.id, id))
      )
    );
    updated += updates.length;
    console.log(`  Processed ${updated} questions...`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("Subtopic Generation Complete!");
  console.log(`Total questions updated: ${updated}`);
  console.log("\nBreakdown by Event and Subject (NEVER MIX):");
  
  for (const [event, subjects] of Object.entries(byEvent)) {
    console.log(`\n${event} Event:`);
    for (const [subject, count] of Object.entries(subjects)) {
      console.log(`  - ${subject}: ${count} questions`);
    }
  }
  
  // Show some sample subtopics
  const samples = await db.select()
    .from(questions)
    .limit(10);
  
  console.log("\n" + "=".repeat(60));
  console.log("Sample Subtopics (Event-Specific & Subject-Specific):");
  for (const sample of samples) {
    console.log(`  ${sample.subtopic}`);
  }
  console.log("=".repeat(60));
  
  process.exit(0);
}

// Run the generation
generateSubtopicsForAllQuestions().catch(error => {
  console.error("Fatal error during subtopic generation:", error);
  process.exit(1);
});
