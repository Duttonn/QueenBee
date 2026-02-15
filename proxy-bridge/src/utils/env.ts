import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

export function loadQueenBeeEnv() {
  // Chemin absolu sur le VPS pour lever toute ambiguïté
  const vpsPath = "/home/fish/queen-bee/.env.bridge";
  // Chemin relatif pour the dev local
  const localPath = path.resolve(process.cwd(), "../.env.bridge");
  // Packaged Electron app: .env.local next to the proxy-bridge bundle
  const bundlePath = path.resolve(process.cwd(), ".env.local");
  // User home config
  const homePath = path.join(process.env.HOME || process.env.USERPROFILE || "", ".queenbee", ".env.bridge");

  if (fs.existsSync(vpsPath)) {
    console.log(`[QueenBee] SUCCESS: Loading global config from VPS path: ${vpsPath}`);
    dotenv.config({ path: vpsPath, override: true });
  } else if (fs.existsSync(localPath)) {
    console.log(`[QueenBee] SUCCESS: Loading config from local path: ${localPath}`);
    dotenv.config({ path: localPath, override: true });
  } else if (fs.existsSync(bundlePath)) {
    console.log(`[QueenBee] SUCCESS: Loading config from bundle path: ${bundlePath}`);
    dotenv.config({ path: bundlePath, override: true });
  } else if (fs.existsSync(homePath)) {
    console.log(`[QueenBee] SUCCESS: Loading config from home path: ${homePath}`);
    dotenv.config({ path: homePath, override: true });
  } else {
    console.warn("[QueenBee] WARNING: No .env.bridge found. Checked:", vpsPath, localPath, bundlePath, homePath);
  }
}
