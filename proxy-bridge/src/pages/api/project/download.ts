import type { NextApiRequest, NextApiResponse } from "next";
import archiver from "archiver";
import fs from "fs";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const projectPath = req.query.path as string;

  if (!projectPath || !fs.existsSync(projectPath)) {
    return res.status(400).json({ error: "Invalid project path" });
  }

  const projectName = path.basename(projectPath);
  const zipName = `${projectName}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err) => {
    res.status(500).json({ error: err.message });
  });

  archive.pipe(res);

  // Add directory contents, excluding common junk
  archive.glob("**/*", {
    cwd: projectPath,
    ignore: [
      "node_modules/**",
      ".git/**",
      ".next/**",
      "dist/**",
      ".cache/**",
      "__pycache__/**",
        ".venv/**",
        "venv/**",
        ".vite/**",
        "build/**",
        ".turbo/**",
    ],
    dot: true,
  });

  await archive.finalize();
}

export const config = {
  api: {
    responseLimit: false,
  },
};
