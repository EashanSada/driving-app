import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Initialize Gemini AI Client lazily/safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey
    });
  };

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
    console.log(`DriveSafe Youth Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
