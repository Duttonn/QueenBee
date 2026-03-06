import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

export function loadQueenBeeEnv() {
  // Use app data directory or home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const configLocations = [
    path.join(process.cwd(), ".env.bridge"),
    path.join(process.cwd(), ".env.local"),
    path.join(homeDir, ".queenbee", ".env.bridge"),
    path.join(homeDir, ".env.bridge"),
  ];

  for (const loc of configLocations) {
    if (fs.existsSync(loc)) {
      console.log(`[QueenBee] SUCCESS: Loading config from: ${loc}`);
      dotenv.config({ path: loc, override: true });
      return;
    }
  }

  console.warn("[QueenBee] WARNING: No .env.bridge found. Checked:", configLocations.join(', '));
}
