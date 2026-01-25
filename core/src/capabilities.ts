/**
 * MCP Capability Handlers
 *
 * Setup functions for MCP client capabilities:
 * - Roots: Expose filesystem paths to servers
 * - Logging: Receive log messages from servers
 * - List Changed: Handle server notifications about list changes
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ListRootsRequestSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
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
