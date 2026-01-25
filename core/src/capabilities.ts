/**
 * MCP Capability Handlers
 *
 * Setup functions for MCP client capabilities:
 * - Roots: Expose filesystem paths to servers
 * - Logging: Receive log messages from servers
 * - List Changed: Handle server notifications about list changes
 * - Resource Subscriptions: Subscribe to resource updates
 * - Completions: Get argument completions
 * - Ping: Check server liveness
 * - Cancellation: Cancel in-progress requests
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ListRootsRequestSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { LogLevel } from './types/logs.js';

/**
 * Root definition for filesystem access
 */
export interface Root {
  /** Display name for the root */
  name: string;
  /** URI for the root (e.g., file:///path/to/directory) */
  uri: string;
}

/**
 * Log message from server
 */
export interface ServerLogMessage {
  /** Log level (RFC 5424) */
  level: LogLevel;
  /** Optional logger name */
  logger?: string;
  /** Log data (can be string or object) */
  data: unknown;
}

/**
 * Callbacks for roots capability
 */
export interface RootsHandlerCallbacks {
  /**
   * Called to get the current list of roots.
   * This is invoked when the server sends a roots/list request.
   */
  getRoots: () => Root[];
}

/**
 * Callbacks for logging capability
 */
export interface LoggingHandlerCallbacks {
  /**
   * Called when a log message is received from the server.
   */
  onLogMessage: (message: ServerLogMessage) => void;
}

/**
 * Callbacks for list changed notifications
 */
export interface ListChangedHandlerCallbacks {
  /**
   * Called when the server notifies that its list of tools has changed.
   */
  onToolsListChanged?: () => void;

  /**
   * Called when the server notifies that its list of resources has changed.
   */
  onResourcesListChanged?: () => void;

  /**
   * Called when the server notifies that its list of prompts has changed.
   */
  onPromptsListChanged?: () => void;
}

/**
 * Set up the roots capability handler.
 *
 * This allows the server to request the list of filesystem roots
 * that the client is willing to expose.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for providing roots
 * @returns Function to send roots/listChanged notification
 */
export function setupRootsHandler(
  client: Client,
  callbacks: RootsHandlerCallbacks
): () => Promise<void> {
  // Handle roots/list requests from server
  client.setRequestHandler(ListRootsRequestSchema, async () => {
    const roots = callbacks.getRoots();
    return {
      roots: roots.map((root) => ({
        name: root.name,
        uri: root.uri,
      })),
    };
  });

  // Return function to notify server of root changes
  return async () => {
    try {
      await client.notification({
        method: 'notifications/roots/list_changed',
        params: {},
      });
    } catch (error) {
      console.warn('[MCP Capabilities] Failed to send roots/listChanged notification:', error);
    }
  };
}

/**
 * Set up the logging notification handler.
 *
 * This receives log messages from the server and forwards them to the UI.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for handling log messages
 */
export function setupLoggingHandler(
  client: Client,
  callbacks: LoggingHandlerCallbacks
): void {
  client.setNotificationHandler(LoggingMessageNotificationSchema, async (notification) => {
    const params = notification.params;
    if (params && params.level) {
      callbacks.onLogMessage({
        level: params.level as LogLevel,
        logger: params.logger,
        data: params.data,
      });
    }
  });
}

/**
 * Set the logging level on the server.
 *
 * This tells the server what minimum log level to send.
 *
 * @param client - The MCP client instance
 * @param level - Minimum log level to receive
 */
export async function setServerLogLevel(
  client: Client,
  level: LogLevel
): Promise<void> {
  await client.request(
    {
      method: 'logging/setLevel',
      params: { level },
    },
    // Schema for validation - use empty object to skip validation
    {} as Parameters<typeof client.request>[1]
  );
}

/**
 * Set up handlers for list changed notifications from the server.
 *
 * These notifications indicate that the server's available tools,
 * resources, or prompts have changed and should be refreshed.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for handling list changes
 */
export function setupListChangedHandlers(
  client: Client,
  callbacks: ListChangedHandlerCallbacks
): void {
  // Tools list changed
  if (callbacks.onToolsListChanged) {
    client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      callbacks.onToolsListChanged?.();
    });
  }

  // Resources list changed
  if (callbacks.onResourcesListChanged) {
    client.setNotificationHandler(ResourceListChangedNotificationSchema, async () => {
      callbacks.onResourcesListChanged?.();
    });
  }

  // Prompts list changed
  if (callbacks.onPromptsListChanged) {
    client.setNotificationHandler(PromptListChangedNotificationSchema, async () => {
      callbacks.onPromptsListChanged?.();
    });
  }
}

// =============================================================================
// Resource Subscriptions
// =============================================================================

/**
 * Callbacks for resource subscription updates
 */
export interface ResourceSubscriptionCallbacks {
  /**
   * Called when a subscribed resource is updated.
   */
  onResourceUpdated: (uri: string) => void;
}

/**
 * Set up resource update notification handler.
 *
 * @param client - The MCP client instance
 * @param callbacks - Callbacks for handling resource updates
 */
export function setupResourceUpdatedHandler(
  client: Client,
  callbacks: ResourceSubscriptionCallbacks
): void {
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, async (notification) => {
    const uri = notification.params?.uri;
    if (uri) {
      callbacks.onResourceUpdated(uri);
    }
  });
}

/**
 * Subscribe to resource updates.
 *
 * @param client - The MCP client instance
 * @param uri - The resource URI to subscribe to
 */
export async function subscribeToResource(
  client: Client,
  uri: string
): Promise<void> {
  await client.subscribeResource({ uri });
}

/**
 * Unsubscribe from resource updates.
 *
 * @param client - The MCP client instance
 * @param uri - The resource URI to unsubscribe from
 */
export async function unsubscribeFromResource(
  client: Client,
  uri: string
): Promise<void> {
  await client.unsubscribeResource({ uri });
}

// =============================================================================
// Completions
// =============================================================================

/**
 * Prompt completion reference
 */
export interface PromptCompletionRef {
  type: 'ref/prompt';
  name: string;
}

/**
 * Resource completion reference
 */
export interface ResourceCompletionRef {
  type: 'ref/resource';
  uri: string;
}

/**
 * Completion reference - what we're completing for
 */
export type CompletionRef = PromptCompletionRef | ResourceCompletionRef;

/**
 * Completion result
 */
export interface CompletionResult {
  /** Completion values */
  values: string[];
  /** Total number of matches (may be more than values.length) */
  total?: number;
  /** Whether there are more results available */
  hasMore?: boolean;
}

/**
 * Get argument completions for a prompt.
 *
 * @param client - The MCP client instance
 * @param promptName - The name of the prompt
 * @param argumentName - The name of the argument being completed
 * @param argumentValue - The current value of the argument (for filtering)
 * @returns Completion suggestions
 */
export async function getPromptCompletions(
  client: Client,
  promptName: string,
  argumentName: string,
  argumentValue: string
): Promise<CompletionResult> {
  const result = await client.complete({
    ref: {
      type: 'ref/prompt',
      name: promptName,
    },
    argument: {
      name: argumentName,
      value: argumentValue,
    },
  });

  return {
    values: result.completion.values,
    total: result.completion.total,
    hasMore: result.completion.hasMore,
  };
}

/**
 * Get argument completions for a resource template.
 *
 * @param client - The MCP client instance
 * @param resourceUri - The resource URI template
 * @param argumentName - The name of the argument being completed
 * @param argumentValue - The current value of the argument (for filtering)
 * @returns Completion suggestions
 */
export async function getResourceCompletions(
  client: Client,
  resourceUri: string,
  argumentName: string,
  argumentValue: string
): Promise<CompletionResult> {
  const result = await client.complete({
    ref: {
      type: 'ref/resource',
      uri: resourceUri,
    },
    argument: {
      name: argumentName,
      value: argumentValue,
    },
  });

  return {
    values: result.completion.values,
    total: result.completion.total,
    hasMore: result.completion.hasMore,
  };
}

// =============================================================================
// Ping
// =============================================================================

/**
 * Ping the server to check if it's alive.
 *
 * @param client - The MCP client instance
 * @returns True if server responded, throws if failed
 */
export async function pingServer(client: Client): Promise<boolean> {
  await client.ping();
  return true;
}

// =============================================================================
// Cancellation
// =============================================================================

// Track in-progress requests for cancellation
const inProgressRequests = new Map<string, AbortController>();

/**
 * Generate a unique request ID for tracking cancellable requests.
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Register a request as in-progress for potential cancellation.
 *
 * @param requestId - Unique ID for this request
 * @returns AbortController signal to pass to fetch/operations
 */
export function registerCancellableRequest(requestId: string): AbortController {
  const controller = new AbortController();
  inProgressRequests.set(requestId, controller);
  return controller;
}

/**
 * Mark a request as complete (remove from tracking).
 *
 * @param requestId - The request ID to complete
 */
export function completeRequest(requestId: string): void {
  inProgressRequests.delete(requestId);
}

/**
 * Cancel an in-progress request.
 *
 * @param client - The MCP client instance
 * @param requestId - The request ID to cancel
 * @param reason - Optional reason for cancellation
 */
export async function cancelRequest(
  client: Client,
  requestId: string,
  reason?: string
): Promise<void> {
  // Abort locally first
  const controller = inProgressRequests.get(requestId);
  if (controller) {
    controller.abort(reason);
    inProgressRequests.delete(requestId);
  }

  // Send cancellation notification to server
  try {
    await client.notification({
      method: 'notifications/cancelled',
      params: {
        requestId,
        reason,
      },
    });
  } catch (error) {
    console.warn('[MCP Capabilities] Failed to send cancellation notification:', error);
  }
}

/**
 * Cancel all in-progress requests.
 *
 * @param client - The MCP client instance
 * @param reason - Optional reason for cancellation
 */
export async function cancelAllRequests(
  client: Client,
  reason = 'Client requested cancellation'
): Promise<void> {
  const requestIds = Array.from(inProgressRequests.keys());

  for (const requestId of requestIds) {
    await cancelRequest(client, requestId, reason);
  }
}

/**
 * Check if a request is still in progress.
 *
 * @param requestId - The request ID to check
 */
export function isRequestInProgress(requestId: string): boolean {
  return inProgressRequests.has(requestId);
}

/**
 * Get the count of in-progress requests.
 */
export function getInProgressRequestCount(): number {
  return inProgressRequests.size;
}
