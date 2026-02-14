import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

export function loadQueenBeeEnv() {
  // Chemin absolu sur le VPS pour lever toute ambiguïté
  const vpsPath = "/home/fish/queen-bee/.env.bridge";
  // Chemin relatif pour le dev local
  const localPath = path.resolve(process.cwd(), "../.env.bridge");

  if (fs.existsSync(vpsPath)) {
    console.log(`[QueenBee] SUCCESS: Loading global config from VPS path: ${vpsPath}`);
    dotenv.config({ path: vpsPath, override: true });
  } else if (fs.existsSync(localPath)) {
    console.log(`[QueenBee] SUCCESS: Loading config from local path: ${localPath}`);
    dotenv.config({ path: localPath, override: true });
  } else {
    console.error("[QueenBee] ERROR: No .env.bridge found! CORS will fallback to '*'.");
  }
}
