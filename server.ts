import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { applySecurityHeaders, isMaliciousUserAgent } from "./api/_security";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security: Remove Express fingerprinting header
  app.disable('x-powered-by');

  // Security: Restrict payload body to prevent RAM exhaustion attacks
  app.use(express.json({ limit: "500kb" }));

  // Global Security Firewall Middleware
  app.use((req, res, next) => {
    // 1. Apply Defense-in-Depth HTTP Security Headers
    applySecurityHeaders(res);

    // 2. Block Known Malicious Scanners & Exploit Probes
    if (isMaliciousUserAgent(req)) {
      return res.status(403).json({
        status: "error",
        message: "Access Forbidden: Suspicious client signature detected."
      });
    }

    // 3. Block directory traversal and sensitive config access attempts
    const url = req.url.toLowerCase();
    if (
      url.includes('/.env') ||
      url.includes('/.git') ||
      url.includes('/wp-admin') ||
      url.includes('/.aws') ||
      url.includes('..')
    ) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden access path."
      });
    }

    next();
  });

  // 1. Python-Equivalent Serverless ML Risk Analyzer Endpoint
  app.all("/api/analyze-risk", async (req, res) => {
    try {
      const handler = (await import("./api/analyze-risk")).default;
      return handler(req, res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // 2. Gemini-Powered AI Driver Safety Coach
  app.all("/api/ai-coach", async (req, res) => {
    try {
      const handler = (await import("./api/ai-coach")).default;
      return handler(req, res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // 3. Accounts Cloud Persistence Endpoint
  app.all("/api/accounts", async (req, res) => {
    try {
      const accountsHandler = (await import("./api/accounts")).default;
      return accountsHandler(req, res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // 4. Hazards Live Cross-Device Endpoint
  app.all("/api/hazards", async (req, res) => {
    try {
      const hazardsHandler = (await import("./api/hazards")).default;
      return hazardsHandler(req, res);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // 5. Download Clean Project ZIP
  app.get("/api/download-zip", (req, res) => {
    const zipPath = path.join(process.cwd(), "public", "radiandrive-project.zip");
    res.download(zipPath, "radiandrive-project.zip", (err) => {
      if (err) {
        res.status(500).send("Error downloading project archive");
      }
    });
  });

  // Serve Vite in Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DriveSafe Youth Platform running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer();
