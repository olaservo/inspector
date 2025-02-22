import express from "express/index.js";
import { getOpenRouterConfig, updateOpenRouterConfig } from "../config.js";

const router = express.Router();

// Get current OpenRouter configuration
router.get("/openrouter", (req, res) => {
  try {
    const config = getOpenRouterConfig();
    // Don't send the actual API key to the client for security
    res.json({
      hasApiKey: !!config.apiKey,
      isEnvVar: !!process.env.OPENROUTER_API_KEY
    });
  } catch (error) {
    console.error('Error in GET /openrouter:', error);
    res.status(500).json({
      error: "Failed to retrieve OpenRouter configuration. Please check server logs for details."
    });
  }
});

// Update OpenRouter configuration
router.post("/openrouter", express.json(), (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        error: "Invalid request body",
        details: "Request body must be a JSON object"
      });
    }
    
    // Validate API key if provided
    if (apiKey !== undefined) {
      if (typeof apiKey !== "string") {
        return res.status(400).json({ 
          error: "Invalid API key",
          details: "API key must be a string"
        });
      }
      if (!apiKey.trim()) {
        return res.status(400).json({ 
          error: "Invalid API key",
          details: "API key cannot be empty"
        });
      }
    }

    // Update configuration
    updateOpenRouterConfig({
      ...(apiKey !== undefined && { apiKey })
    });

    const config = getOpenRouterConfig();
    res.json({ 
      success: true,
      message: "OpenRouter configuration updated successfully",
      isEnvVar: !!process.env.OPENROUTER_API_KEY
    });
  } catch (error) {
    console.error('Error in POST /openrouter:', error);
    res.status(500).json({
      error: "Failed to update OpenRouter configuration",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
