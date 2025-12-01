/**
 * Model Training Script
 * Trains all ML models on existing question data
 */

import { runFullModelTraining, trainIRTParameters, trainBKTParameters } from "./advancedML";

async function main() {
  try {
    console.log("=== TESS ML Model Training Script ===\n");

    // Train for DECA
    console.log("🚀 Training models for DECA...");
    await runFullModelTraining("DECA");
    console.log("✅ DECA training completed\n");

    // Train for FBLA
    console.log("🚀 Training models for FBLA...");
    await runFullModelTraining("FBLA");
    console.log("✅ FBLA training completed\n");

    console.log("🎉 All model training completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Training failed:", error);
    process.exit(1);
  }
}

main();
