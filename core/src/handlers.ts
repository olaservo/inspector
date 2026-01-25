/**
 * MCP Request Handlers
 *
 * Handles client-side requests from MCP servers:
 * - Sampling: Server requests LLM completion from client
 * - Elicitation: Server requests user input (form or URL)
 *
 * These handlers integrate with ExecutionContext to show UI
 * and return user responses to the server.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  type CreateMessageRequest,
  type CreateMessageResult,
  type ElicitRequest,
  type ElicitResult,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  SamplingRequest,
  ElicitationRequest,
  SamplingMessage,
  SamplingContentBlock,
} from './types/clientRequests.js';
import type { SamplingResponse, ToolDefinition, ToolChoice, ToolCall } from './types/responses.js';
import type { TestingProfile } from './types/testingProfiles.js';
import { getResponseForModelHint } from './types/testingProfiles.js';

/**
 * Approval mode for sampling/elicitation requests
 */
export type ApprovalMode = 'ask' | 'auto' | 'deny';

// Response resolvers - keyed by request ID
const samplingResolvers = new Map<
  string,
  {
    resolve: (response: SamplingResponse) => void;
    reject: (reason?: unknown) => void;
  }
>();

const elicitationResolvers = new Map<
  string,
  {
    resolve: (data: Record<string, unknown>) => void;
    reject: (reason?: unknown) => void;
  }
>();

// Request ID counter for generating unique IDs
let requestIdCounter = 0;

/**
 * Generate a unique request ID for pending requests.
 */
export function generateSamplingRequestId(): string {
  return `sampling-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Generate a unique request ID for elicitation requests.
 */
export function generateElicitationRequestId(): string {
  return `elicitation-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Convert a single SDK content item to our internal format.
 */
function convertContentItem(content: unknown): SamplingContentBlock {
  const contentObj = content as {
    type?: string;
    text?: string;
    data?: string;
    mimeType?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    toolUseId?: string;
    content?: unknown[];
    isError?: boolean;
  };

  // Text content
  if (contentObj.type === 'text' && typeof contentObj.text === 'string') {
    return { type: 'text' as const, text: contentObj.text };
  }

  // Image content
  if (contentObj.type === 'image' && typeof contentObj.data === 'string' && typeof contentObj.mimeType === 'string') {
    return { type: 'image' as const, data: contentObj.data, mimeType: contentObj.mimeType };
  }

  // Tool use content (in assistant messages)
  if (contentObj.type === 'tool_use' && contentObj.id && contentObj.name) {
    return {
      type: 'tool_use' as const,
      id: contentObj.id,
      name: contentObj.name,
      input: contentObj.input || {},
    };
  }

  // Tool result content (in user messages)
  if (contentObj.type === 'tool_result' && contentObj.toolUseId) {
    const resultContent = Array.isArray(contentObj.content)
      ? contentObj.content
          .filter((c): c is { type: 'text'; text: string } =>
            (c as { type?: string }).type === 'text'
          )
          .map((c) => ({ type: 'text' as const, text: c.text }))
      : [];

    return {
      type: 'tool_result' as const,
      toolUseId: contentObj.toolUseId,
      content: resultContent,
      isError: contentObj.isError,
    };
  }

  // Fallback for unsupported types
  return { type: 'text' as const, text: '[Unsupported content type]' };
}

/**
 * Convert SDK message content (single or array) to our internal format.
 */
function convertMessageContent(
  content: unknown
): SamplingContentBlock | SamplingContentBlock[] {
  if (Array.isArray(content)) {
    return content.map(convertContentItem);
  }
  return convertContentItem(content);
}

/**
 * Convert SDK tool definition to our internal format.
 */
function convertToolDefinition(sdkTool: unknown): ToolDefinition {
  const tool = sdkTool as { name?: string; description?: string; inputSchema?: unknown };
  return {
    name: tool.name || 'unknown',
    description: tool.description,
    inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
  };
}

/**
 * Convert SDK tool choice to our internal format.
 */
function convertToolChoice(sdkChoice: unknown): ToolChoice | undefined {
  if (!sdkChoice) return undefined;

  const choice = sdkChoice as { type?: string; name?: string };

  if (choice.type === 'auto') return { type: 'auto' };
  if (choice.type === 'none') return { type: 'none' };
  if (choice.type === 'required') return { type: 'required' };
  if (choice.type === 'tool' && choice.name) return { type: 'tool', name: choice.name };

  return undefined;
}

/**
 * Convert MCP SDK CreateMessageRequest to our internal SamplingRequest format.
 */
function convertToSamplingRequest(
  sdkRequest: CreateMessageRequest['params']
): SamplingRequest {
  // Convert tools if present
  const tools: ToolDefinition[] | undefined = sdkRequest.tools
    ? sdkRequest.tools.map(convertToolDefinition)
    : undefined;

  // Convert tool choice if present
  const toolChoice = convertToolChoice(sdkRequest.toolChoice);

  return {
    messages: sdkRequest.messages.map((msg): SamplingMessage => ({
      role: msg.role as 'user' | 'assistant',
      content: convertMessageContent(msg.content),
    })),
    modelPreferences: sdkRequest.modelPreferences
      ? {
          hints: sdkRequest.modelPreferences.hints
            ?.map((h) => h.name)
            .filter((name): name is string => name !== undefined),
          costPriority: sdkRequest.modelPreferences.costPriority,
          speedPriority: sdkRequest.modelPreferences.speedPriority,
          intelligencePriority: sdkRequest.modelPreferences.intelligencePriority,
        }
      : undefined,
    maxTokens: sdkRequest.maxTokens,
    stopSequences: sdkRequest.stopSequences,
    temperature: sdkRequest.temperature,
    includeContext: sdkRequest.includeContext as
      | 'none'
      | 'thisServer'
      | 'allServers'
      | undefined,
    tools,
    toolChoice,
  };
}

/**
 * Convert a tool call to SDK tool_use content block.
 */
function convertToolCallToContent(toolCall: ToolCall): {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
} {
  return {
    type: 'tool_use',
    id: toolCall.id,
    name: toolCall.name,
    input: toolCall.arguments,
  };
}

/**
 * Convert our SamplingResponse to MCP SDK CreateMessageResult format.
 */
function convertToSdkResult(response: SamplingResponse): CreateMessageResult {
  // If there are tool calls, include them in the content array
  if (response.toolCalls && response.toolCalls.length > 0) {
    // Build content array with text/image first, then tool_use blocks
    const contentArray: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; data: string; mimeType: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    > = [];

    // Add the main content (text or image)
    if (response.content.type === 'text') {
      contentArray.push({ type: 'text', text: response.content.text });
    } else {
      contentArray.push({
        type: 'image',
        data: response.content.data,
        mimeType: response.content.mimeType,
      });
    }

    // Add tool_use blocks
    for (const toolCall of response.toolCalls) {
      contentArray.push(convertToolCallToContent(toolCall));
    }

    return {
      role: 'assistant',
      content: contentArray as unknown as CreateMessageResult['content'],
      model: response.model,
      stopReason: response.stopReason,
    };
  }

  // No tool calls - return single content item
  const content = response.content.type === 'text'
    ? { type: 'text' as const, text: response.content.text }
    : { type: 'image' as const, data: response.content.data, mimeType: response.content.mimeType };

  return {
    role: 'assistant',
    content,
    model: response.model,
    stopReason: response.stopReason,
  };
}

/**
 * Options for sampling handler configuration
 */
export interface SamplingHandlerOptions {
  /**
   * Approval mode for sampling requests:
   * - 'ask': Show UI and wait for user response (default)
   * - 'auto': Automatically respond using autoResponder or testing profile
   * - 'deny': Automatically reject all requests
   */
  approvalMode?: ApprovalMode;

  /**
   * Testing profile for auto-respond mode.
   * Used to generate responses when approvalMode is 'auto'.
   */
  testingProfile?: TestingProfile;

  /**
   * Custom auto-responder function.
   * If provided and returns a response, that response is used.
   * If returns null/undefined, falls back to testingProfile or UI.
   */
  autoResponder?: (request: SamplingRequest) => SamplingResponse | null | undefined;
}

/**
 * Callbacks for when sampling/elicitation requests are received.
 */
export interface SamplingHandlerCallbacks {
  /**
   * Called when a sampling request is received from the server.
   * The implementation should show UI and eventually call resolveSamplingRequest.
   * Not called when approvalMode is 'auto' or 'deny'.
   */
  onSamplingRequest: (
    requestId: string,
    request: SamplingRequest,
    parentRequestId: string
  ) => void;

  /**
   * Called when a sampling request is cancelled by the server.
   */
  onSamplingCancelled?: (requestId: string) => void;

  /**
   * Called when a request is auto-approved (for logging/UI feedback).
   */
  onSamplingAutoApproved?: (
    requestId: string,
    request: SamplingRequest,
    response: SamplingResponse
  ) => void;

  /**
   * Called when a request is auto-denied (for logging/UI feedback).
   */
  onSamplingAutoDenied?: (requestId: string, request: SamplingRequest) => void;
}

/**
 * Options for elicitation handler configuration
 */
export interface ElicitationHandlerOptions {
  /**
   * Approval mode for elicitation requests:
   * - 'ask': Show UI and wait for user response (default)
   * - 'auto': Automatically respond using defaults from testing profile
   * - 'deny': Automatically decline all requests
   */
  approvalMode?: ApprovalMode;

  /**
   * Testing profile for auto-respond mode.
   * Uses elicitationDefaults when approvalMode is 'auto'.
   */
  testingProfile?: TestingProfile;

  /**
   * Custom auto-responder function.
   * If provided and returns data, that data is used as the response.
   * If returns null/undefined, falls back to testingProfile or UI.
   */
  autoResponder?: (request: ElicitationRequest) => Record<string, unknown> | null | undefined;
}

export interface ElicitationHandlerCallbacks {
  /**
   * Called when an elicitation request is received from the server.
   * The implementation should show UI and eventually call resolveElicitationRequest.
   * Not called when approvalMode is 'auto' or 'deny'.
   */
  onElicitationRequest: (
    requestId: string,
    request: ElicitationRequest,
    parentRequestId: string
  ) => void;

  /**
   * Called when an elicitation request is cancelled by the server.
   */
  onElicitationCancelled?: (requestId: string) => void;

  /**
   * Called when a request is auto-approved (for logging/UI feedback).
   */
  onElicitationAutoApproved?: (
    requestId: string,
    request: ElicitationRequest,
    response: Record<string, unknown>
  ) => void;

  /**
   * Called when a request is auto-declined (for logging/UI feedback).
   */
  onElicitationAutoDeclined?: (requestId: string, request: ElicitationRequest) => void;
}

/**
 * Generate an auto-response from a testing profile
 */
function generateProfileResponse(
  profile: TestingProfile,
  request: SamplingRequest
): SamplingResponse {
  const modelHints = request.modelPreferences?.hints;
  const responseText = getResponseForModelHint(profile, modelHints);

  return {
    content: { type: 'text', text: responseText },
    model: profile.defaultModel || 'mock-model',
    stopReason: profile.defaultStopReason || 'endTurn',
  };
}

/**
 * Set up the sampling request handler on the MCP client.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for handling requests
 * @param parentRequestId - The ID of the parent tool execution request
 * @param options - Optional configuration for approval mode
 */
export function setupSamplingHandler(
  client: Client,
  callbacks: SamplingHandlerCallbacks,
  parentRequestId: string,
  options?: SamplingHandlerOptions
): void {
  const approvalMode = options?.approvalMode || 'ask';

  client.setRequestHandler(
    CreateMessageRequestSchema,
    async (request: CreateMessageRequest) => {
      const requestId = generateSamplingRequestId();
      const samplingRequest = convertToSamplingRequest(request.params);

      console.log('[MCP Handlers] Sampling request received:', requestId, samplingRequest);

      // Handle 'deny' mode - reject immediately
      if (approvalMode === 'deny') {
        console.log('[MCP Handlers] Auto-denying sampling request:', requestId);
        callbacks.onSamplingAutoDenied?.(requestId, samplingRequest);
        throw new Error('Sampling requests are disabled');
      }

      // Handle 'auto' mode - try auto-responders
      if (approvalMode === 'auto') {
        // Try custom auto-responder first
        if (options?.autoResponder) {
          const response = options.autoResponder(samplingRequest);
          if (response) {
            console.log('[MCP Handlers] Auto-responding via custom responder:', requestId);
            callbacks.onSamplingAutoApproved?.(requestId, samplingRequest, response);
            return convertToSdkResult(response);
          }
        }

        // Try testing profile
        if (options?.testingProfile?.autoRespond) {
          const response = generateProfileResponse(options.testingProfile, samplingRequest);
          console.log('[MCP Handlers] Auto-responding via testing profile:', requestId);
          callbacks.onSamplingAutoApproved?.(requestId, samplingRequest, response);
          return convertToSdkResult(response);
        }

        // Fall through to 'ask' mode if no auto-responder matched
        console.log('[MCP Handlers] No auto-responder matched, falling back to ask mode');
      }

      // 'ask' mode - show UI and wait for user response
      const responsePromise = new Promise<SamplingResponse>((resolve, reject) => {
        samplingResolvers.set(requestId, { resolve, reject });
      });

      // Notify the UI about the new request
      callbacks.onSamplingRequest(requestId, samplingRequest, parentRequestId);

      try {
        // Wait for the UI to respond
        const response = await responsePromise;
        console.log('[MCP Handlers] Sampling response:', requestId, response);

        // Convert to SDK format and return
        return convertToSdkResult(response);
      } finally {
        // Clean up the resolver
        samplingResolvers.delete(requestId);
      }
    }
  );
}

/**
 * Convert MCP SDK ElicitRequest to our internal ElicitationRequest format.
 */
function convertToElicitationRequest(
  sdkRequest: ElicitRequest['params']
): ElicitationRequest {
  // Check if it's a form-based or URL-based elicitation
  if ('requestedSchema' in sdkRequest) {
    // Form-based elicitation
    return {
      mode: 'form',
      message: sdkRequest.message,
      schema: {
        properties: Object.fromEntries(
          Object.entries(sdkRequest.requestedSchema.properties || {}).map(([key, value]) => {
            const prop = value as { type?: string; description?: string; enum?: string[]; default?: unknown };
            return [
              key,
              {
                name: key,
                type: (prop.type || 'string') as 'string' | 'number' | 'boolean',
                description: prop.description,
                enum: prop.enum,
                default: prop.default as string | number | boolean | undefined,
              },
            ];
          })
        ),
        required: sdkRequest.requestedSchema.required,
      },
      serverName: 'MCP Server',
    };
  } else {
    // URL-based elicitation
    const urlParams = sdkRequest as { message: string; url: string; elicitationId: string };
    return {
      mode: 'url',
      message: urlParams.message,
      url: urlParams.url,
      elicitationId: urlParams.elicitationId,
      serverName: 'MCP Server',
    };
  }
}

/**
 * Convert user response to MCP SDK ElicitResult format.
 */
function convertToElicitResult(
  data: Record<string, unknown>,
  action: 'accept' | 'decline' | 'cancel' = 'accept'
): ElicitResult {
  // Convert data to the expected type for ElicitResult.content
  const content: Record<string, string | number | boolean | string[]> | undefined =
    action === 'accept'
      ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => {
            // Ensure values match expected types
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              return [key, value];
            }
            if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
              return [key, value as string[]];
            }
            // Convert other types to string
            return [key, String(value)];
          })
        )
      : undefined;

  return {
    action,
    content,
  };
}

/**
 * Set up the elicitation request handler on the MCP client.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for handling requests
 * @param parentRequestId - The ID of the parent tool execution request
 * @param options - Optional configuration for approval mode
 */
export function setupElicitationHandler(
  client: Client,
  callbacks: ElicitationHandlerCallbacks,
  parentRequestId: string,
  options?: ElicitationHandlerOptions
): void {
  const approvalMode = options?.approvalMode || 'ask';

  client.setRequestHandler(
    ElicitRequestSchema,
    async (request: ElicitRequest) => {
      const requestId = generateElicitationRequestId();
      const elicitationRequest = convertToElicitationRequest(request.params);

      console.log('[MCP Handlers] Elicitation request received:', requestId, elicitationRequest);

      // Handle 'deny' mode - decline immediately
      if (approvalMode === 'deny') {
        console.log('[MCP Handlers] Auto-declining elicitation request:', requestId);
        callbacks.onElicitationAutoDeclined?.(requestId, elicitationRequest);
        return convertToElicitResult({}, 'decline');
      }

      // Handle 'auto' mode - try auto-responders
      if (approvalMode === 'auto') {
        // Try custom auto-responder first
        if (options?.autoResponder) {
          const response = options.autoResponder(elicitationRequest);
          if (response) {
            console.log('[MCP Handlers] Auto-responding elicitation via custom responder:', requestId);
            callbacks.onElicitationAutoApproved?.(requestId, elicitationRequest, response);
            return convertToElicitResult(response);
          }
        }

        // Try testing profile defaults
        if (options?.testingProfile?.elicitationAutoRespond) {
          const response = options.testingProfile.elicitationDefaults || {};
          console.log('[MCP Handlers] Auto-responding elicitation via testing profile:', requestId);
          callbacks.onElicitationAutoApproved?.(requestId, elicitationRequest, response);
          return convertToElicitResult(response);
        }

        // Fall through to 'ask' mode if no auto-responder matched
        console.log('[MCP Handlers] No elicitation auto-responder matched, falling back to ask mode');
      }

      // 'ask' mode - show UI and wait for user response
      const responsePromise = new Promise<Record<string, unknown>>((resolve, reject) => {
        elicitationResolvers.set(requestId, { resolve, reject });
      });

      // Notify the UI about the new request
      callbacks.onElicitationRequest(requestId, elicitationRequest, parentRequestId);

      try {
        // Wait for the UI to respond
        const response = await responsePromise;
        console.log('[MCP Handlers] Elicitation response:', requestId, response);

        // Convert to SDK format and return
        return convertToElicitResult(response);
      } catch (err) {
        // User declined or cancelled
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('rejected') || message.includes('declined')) {
          return convertToElicitResult({}, 'decline');
        }
        return convertToElicitResult({}, 'cancel');
      } finally {
        // Clean up the resolver
        elicitationResolvers.delete(requestId);
      }
    }
  );
}

/**
 * Resolve a pending sampling request with a response.
 * This should be called by the UI when the user provides a response.
 *
 * @param requestId - The ID of the sampling request
 * @param response - The sampling response from the user
 */
export function resolveSamplingRequest(
  requestId: string,
  response: SamplingResponse
): void {
  const resolver = samplingResolvers.get(requestId);
  if (resolver) {
    resolver.resolve(response);
    samplingResolvers.delete(requestId);
  } else {
    console.warn('[MCP Handlers] No resolver found for sampling request:', requestId);
  }
}

/**
 * Reject a pending sampling request.
 * This should be called by the UI when the user rejects the request.
 *
 * @param requestId - The ID of the sampling request
 * @param reason - Optional reason for rejection
 */
export function rejectSamplingRequest(requestId: string, reason?: string): void {
  const resolver = samplingResolvers.get(requestId);
  if (resolver) {
    resolver.reject(new Error(reason || 'Sampling request rejected by user'));
    samplingResolvers.delete(requestId);
  } else {
    console.warn('[MCP Handlers] No resolver found for sampling request:', requestId);
  }
}

/**
 * Resolve a pending elicitation request with user input.
 *
 * @param requestId - The ID of the elicitation request
 * @param data - The user input data
 */
export function resolveElicitationRequest(
  requestId: string,
  data: Record<string, unknown>
): void {
  const resolver = elicitationResolvers.get(requestId);
  if (resolver) {
    resolver.resolve(data);
    elicitationResolvers.delete(requestId);
  } else {
    console.warn('[MCP Handlers] No resolver found for elicitation request:', requestId);
  }
}

/**
 * Reject a pending elicitation request.
 *
 * @param requestId - The ID of the elicitation request
 * @param reason - Optional reason for rejection
 */
export function rejectElicitationRequest(requestId: string, reason?: string): void {
  const resolver = elicitationResolvers.get(requestId);
  if (resolver) {
    resolver.reject(new Error(reason || 'Elicitation request rejected by user'));
    elicitationResolvers.delete(requestId);
  } else {
    console.warn('[MCP Handlers] No resolver found for elicitation request:', requestId);
  }
}

/**
 * Clear all pending resolvers (e.g., when disconnecting).
 */
export function clearAllPendingRequests(): void {
  // Reject all pending sampling requests
  for (const [requestId, resolver] of samplingResolvers) {
    resolver.reject(new Error('Connection closed'));
    samplingResolvers.delete(requestId);
  }

  // Reject all pending elicitation requests
  for (const [requestId, resolver] of elicitationResolvers) {
    resolver.reject(new Error('Connection closed'));
    elicitationResolvers.delete(requestId);
  }
}

/**
 * Check if there are any pending sampling requests.
 */
export function hasPendingSamplingRequests(): boolean {
  return samplingResolvers.size > 0;
}

/**
 * Check if there are any pending elicitation requests.
 */
export function hasPendingElicitationRequests(): boolean {
  return elicitationResolvers.size > 0;
}
