import fs from "fs";
import path from "path";
import { db } from "./db";
import { questions } from "@shared/schema";

interface RawQuestion {
  Question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  answer: string;
  topic: string;
}

function cleanOption(text: string): string {
  // Remove leading letters (A:, B:, C:, D:) and extra whitespace
  return text.replace(/^[A-D]:\s*/, "").trim();
}

function extractCorrectAnswer(answerText: string): number {
  // Extract the letter from answer (A:, B:, C:, or D:)
  const match = answerText.match(/^([A-D]):/);
  if (match) {
    const letter = match[1];
    return letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
  }
  // Default to 0 if we can't parse
  return 0;
}

function cleanQuestionText(text: string): string {
  // Remove extra whitespace and newlines
  return text.replace(/\s+/g, " ").trim();
}

async function importQuestionsFromFile(filePath: string, subject: string) {
  console.log(`Importing questions from ${filePath} (${subject})...`);
  
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const rawQuestions: RawQuestion[] = JSON.parse(fileContent);
  
  let imported = 0;
  let skipped = 0;

  for (const raw of rawQuestions) {
    try {
      // Skip questions with malformed data
      if (!raw.Question || !raw.A || !raw.B || !raw.C || !raw.D || !raw.answer) {
        skipped++;
        continue;
      }

      // Clean the question text
      const question = cleanQuestionText(raw.Question);
      
      // Clean options
      let optionA = cleanOption(raw.A);
      let optionB = cleanOption(raw.B);
      let optionC = cleanOption(raw.C);
      let optionD = cleanOption(raw.D);

      // Skip if options are too long (likely corrupted data)
      if (optionA.length > 500 || optionB.length > 500 || optionC.length > 500 || optionD.length > 500) {
        skipped++;
        continue;
      }

      // Skip if question is too short or too long
      if (question.length < 10 || question.length > 1000) {
        skipped++;
        continue;
      }

      const correctAnswer = extractCorrectAnswer(raw.answer);
      const topic = raw.topic || "General";

      await db.insert(questions).values({
        question,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        topic,
        subject,
        difficulty: 1, // Default difficulty
      });

      imported++;
      
      if (imported % 100 === 0) {
        console.log(`  Imported ${imported} questions...`);
      }
    } catch (error) {
      console.error(`Error importing question:`, error);
      skipped++;
    }
  }

  console.log(`Completed ${subject}: ${imported} imported, ${skipped} skipped\n`);
  return { imported, skipped };
}

async function importAllQuestions() {
  console.log("Starting question import process...\n");

  const files = [
    { path: "attached_assets/Marketing DECA_1762624175016.json", subject: "Marketing" },
    { path: "attached_assets/Entrepreneurship DECA_1762624175016.json", subject: "Entrepreneurship" },
    { path: "attached_assets/Finance DECA_1762624175016.json", subject: "Finance" },
    { path: "attached_assets/Hospitality and Tourism DECA_1762624175016.json", subject: "Hospitality and Tourism" },
    { path: "attached_assets/Business Management and Adminstration DECA_1762624175016.json", subject: "Business Management" },
    { path: "attached_assets/Business Administration Core DECA_1762624175016.json", subject: "Business Administration" },
  ];

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const { imported, skipped } = await importQuestionsFromFile(file.path, file.subject);
    totalImported += imported;
    totalSkipped += skipped;
  }

  console.log("=".repeat(50));
  console.log(`Import complete!`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log("=".repeat(50));

  process.exit(0);
}

// Run import
importAllQuestions().catch(error => {
  console.error("Fatal error during import:", error);
  process.exit(1);
});
