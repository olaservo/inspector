import express from "express/index.js";
import { SamplingStrategyRegistry, stubStrategy } from "zem-sampling-service";

const router = express.Router();

// Initialize registry and register built-in stub strategy
const registry = SamplingStrategyRegistry.getInstance();

registry.register("stub", stubStrategy);

router.post("/", async (req, res) => {
  try {
    const { strategy, config, request } = req.body;

    if (!strategy || !request) {
      return res.status(400).json({
        error: "Missing required fields: strategy and request are required"
      });
    }

    // Create sampling strategy using registry
    const samplingStrategy = registry.create(strategy, config);

    // Use the strategy to handle the request
    const result = await samplingStrategy.handleSamplingRequest(request);

    res.json(result);
  } catch (error) {
    console.error("Error handling sampling request:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
