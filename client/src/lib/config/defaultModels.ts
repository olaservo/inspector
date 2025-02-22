import { ModelConfig } from 'mcp-sampling-service';

export const defaultModels: ModelConfig[] = [
  {
    id: "amazon/nova-pro-v1",
    speedScore: 0.70,
    intelligenceScore: 0.60,
    costScore: 0.80
  },
  {
    id: "anthropic/claude-3.5-haiku",
    speedScore: 0.70,
    intelligenceScore: 0.65,
    costScore: 0.80
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    speedScore: 0.65,
    intelligenceScore: 0.75,
    costScore: 0.70
  },
  {
    id: "deepseek/deepseek-r1",
    speedScore: 0.45,
    intelligenceScore: 0.97,
    costScore: 0.70
  },
  {
    id: "deepseek/deepseek-chat",
    speedScore: 0.52,
    intelligenceScore: 0.65,
    costScore: 0.90
  },
  {
    id: "google/gemini-flash-1.5",
    speedScore: 0.94,
    intelligenceScore: 0.30,
    costScore: 0.98
  },
  {
    id: "google/gemini-pro-1.5",
    speedScore: 0.65,
    intelligenceScore: 0.68,
    costScore: 0.81
  },
  {
    id: "mistralai/mistral-nemo",
    speedScore: 0.70,
    intelligenceScore: 0.20,
    costScore: 1.00
  },
  {
    id: "openai/gpt-4o",
    speedScore: 0.67,
    intelligenceScore: 0.70,
    costScore: 0.65
  },
  {
    id: "openai/gpt-4o-mini",
    speedScore: 0.72,
    intelligenceScore: 0.60,
    costScore: 0.90
  },
  {
    id: "openai/o1-mini",
    speedScore: 0.65,
    intelligenceScore: 0.80,
    costScore: 0.60
  }
];

export const defaultModel = "anthropic/claude-3.5-sonnet";
