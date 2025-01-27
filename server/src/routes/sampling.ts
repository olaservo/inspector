import express from "express/index.js";
import { SamplingStrategyRegistry, stubStrategy, openRouterStrategy } from "mcp-sampling-service";

const router = express.Router();

// Initialize registry and register strategies
const registry = SamplingStrategyRegistry.getInstance();

registry.register("stub", stubStrategy);
registry.register("openrouter", openRouterStrategy);

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
    const samplingStrategy = registry.create(strategy, config);

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
