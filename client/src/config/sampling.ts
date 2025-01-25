export interface CreateMessageRequest {
  messages: Array<{
    role: string;
    content: {
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
  systemPrompt?: string;
  maxTokens: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface CreateMessageResult {
  model: string;
  stopReason: string;
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface SamplingConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface SamplingStrategyDefinition {
  id: string;
  name: string;
  requiresConfig: boolean;
  configFields?: SamplingConfigField[];
}

export interface SamplingConfig {
  strategy: string;
  config: Record<string, string | number | boolean>;
}

export const defaultSamplingConfig: SamplingConfig = {
  strategy: "stub",
  config: {}
};

export const availableStrategies: SamplingStrategyDefinition[] = [
  {
    id: "stub",
    name: "Stub Response",
    requiresConfig: false
  },
  {
    id: "zem",
    name: "Zem Strategy",
    requiresConfig: true,
    configFields: [
      {
        name: "openRouterApiKey",
        type: "string",
        label: "OpenRouter API Key",
        placeholder: "Enter your OpenRouter API key",
        required: true
      }
    ]
  }
];
