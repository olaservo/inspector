/**
 * @modelcontextprotocol/inspector-core
 *
 * Core MCP client logic for Inspector - no React dependencies.
 * This package can be used in CLI tools, test frameworks, or any JS environment.
 */

// Client lifecycle
export {
  createMcpClient,
  connectClient,
  disconnectClient,
  isClientConnected,
  serverSupports,
} from './client.js';
export type { McpClientOptions, ServerInfo } from './client.js';

// Transport creation
export {
  createHttpTransport,
  createAuthenticatedTransport,
  isValidHttpUrl,
} from './transport.js';

// Request handlers (sampling, elicitation)
export {
  setupSamplingHandler,
  setupElicitationHandler,
  resolveSamplingRequest,
  rejectSamplingRequest,
  resolveElicitationRequest,
  rejectElicitationRequest,
  generateSamplingRequestId,
  generateElicitationRequestId,
  clearAllPendingRequests,
  hasPendingSamplingRequests,
  hasPendingElicitationRequests,
} from './handlers.js';
export type {
  ApprovalMode,
  SamplingHandlerOptions,
  SamplingHandlerCallbacks,
  ElicitationHandlerOptions,
  ElicitationHandlerCallbacks,
} from './handlers.js';

// Capability handlers (roots, logging, list changed, subscriptions, completions, ping, cancellation)
export {
  // Roots
  setupRootsHandler,
  // Logging
  setupLoggingHandler,
  setServerLogLevel,
  // List changed
  setupListChangedHandlers,
  // Resource subscriptions
  setupResourceUpdatedHandler,
  subscribeToResource,
  unsubscribeFromResource,
  // Completions
  getPromptCompletions,
  getResourceCompletions,
  // Ping
  pingServer,
  // Cancellation
  generateRequestId,
  registerCancellableRequest,
  completeRequest,
  cancelRequest,
  cancelAllRequests,
  isRequestInProgress,
  getInProgressRequestCount,
} from './capabilities.js';
export type {
  Root,
  ServerLogMessage,
  RootsHandlerCallbacks,
  LoggingHandlerCallbacks,
  ListChangedHandlerCallbacks,
  ResourceSubscriptionCallbacks,
  CompletionRef,
  PromptCompletionRef,
  ResourceCompletionRef,
  CompletionResult,
} from './capabilities.js';

// All types
export * from './types/index.js';

// Data layer interfaces and implementations
export * from './data/index.js';
