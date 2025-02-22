import express from "express/index.js";
import { SamplingStrategyRegistry, stubStrategy, openRouterStrategy } from "mcp-sampling-service";
import { getOpenRouterConfig } from "../config.js";

const router = express.Router();

// Get registry instance and register strategies
const registry = SamplingStrategyRegistry.getInstance();

// Register stub strategy
registry.register('stub', stubStrategy, {
  id: 'stub',
  name: 'Stub Strategy',
  configFields: [],
  requiresConfig: false
});

// Register OpenRouter strategy
registry.register('openrouter', openRouterStrategy, {
  id: 'openrouter',
  name: 'OpenRouter Strategy',
  requiresConfig: true,
  configFields: [
    {
      name: "defaultModel",
      type: "string",
      required: true,
      label: "Default Model"
    }
  ]
});

// Get available sampling strategies
router.get("/strategies", (req, res) => {
  res.json(registry.getStrategyDefinitions());
});

router.post("/", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("Received sampling request:", JSON.stringify(req.body, null, 2));
    const { strategy, config, request } = req.body;

    if (!strategy || !request) {
      return res.status(400).json({
        error: "Missing required fields: strategy and request are required"
      });
    }

    console.log(`Creating sampling strategy: ${strategy}`);
    let strategyConfig = config;

    // Handle OpenRouter specific configuration
    if (strategy === 'openrouter') {
      const openRouterConfig = getOpenRouterConfig();
      
      if (!openRouterConfig.apiKey) {
        return res.status(500).json({
          error: "OpenRouter API key not configured"
        });
      }
      
      if (!config.defaultModel) {
        return res.status(400).json({
          error: "defaultModel is required for OpenRouter strategy"
        });
      }

      strategyConfig = {
        apiKey: openRouterConfig.apiKey,  // From secure storage
        ...config  // From request (defaultModel, allowedModels)
      };
    }
    
    const samplingStrategy = registry.create(strategy, strategyConfig);

    console.log("Starting sampling request handling");
    const result = await Promise.race([
      samplingStrategy.handleSamplingRequest(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Server timeout after 60 seconds")), 60000)
      )
    ]);

    const duration = Date.now() - startTime;
    console.log(`Sampling request completed in ${duration}ms`);
    
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Error handling sampling request after ${duration}ms:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred",
      duration
    });
  }
});

export default router;
