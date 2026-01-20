# Inspector V2 Logic Specification

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: [Overview](v2_ux.md) | [Features](v2_ux_features.md) | [Handlers](v2_ux_handlers.md) | [Screenshots](v2_screenshots.md)
### Implementation: Logic | [Proxy](v2_proxy.md)

## Table of Contents
  * [Connection State Machine](#connection-state-machine)
  * [MCP Client Lifecycle](#mcp-client-lifecycle)
  * [Handler Coordination Flow](#handler-coordination-flow)
  * [Notification Handling](#notification-handling)
  * [Request Queue Management](#request-queue-management)
  * [Error Recovery Strategies](#error-recovery-strategies)

---

## Connection State Machine

The connection state machine defines all valid states and transitions for an MCP server connection.

```
                    +--------------------+
                    |    DISCONNECTED    |
                    +--------------------+
                             |
                             | connect(url)
                             v
                    +--------------------+
                    |    CONNECTING      |
                    |  (timeout: 30s)    |
                    +--------------------+
                             |
         +-------------------+-------------------+
         | success                              | failure/timeout
         v                                      v
+--------------------+                 +--------------------+
|     CONNECTED      |                 |       ERROR        |
|   (ping loop)      |                 | (retry count: N)   |
+--------------------+                 +--------------------+
         |                                      |
         | disconnect()                         | reconnect()
         | or error                             |
         v                                      |
+--------------------+                          |
|   DISCONNECTING    | <------------------------+
+--------------------+
         |
         v
+--------------------+
|    DISCONNECTED    |
+--------------------+
```

### State Descriptions

| State | Description |
|-------|-------------|
| `DISCONNECTED` | Initial state. No active connection to server. |
| `CONNECTING` | Connection in progress. Waiting for server handshake. |
| `CONNECTED` | Active connection. Ready to send/receive MCP messages. |
| `DISCONNECTING` | Graceful shutdown in progress. Cleaning up resources. |
| `ERROR` | Connection failed. May attempt retry based on strategy. |

### Transition Events

| Event | From State | To State | Action |
|-------|------------|----------|--------|
| `connect(url)` | DISCONNECTED | CONNECTING | Initiate transport connection |
| `handshake_complete` | CONNECTING | CONNECTED | Start ping loop, enable operations |
| `timeout` | CONNECTING | ERROR | Record failure, increment retry count |
| `transport_error` | CONNECTING | ERROR | Record error details |
| `disconnect()` | CONNECTED | DISCONNECTING | Stop ping, clear pending requests |
| `connection_lost` | CONNECTED | ERROR | Unexpected disconnect detected |
| `reconnect()` | ERROR | CONNECTING | Attempt reconnection (if retries remain) |
| `give_up` | ERROR | DISCONNECTED | Max retries exceeded |
| `cleanup_complete` | DISCONNECTING | DISCONNECTED | All resources released |

### Configuration Parameters

```typescript
interface ConnectionConfig {
  connectionTimeout: number;      // Default: 30000ms - Max time to establish connection
  requestTimeout: number;         // Default: 60000ms - Max time for individual requests
  progressResetsTimeout: boolean; // Default: true - Whether progress notifications reset request timeout
  maxTotalTimeout: number;        // Default: 300000ms (5 min) - Absolute max time for any request
  pingInterval: number;           // Default: 30000ms - Interval between ping requests
  maxRetries: number;             // Default: 3 - Max reconnection attempts
  retryBackoff: number[];         // Default: [1000, 2000, 4000] - Backoff delays in ms
}
```

**Timeout Behavior:**

| Parameter | Description |
|-----------|-------------|
| `connectionTimeout` | Time allowed for initial connection handshake |
| `requestTimeout` | Time allowed for request before timeout (may be extended by progress) |
| `progressResetsTimeout` | When `true`, receiving a `progress` notification resets the request timeout clock |
| `maxTotalTimeout` | Absolute maximum time regardless of progress notifications |

---

## MCP Client Lifecycle

The client lifecycle defines the sequence of operations from application start to shutdown.

```
Application Start
       |
       v
+------------------+
| createMcpClient()|  <-- Configure capabilities (sampling, roots, etc.)
+------------------+
       |
       v
+------------------+
| createTransport()|  <-- HTTP, SSE, or STDIO via proxy
+------------------+
       |
       v
+------------------+
|    connect()     |  <-- Triggers initialize handshake
+------------------+
       |
       | MCP initialize request/response
       v
+------------------+
| setupHandlers()  |  <-- Sampling, elicitation, notification handlers
+------------------+
       |
       v
+------------------+
|   READY STATE    |  <-- Can execute tools, read resources, etc.
+------------------+
       |
       | On disconnect or error
       v
+------------------+
|clearPendingReqs()|  <-- Reject all pending promises
+------------------+
       |
       v
+------------------+
|     close()      |  <-- Clean up transport
+------------------+
```

### Client Creation

```typescript
const client = createMcpClient({
  clientInfo: {
    name: "mcp-inspector",
    version: "2.0.0"
  },
  capabilities: {
    sampling: {},           // Enable sampling handler
    roots: { listChanged: true },  // Enable roots with change notifications
    experimental: {}        // Future extensions
  }
});
```

### Transport Creation

The transport abstracts the communication channel to the MCP server.

```typescript
// HTTP transport (direct connection)
const transport = createHttpTransport({
  url: "http://localhost:8080/mcp",
  headers: { "Authorization": "Bearer token" }
});

// STDIO transport (via proxy)
const transport = createProxyTransport({
  proxyUrl: "http://localhost:3000/mcp",
  serverId: "my-server"
});
```

### Initialize Handshake

Per MCP specification 2025-11-25, the client initiates with:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "sampling": {},
      "roots": { "listChanged": true }
    },
    "clientInfo": {
      "name": "mcp-inspector",
      "version": "2.0.0"
    }
  }
}
```

Server responds with its capabilities, then client sends `initialized` notification.

### Handler Setup

After successful initialization, register handlers for server-to-client requests:

```typescript
client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  // Handle sampling request
  return samplingHandler.handle(request);
});

client.setRequestHandler(ElicitRequestSchema, async (request) => {
  // Handle elicitation request
  return elicitationHandler.handle(request);
});
```

---

## Handler Coordination Flow

When a tool execution triggers a server-to-client request (sampling or elicitation), the following flow occurs:

```
tools/call request
       |
       v
+------------------+     CreateMessageRequest     +------------------+
|   MCP Server     | --------------------------> |   MCP Client     |
+------------------+                              +------------------+
                                                         |
                                                         v
                                             +------------------+
                                             | onSamplingRequest|
                                             |   (callback)     |
                                             +------------------+
                                                         |
                                                         v
                                             +------------------+
                                             | UI shows panel   |
                                             | User responds    |
                                             +------------------+
                                                         |
                                                         v
                                             +------------------+
                                             |resolveSampling() |
                                             +------------------+
                                                         |
       CreateMessageResult                               |
<--------------------------------------------------------+
       |
       v
tools/call completes
```

### Sampling Handler Interface

```typescript
interface SamplingHandler {
  // Called when server sends CreateMessageRequest
  onRequest(request: CreateMessageRequest): Promise<CreateMessageResult>;

  // UI calls this to resolve pending request
  resolve(requestId: string, result: CreateMessageResult): void;

  // UI calls this to reject (user cancelled)
  reject(requestId: string, reason: string): void;

  // Get all pending requests for UI display
  getPending(): PendingSamplingRequest[];
}
```

### Elicitation Handler Interface

```typescript
interface ElicitationHandler {
  // Called when server sends ElicitRequest
  onRequest(request: ElicitRequest): Promise<ElicitResult>;

  // UI calls this to resolve with user input
  resolve(requestId: string, result: ElicitResult): void;

  // UI calls this to reject (user cancelled)
  reject(requestId: string, reason: string): void;

  // Get all pending requests for UI display
  getPending(): PendingElicitRequest[];
}
```

### Request Lifecycle

1. **Server sends request** - CreateMessageRequest or ElicitRequest arrives
2. **Handler creates pending entry** - Stores request with unique ID
3. **UI is notified** - React state updates to show pending request
4. **User responds** - Fills form, clicks approve/reject
5. **Handler resolves** - Promise completes, response sent to server
6. **Cleanup** - Pending entry removed, UI updates

### Timeout Handling

If user does not respond within configured timeout:

```typescript
interface HandlerConfig {
  requestTimeout: number;  // Default: 300000ms (5 minutes)
  autoRejectOnTimeout: boolean;  // Default: true
  timeoutMessage: string;  // Default: "Request timed out waiting for user response"
}
```

---

## Notification Handling

MCP servers send notifications to inform clients of state changes. The client must handle these appropriately.

| Notification | Trigger | Client Action |
|--------------|---------|---------------|
| `notifications/tools/list_changed` | Server tools updated | Re-fetch `tools/list` |
| `notifications/resources/list_changed` | Server resources updated | Re-fetch `resources/list` |
| `notifications/prompts/list_changed` | Server prompts updated | Re-fetch `prompts/list` |
| `notifications/resources/updated` | Subscribed resource changed | Re-fetch specific resource |
| `notifications/progress` | Long-running operation | Update progress UI |
| `notifications/cancelled` | Request cancelled by server | Clean up pending state |
| `notifications/message` | Server log message | Append to logs panel |

### Notification Handler Setup

```typescript
// List change notifications - trigger refetch
client.setNotificationHandler(ToolsListChangedNotificationSchema, async () => {
  await refreshTools();
});

client.setNotificationHandler(ResourcesListChangedNotificationSchema, async () => {
  await refreshResources();
});

client.setNotificationHandler(PromptsListChangedNotificationSchema, async () => {
  await refreshPrompts();
});

// Resource subscription updates
client.setNotificationHandler(ResourceUpdatedNotificationSchema, async (notification) => {
  const { uri } = notification.params;
  await refreshResource(uri);
});

// Progress tracking
client.setNotificationHandler(ProgressNotificationSchema, async (notification) => {
  const { progressToken, progress, total } = notification.params;
  updateProgressUI(progressToken, progress, total);
});

// Server log messages
client.setNotificationHandler(LoggingMessageNotificationSchema, async (notification) => {
  const { level, logger, data } = notification.params;
  appendToLogs({ level, logger, data, timestamp: Date.now() });
});
```

### Resource Subscriptions

For resources that support subscriptions:

```typescript
// Subscribe to resource updates
await client.request({
  method: "resources/subscribe",
  params: { uri: "file:///config.json" }
});

// Unsubscribe when no longer needed
await client.request({
  method: "resources/unsubscribe",
  params: { uri: "file:///config.json" }
});
```

---

## Request Queue Management

All MCP requests are managed through a queue to ensure proper ordering and cancellation support.

```
+------------------+
|   Request Queue  |
+------------------+
| [pending]        |  <-- Waiting to execute
| [in_progress]    |  <-- Currently executing (max 1 for serial)
| [completed]      |  <-- Finished, in history
+------------------+
```

### Queue Entry Structure

```typescript
interface QueueEntry {
  id: string;                    // Unique request ID
  method: string;                // MCP method (tools/call, etc.)
  params: unknown;               // Request parameters
  status: "pending" | "in_progress" | "completed" | "cancelled" | "error";
  createdAt: number;             // Timestamp
  startedAt?: number;            // When execution began
  completedAt?: number;          // When execution finished
  result?: unknown;              // Success result
  error?: Error;                 // Error if failed
  promise: Promise<unknown>;     // Awaitable result
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}
```

### Queue Rules

1. **Serial execution** - Only one request executes at a time (default mode)
2. **FIFO ordering** - Requests execute in order of submission
3. **Cancellation** - Pending requests can be cancelled, in-progress cannot
4. **Timeout** - Each request has individual timeout, rejects promise on expiry
5. **Disconnect cleanup** - All pending/in-progress requests rejected on disconnect

### Queue Operations

```typescript
interface RequestQueue {
  // Add request to queue
  enqueue(method: string, params: unknown): Promise<unknown>;

  // Cancel pending request
  cancel(requestId: string): boolean;

  // Get queue status
  getStatus(): QueueStatus;

  // Clear all pending (on disconnect)
  clearPending(reason: string): void;

  // Get history for display
  getHistory(limit?: number): QueueEntry[];
}
```

### Queue Status

```typescript
interface QueueStatus {
  pending: number;      // Waiting to execute
  inProgress: number;   // Currently executing (0 or 1)
  completed: number;    // Finished successfully
  failed: number;       // Finished with error
  cancelled: number;    // User cancelled
}
```

---

## Error Recovery Strategies

Different error types require different recovery approaches.

| Error Type | Strategy | Details |
|------------|----------|---------|
| Connection timeout | Retry with backoff | 1s, 2s, 4s delays; max 3 attempts |
| Transport error | Attempt reconnect | Up to 3 reconnection attempts |
| Request timeout | Reject promise | Leave connection open, surface to user |
| Server error (-32xxx) | Pass to caller | MCP protocol error, let UI handle |
| Protocol error | Disconnect | Invalid message format, connection unusable |
| Network error | Retry or disconnect | Based on error type and retry count |

### Error Classification

```typescript
type ErrorCategory =
  | "connection"    // Failed to establish connection
  | "transport"     // Connection lost mid-session
  | "timeout"       // Request or connection timeout
  | "protocol"      // Invalid MCP message
  | "server"        // Server returned error response
  | "cancelled";    // User or system cancelled

interface ClassifiedError {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}
```

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;         // Default: 3
  backoffMs: number[];         // Default: [1000, 2000, 4000]
  retryableErrors: string[];   // Error codes that trigger retry
}

const defaultRetryableErrors = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND"
];
```

### Error Response Format

Errors surfaced to the UI follow a consistent format:

```typescript
interface InspectorError {
  code: string;                 // Machine-readable code
  message: string;              // Human-readable message
  category: ErrorCategory;      // Classification
  retryable: boolean;           // Can user retry?
  details?: {
    serverId?: string;
    serverName?: string;
    method?: string;
    elapsed?: number;
    originalError?: unknown;
  };
  helpUrl?: string;             // Link to documentation
}
```

### Error to Help URL Mapping

| Error Code | Help URL |
|------------|----------|
| `CONNECTION_TIMEOUT` | `/docs/errors/connection-timeout` |
| `CONNECTION_REFUSED` | `/docs/errors/connection-refused` |
| `INVALID_RESPONSE` | `/docs/errors/invalid-response` |
| `PROTOCOL_VERSION_MISMATCH` | `/docs/errors/protocol-version` |
| `AUTHENTICATION_FAILED` | `/docs/errors/authentication` |
| `RATE_LIMITED` | `/docs/errors/rate-limited` |

---

## Implementation Notes

### Core Package Exports

The `@modelcontextprotocol/inspector-core` package exports:

```typescript
// Client lifecycle
export { createMcpClient, connectClient, disconnectClient } from "./client";

// Transport factories
export { createHttpTransport, createProxyTransport } from "./transport";

// Handler interfaces
export type { SamplingHandler, ElicitationHandler } from "./handlers";

// Request queue
export { createRequestQueue } from "./queue";

// Types
export type {
  ConnectionState,
  ConnectionConfig,
  QueueEntry,
  QueueStatus,
  InspectorError
} from "./types";
```

### React Integration

The web client wraps core logic in React contexts:

```typescript
// Connection context provides state machine
const { state, connect, disconnect, error } = useConnection();

// Client context provides MCP operations
const { callTool, readResource, getPrompt } = useMcpClient();

// Handler context provides pending requests
const { pendingSampling, pendingElicitation } = useHandlers();
```

See [v2_ux.md](v2_ux.md) for UI component specifications that consume these contexts.
