import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

export function loadQueenBeeEnv() {
  // 1. Charge le .env standard du dossier (dev local)
  dotenv.config();

  // 2. Charge le fallback global sur le VPS sans écraser les vars existantes
  // On remonte au dossier parent car ton .env.bridge est dans /home/fish/queen-bee/
  const globalEnvPath = path.resolve(process.cwd(), "../.env.bridge");

  if (fs.existsSync(globalEnvPath)) {
    console.log(`[QueenBee] Loading global config from: ${globalEnvPath}`);
    dotenv.config({ path: globalEnvPath, override: false });
  } else {
    console.warn(`[QueenBee] No global config found at ${globalEnvPath}`);
  }
}
