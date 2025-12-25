// Testing Profiles for Sampling/Elicitation Response Strategies

export type SamplingProviderType = 'manual' | 'mock';

export interface ModelOverride {
  pattern: string; // e.g., "claude-*", "gpt-*"
  response: string;
}

export interface TestingProfile {
  id: string;
  name: string;
  description?: string;
  samplingProvider: SamplingProviderType;
  autoRespond: boolean;
  defaultResponse?: string;
  defaultModel?: string;
  defaultStopReason?: 'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse';
  modelOverrides?: ModelOverride[];
  elicitationAutoRespond?: boolean;
  elicitationDefaults?: Record<string, unknown>;
}

export const mockTestingProfiles: TestingProfile[] = [
  {
    id: 'manual',
    name: 'Manual',
    description: 'Manually respond to all sampling and elicitation requests',
    samplingProvider: 'manual',
    autoRespond: false,
    elicitationAutoRespond: false,
  },
  {
    id: 'auto-mock',
    name: 'Auto Mock',
    description: 'Automatically respond with generic mock responses',
    samplingProvider: 'mock',
    autoRespond: true,
    defaultResponse: 'This is an auto-generated mock response for testing purposes.',
    defaultModel: 'mock-model-1.0',
    defaultStopReason: 'endTurn',
    elicitationAutoRespond: true,
    elicitationDefaults: {
      confirmed: true,
    },
  },
  {
    id: 'claude-mock',
    name: 'Claude Mock',
    description: 'Mock responses styled like Claude',
    samplingProvider: 'mock',
    autoRespond: true,
    defaultResponse: "I'll analyze this request and provide a thoughtful response.",
    defaultModel: 'claude-3-sonnet-20241022',
    defaultStopReason: 'endTurn',
    modelOverrides: [
      {
        pattern: 'claude-*',
        response:
          "Based on my analysis, I can provide the following insights. Let me break this down step by step...",
      },
      {
        pattern: 'gpt-*',
        response:
          'As an AI assistant, I can help you with this task. Here is my analysis...',
      },
    ],
    elicitationAutoRespond: false,
  },
  {
    id: 'quick-approve',
    name: 'Quick Approve',
    description: 'Approve all requests immediately with minimal responses',
    samplingProvider: 'mock',
    autoRespond: true,
    defaultResponse: 'OK',
    defaultModel: 'mock-model-1.0',
    defaultStopReason: 'endTurn',
    elicitationAutoRespond: true,
    elicitationDefaults: {},
  },
];

// Helper to get response for a model hint
export function getResponseForModelHint(
  profile: TestingProfile,
  modelHints?: string[]
): string {
  if (!profile.modelOverrides || !modelHints || modelHints.length === 0) {
    return profile.defaultResponse || '';
  }

  // Check each hint against patterns
  for (const hint of modelHints) {
    for (const override of profile.modelOverrides) {
      const pattern = override.pattern.replace('*', '.*');
      if (new RegExp(`^${pattern}$`).test(hint)) {
        return override.response;
      }
    }
  }

  return profile.defaultResponse || '';
}
