import express from "express/index.js";
import { SamplingStrategyRegistry, stubStrategy, openRouterStrategy } from "mcp-sampling-service";

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
      name: 'model',
      type: 'string',
      label: 'Model Override',
      placeholder: 'Optional specific model to use',
      required: false
    },
    {
      name: 'speedPriority',
      type: 'number',
      label: 'Speed Priority',
      placeholder: '0-1 priority for response speed',
      required: false
    },
    {
      name: 'intelligencePriority',
      type: 'number',
      label: 'Intelligence Priority', 
      placeholder: '0-1 priority for model capability',
      required: false
    },
    {
      name: 'costPriority',
      type: 'number',
      label: 'Cost Priority',
      placeholder: '0-1 priority for cost efficiency',
      required: false
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

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OpenRouter API key not configured"
      });
    }

    console.log(`Creating sampling strategy: ${strategy}`);
    const strategyConfig = strategy === 'openrouter' ? {
      ...config,
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'
    } : config;
    
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
