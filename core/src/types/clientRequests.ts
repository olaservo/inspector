/**
 * Client request types for MCP client features
 * Per MCP 2025-11-25 specification
 */

import type { ToolDefinition, ToolChoice, ToolCall } from './responses';

// Tool use content block (in assistant messages)
export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Tool result content block (in user messages following tool use)
export interface ToolResultContent {
  type: 'tool_result';
  toolUseId: string;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// All possible content types in sampling messages
export type SamplingContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | ToolUseContent
  | ToolResultContent;

// Sampling message with support for tool calling
export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: SamplingContentBlock | SamplingContentBlock[];
}

// Model preferences for sampling
export interface ModelPreferences {
  hints?: string[];
  costPriority?: number;
  speedPriority?: number;
  intelligencePriority?: number;
}

// Sampling request from server
export interface SamplingRequest {
  messages: SamplingMessage[];
  modelPreferences?: ModelPreferences;
  maxTokens: number;
  stopSequences?: string[];
  temperature?: number;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  // Tool calling support (MCP 2025-11-25)
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
}

// Elicitation form field schema
export interface ElicitationFormField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: string | number | boolean;
}

// Elicitation form request
export interface ElicitationFormRequest {
  mode: 'form';
  message: string;
  schema: {
    properties: Record<string, ElicitationFormField>;
    required?: string[];
  };
  serverName: string;
}

// Elicitation URL request
export interface ElicitationUrlRequest {
  mode: 'url';
  message: string;
  url: string;
  elicitationId: string;
  serverName: string;
}

// Union type for elicitation requests
export type ElicitationRequest = ElicitationFormRequest | ElicitationUrlRequest;
