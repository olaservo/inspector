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
      hasApiKey: !!config.apiKey,
      allowedModels: config.allowedModels
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
    const { apiKey, defaultModel, allowedModels } = req.body;
    
    if (apiKey !== undefined && typeof apiKey !== "string") {
      return res.status(400).json({ error: "API key must be a string" });
    }
    
    if (defaultModel !== undefined && typeof defaultModel !== "string") {
      return res.status(400).json({ error: "Default model must be a string" });
    }

    if (allowedModels !== undefined) {
      if (!Array.isArray(allowedModels)) {
        return res.status(400).json({ error: "Allowed models must be an array" });
      }
      
      // Validate each model config
      for (const model of allowedModels) {
        if (typeof model !== "object" || model === null) {
          return res.status(400).json({ error: "Each model config must be an object" });
        }
        
        if (typeof model.id !== "string") {
          return res.status(400).json({ error: "Model id must be a string" });
        }
        
        for (const score of ["speedScore", "intelligenceScore", "costScore"]) {
          if (typeof model[score] !== "number" || model[score] < 0 || model[score] > 1) {
            return res.status(400).json({ error: `Model ${score} must be a number between 0 and 1` });
          }
        }
      }
    }

    updateOpenRouterConfig({
      ...(apiKey !== undefined && { apiKey }),
      ...(defaultModel !== undefined && { defaultModel }),
      ...(allowedModels !== undefined && { allowedModels })
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
