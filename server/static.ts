import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM (tsx dev) has no __dirname; derive it from import.meta.url. The CJS
// production bundle polyfills import.meta.url from __filename (see script/build.ts).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (skip /api and /f routes)
  app.use("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/f/")) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
