import express from "express/index.js";
import { getOpenRouterConfig, updateOpenRouterConfig } from "../config.js";

const router = express.Router();

// Get current OpenRouter configuration
router.get("/openrouter", (req, res) => {
  try {
    const config = getOpenRouterConfig();
    // Don't send the actual API key to the client for security
    res.json({
      defaultModel: config.defaultModel,
      hasApiKey: !!config.apiKey
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Update OpenRouter configuration
router.post("/openrouter", express.json(), (req, res) => {
  try {
    const { apiKey, defaultModel } = req.body;
    
    if (apiKey !== undefined && typeof apiKey !== "string") {
      return res.status(400).json({ error: "API key must be a string" });
    }
    
    if (defaultModel !== undefined && typeof defaultModel !== "string") {
      return res.status(400).json({ error: "Default model must be a string" });
    }

    updateOpenRouterConfig({
      ...(apiKey !== undefined && { apiKey }),
      ...(defaultModel !== undefined && { defaultModel })
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
