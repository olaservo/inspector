# Inspector V2 Proxy Specification

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: [Overview](v2_ux.md) | [Features](v2_ux_features.md) | [Handlers](v2_ux_handlers.md) | [Screenshots](v2_screenshots.md)
### Implementation: [Logic](v2_logic.md) | Proxy

## Table of Contents
  * [Architecture Overview](#architecture-overview)
  * [API Endpoints](#api-endpoints)
  * [Configuration File Format](#configuration-file-format)
  * [Transport Abstraction](#transport-abstraction)
  * [Logging Format](#logging-format)
  * [Security Model](#security-model)
  * [Error Response Format](#error-response-format)

---

## Architecture Overview

The proxy server bridges the web client to MCP servers, handling transport differences and providing configuration management.

```
+----------------------------+     +----------------------------+
|      Web Client            |     |      Proxy Server          |
|  (localhost:5173)          |     |    (localhost:3000)        |
+----------------------------+     +----------------------------+
|                            |     |                            |
| +------------------------+ |     | +------------------------+ |
| |    React UI            | |     | |    Hono Routes         | |
| +------------------------+ |     | +------------------------+ |
|           |                |     |      |     |     |        |
|           v                |     |      v     v     v        |
| +------------------------+ | GET | +------+ +------+ +-----+ |
| |  ServerConfigContext   | |---->|config | |history| |logs | |
| +------------------------+ | POST| +------+ +------+ +-----+ |
|           |                |     |      |                    |
|           v                |     |      v                    |
| +------------------------+ |     | +------------------------+ |
| |   MCP HTTP Transport   | | POST| |  Transport Wrapper     | |
| +------------------------+ |---->|  - HTTP passthrough      | |
|                            | /mcp|  - STDIO spawn           | |
+----------------------------+     |  - SSE bridge            | |
                                   | +------------------------+ |
                                   |      |                    |
                                   |      v                    |
                                   | +------------------------+ |
                                   | |    MCP Server          | |
                                   | +------------------------+ |
                                   +----------------------------+
```

### Why a Proxy?

The proxy server is required for:

1. **STDIO Transport** - Browser cannot spawn local processes; proxy manages child processes
2. **CORS Restrictions** - Some MCP servers don't support CORS; proxy acts as same-origin intermediary
3. **Configuration Persistence** - Stores server configs in `mcp.json` file
4. **History/Logging** - Centralized logging with Pino for request/response history
5. **OAuth Callbacks** - Handles OAuth redirect flow for authenticated servers

### Direct vs Proxy Connection

| Mode | When Used | Flow |
|------|-----------|------|
| Direct | Streamable HTTP servers with CORS support | Client -> MCP Server |
| Proxy | STDIO servers, non-CORS servers | Client -> Proxy -> MCP Server |

---

## API Endpoints

All endpoints are served by Hono on the proxy server (default port 3000).

### Health Endpoint

#### `GET /health`

Health check endpoint. Does not require session token.

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600
}
```

### Configuration Endpoints

#### `GET /config`

Returns all server configurations.

**Response:**
```json
{
  "servers": [
    {
      "id": "abc123",
      "name": "everything-server",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {},
      "headers": {},
      "connectionMode": "proxy",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### `POST /config`

Create a new server configuration.

**Request:**
```json
{
  "name": "my-server",
  "transport": "streamableHttp",
  "url": "http://localhost:8080/mcp",
  "headers": { "Authorization": "Bearer token" }
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "name": "my-server",
  "transport": "streamableHttp",
  "url": "http://localhost:8080/mcp",
  "headers": { "Authorization": "Bearer token" },
  "connectionMode": "direct",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### `PUT /config/:id`

Update an existing server configuration.

**Request:** Same schema as POST (partial update supported)

**Response:** Updated server configuration

#### `DELETE /config/:id`

Delete a server configuration.

**Response:** `204 No Content`

### MCP Proxy Endpoint

#### `POST /mcp`

Forward MCP request to specified server.

**Query Parameters:**
- `serverId` (required) - Server configuration ID

**Request Body:** Any valid MCP JSON-RPC request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response Body:** MCP JSON-RPC response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "Echo a message back",
        "inputSchema": { "type": "object", "properties": { "message": { "type": "string" } } }
      }
    ]
  }
}
```

### History Endpoint

#### `GET /api/history`

Query MCP request/response history.

**Query Parameters:**
- `method` - Filter by MCP method (tools/call, resources/read, etc.)
- `serverId` - Filter by server ID
- `limit` - Max entries (default: 100)
- `offset` - Pagination offset
- `since` - Unix timestamp (ms) for time-based filtering

**Response:**
```json
{
  "entries": [
    {
      "id": "req-123",
      "timestamp": 1732987200000,
      "method": "tools/call",
      "params": { "name": "echo", "arguments": { "message": "hello" } },
      "result": { "content": [{ "type": "text", "text": "hello" }] },
      "duration": 45,
      "serverId": "abc123",
      "success": true
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### Logs Endpoint

#### `GET /api/logs`

Query application logs.

**Query Parameters:**
- `level` - Minimum log level (debug, info, warn, error)
- `limit` - Max entries (default: 100)
- `since` - Unix timestamp (ms) filter

**Response:**
```json
{
  "entries": [
    {
      "timestamp": 1732987200000,
      "level": "info",
      "message": "Server connected",
      "data": { "serverId": "abc123", "transport": "stdio" }
    }
  ],
  "total": 500,
  "limit": 100
}
```

### OAuth Endpoints

#### `GET /oauth/authorize/:serverId`

Initiate OAuth flow for a server. Redirects to the authorization server.

**Path Parameters:**
- `serverId` - Server configuration ID

**Query Parameters:**
- `redirect_uri` - Optional custom redirect URI (must be localhost)

**Response:** 302 redirect to authorization server

#### `GET /oauth/callback`

OAuth callback endpoint. Receives authorization code and exchanges for tokens.

**Query Parameters:**
- `code` - Authorization code from OAuth server
- `state` - State parameter (contains serverId and CSRF token)
- `error` - Error code if authorization failed
- `error_description` - Human-readable error description

**Response (Success):**
```json
{
  "success": true,
  "serverId": "abc123",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "scope": "read write"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "access_denied",
  "errorDescription": "User denied the authorization request"
}
```

#### `POST /oauth/refresh/:serverId`

Manually refresh OAuth tokens for a server.

**Path Parameters:**
- `serverId` - Server configuration ID

**Response:**
```json
{
  "success": true,
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "expiresAt": "2024-01-15T11:00:00Z"
}
```

#### `DELETE /oauth/token/:serverId`

Revoke OAuth tokens for a server.

**Path Parameters:**
- `serverId` - Server configuration ID

**Response:** `204 No Content`

---

## Configuration File Format

Server configurations are stored in `mcp.json` in the working directory.

### Schema

```json
{
  "$schema": "https://inspector.modelcontextprotocol.io/schemas/mcp-config.json",
  "version": "2.0",
  "servers": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "value"
      },
      "connectionMode": "proxy",
      "timeouts": {
        "connection": 30000,
        "request": 60000
      }
    },
    {
      "id": "another-id",
      "name": "Streamable HTTP Server",
      "transport": "streamableHttp",
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer token"
      },
      "connectionMode": "direct",
      "oauth": {
        "clientId": "my-client",
        "clientSecret": "secret",
        "authorizationUrl": "https://auth.example.com/authorize",
        "tokenUrl": "https://auth.example.com/token",
        "scopes": ["read", "write"]
      }
    }
  ],
  "preferences": {
    "theme": "dark",
    "defaultTransport": "streamableHttp"
  }
}
```

### Server Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) |
| `name` | string | Yes | Display name |
| `transport` | enum | Yes | `stdio`, `streamableHttp`, or `sse` |
| `command` | string | STDIO only | Executable command |
| `args` | string[] | STDIO only | Command arguments |
| `url` | string | streamableHttp/SSE only | Server URL |
| `env` | object | No | Environment variables |
| `headers` | object | No | HTTP headers |
| `connectionMode` | enum | No | `direct` or `proxy` (default: auto-detect) |
| `timeouts` | object | No | Custom timeout values |
| `oauth` | object | No | OAuth configuration |
| `createdAt` | string | Auto | ISO timestamp |
| `updatedAt` | string | Auto | ISO timestamp |

### Transport-Specific Requirements

**STDIO Transport:**
```json
{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"],
  "env": { "DEBUG": "mcp:*" },
  "connectionMode": "proxy"
}
```

**Streamable HTTP Transport:**
```json
{
  "transport": "streamableHttp",
  "url": "http://localhost:8080/mcp",
  "headers": { "X-API-Key": "secret" },
  "connectionMode": "direct"
}
```

**SSE Transport:**
```json
{
  "transport": "sse",
  "url": "http://localhost:8080/sse",
  "connectionMode": "proxy"
}
```

---

## Transport Abstraction

The proxy wraps different transports behind a unified interface.

### Streamable HTTP Transport (Passthrough)

For Streamable HTTP-based MCP servers, the proxy forwards requests directly.

```
Client Request --> Proxy --> Target Server --> Proxy --> Client Response
```

**Implementation:**
```typescript
async function handleHttpTransport(
  request: McpRequest,
  config: ServerConfig
): Promise<McpResponse> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers
    },
    body: JSON.stringify(request)
  });
  return response.json();
}
```

### STDIO Transport (Spawn)

For STDIO-based servers, the proxy spawns and manages child processes.

```
Client Request --> Proxy --> Spawn Process --> STDIO stdin/stdout --> Proxy --> Client Response
```

**Process Management:**
- Spawn process on first request to server
- Keep alive for subsequent requests (connection pooling)
- Kill after idle timeout (default: 5 minutes)
- Handle process exit/crash with error propagation
- Restart on next request if process died

**Implementation:**
```typescript
interface StdioProcess {
  process: ChildProcess;
  stdin: Writable;
  stdout: Readable;
  lastActivity: number;
  pendingRequests: Map<string | number, PendingRequest>;
}

const processes = new Map<string, StdioProcess>();

async function handleStdioTransport(
  request: McpRequest,
  config: ServerConfig
): Promise<McpResponse> {
  let proc = processes.get(config.id);

  if (!proc || proc.process.killed) {
    proc = await spawnProcess(config);
    processes.set(config.id, proc);
  }

  proc.lastActivity = Date.now();
  return sendRequest(proc, request);
}
```

### SSE Transport (Bridge)

For SSE-based servers, the proxy maintains persistent connections.

```
Client Request --> Proxy --> SSE Connection --> EventSource --> Proxy --> Client Response
```

**Connection Management:**
- Establish SSE connection on first request
- Maintain connection for subsequent requests
- Reconnect automatically on disconnect
- Convert SSE events to HTTP responses for client

**Implementation:**
```typescript
interface SseConnection {
  eventSource: EventSource;
  lastActivity: number;
  pendingRequests: Map<string | number, PendingRequest>;
}

const connections = new Map<string, SseConnection>();

async function handleSseTransport(
  request: McpRequest,
  config: ServerConfig
): Promise<McpResponse> {
  let conn = connections.get(config.id);

  if (!conn || conn.eventSource.readyState === EventSource.CLOSED) {
    conn = await establishSseConnection(config);
    connections.set(config.id, conn);
  }

  conn.lastActivity = Date.now();
  return sendSseRequest(conn, request);
}
```

### Idle Cleanup

A background task cleans up idle connections:

```typescript
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();

  for (const [id, proc] of processes) {
    if (now - proc.lastActivity > IDLE_TIMEOUT) {
      proc.process.kill();
      processes.delete(id);
    }
  }

  for (const [id, conn] of connections) {
    if (now - conn.lastActivity > IDLE_TIMEOUT) {
      conn.eventSource.close();
      connections.delete(id);
    }
  }
}, 60000); // Check every minute
```

---

## Logging Format

All logging uses Pino with NDJSON format for machine-readable history.

### Log Entry Types

**MCP Request:**
```json
{
  "ts": 1732987200000,
  "level": "info",
  "type": "mcp_request",
  "method": "tools/call",
  "target": "echo",
  "params": { "message": "hello" },
  "requestId": "abc123",
  "serverId": "my-server"
}
```

**MCP Response:**
```json
{
  "ts": 1732987200045,
  "level": "info",
  "type": "mcp_response",
  "requestId": "abc123",
  "result": { "content": [{ "type": "text", "text": "hello" }] },
  "duration": 45,
  "success": true
}
```

**MCP Error:**
```json
{
  "ts": 1732987200050,
  "level": "error",
  "type": "mcp_response",
  "requestId": "abc123",
  "error": {
    "code": -32600,
    "message": "Invalid request"
  },
  "duration": 50,
  "success": false
}
```

**Application Log:**
```json
{
  "ts": 1732987200000,
  "level": "info",
  "type": "app",
  "message": "Server process started",
  "data": { "serverId": "abc123", "pid": 12345 }
}
```

### Log Field Schema

| Field | Type | Description |
|-------|------|-------------|
| `ts` | number | Unix timestamp (ms) |
| `level` | string | Log level (debug, info, warn, error) |
| `type` | string | `mcp_request`, `mcp_response`, or `app` |
| `method` | string | MCP method name |
| `target` | string | Tool name, resource URI, or prompt name |
| `params` | object | Request parameters |
| `requestId` | string | Correlation ID linking request to response |
| `serverId` | string | Server configuration ID |
| `result` | object | Response data (success) |
| `error` | object | Error details (failure) |
| `duration` | number | Response time in ms |
| `success` | boolean | Operation succeeded |
| `message` | string | Human-readable log message |
| `data` | object | Additional context data |

### Pino Configuration

```typescript
import pino from "pino";
import pinoPretty from "pino-pretty";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty" }
    : undefined,
  base: { pid: false, hostname: false }
});

// MCP request/response logging
function logMcpRequest(serverId: string, method: string, params: unknown, requestId: string) {
  logger.info({
    type: "mcp_request",
    method,
    target: extractTarget(method, params),
    params,
    requestId,
    serverId
  });
}

function logMcpResponse(requestId: string, result: unknown, duration: number, success: boolean) {
  logger.info({
    type: "mcp_response",
    requestId,
    result: success ? result : undefined,
    error: success ? undefined : result,
    duration,
    success
  });
}
```

---

## Security Model

The proxy implements multiple security measures for local-only operation.

| Requirement | Implementation |
|-------------|----------------|
| Localhost only | Bind to 127.0.0.1, reject external connections |
| Session tokens | Generate UUID on startup, require in X-Session-Token header |
| CORS | Allow localhost:5173 (client dev server) and localhost:3000 |
| Secret masking | Redact Authorization headers and sensitive env vars in logs |
| Redirect validation | Whitelist localhost URLs for OAuth callbacks |
| Path traversal | Validate all file paths are within allowed directories |

### Localhost Binding

```typescript
const server = Hono();

// Only bind to localhost
server.listen(3000, "127.0.0.1");
```

### Session Token

```typescript
const SESSION_TOKEN = crypto.randomUUID();

server.use("*", async (c, next) => {
  // Skip token check for health endpoint
  if (c.req.path === "/health") return next();

  const token = c.req.header("X-Session-Token");
  if (token !== SESSION_TOKEN) {
    return c.json({ error: "Invalid session token" }, 401);
  }
  return next();
});

// Token printed to console on startup
console.log(`Session token: ${SESSION_TOKEN}`);
```

### CORS Configuration

```typescript
import { cors } from "hono/cors";

server.use("*", cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "X-Session-Token"],
  credentials: true
}));
```

### Secret Masking

```typescript
const SENSITIVE_HEADERS = ["authorization", "x-api-key", "cookie"];
const SENSITIVE_ENV = ["api_key", "secret", "token", "password"];

function maskSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...obj };

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey) ||
        SENSITIVE_ENV.some(s => lowerKey.includes(s))) {
      masked[key] = "[REDACTED]";
    }
  }

  return masked;
}
```

### OAuth Redirect Validation

```typescript
const ALLOWED_REDIRECT_HOSTS = ["localhost", "127.0.0.1"];

function validateRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return ALLOWED_REDIRECT_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
```

---

## Error Response Format

All API errors follow a consistent format with optional help URLs.

### Error Structure

```typescript
interface ProxyError {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable description
    details?: {
      serverId?: string;
      serverName?: string;
      method?: string;
      elapsed?: number;
      originalError?: unknown;
    };
    helpUrl?: string;       // Link to documentation
  };
}
```

### Example Errors

**Connection Timeout:**
```json
{
  "error": {
    "code": "CONNECTION_TIMEOUT",
    "message": "Connection to server timed out after 30s",
    "details": {
      "serverId": "abc123",
      "serverName": "my-server",
      "elapsed": 30000
    },
    "helpUrl": "https://modelcontextprotocol.io/inspector/errors/connection-timeout"
  }
}
```

**Server Not Found:**
```json
{
  "error": {
    "code": "SERVER_NOT_FOUND",
    "message": "No server configuration found with ID 'xyz789'",
    "details": {
      "serverId": "xyz789"
    },
    "helpUrl": "https://modelcontextprotocol.io/inspector/errors/server-not-found"
  }
}
```

**Process Spawn Failed:**
```json
{
  "error": {
    "code": "SPAWN_FAILED",
    "message": "Failed to spawn server process: command not found",
    "details": {
      "serverId": "abc123",
      "command": "nonexistent-command",
      "originalError": "ENOENT"
    },
    "helpUrl": "https://modelcontextprotocol.io/inspector/errors/spawn-failed"
  }
}
```

### Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SERVER_NOT_FOUND` | 404 | Server configuration does not exist |
| `CONNECTION_TIMEOUT` | 504 | Connection attempt exceeded timeout |
| `CONNECTION_REFUSED` | 502 | Server actively refused connection |
| `SPAWN_FAILED` | 500 | Failed to start STDIO process |
| `PROCESS_CRASHED` | 500 | Server process exited unexpectedly |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_CONFIG` | 400 | Invalid server configuration |
| `SESSION_INVALID` | 401 | Missing or invalid session token |
| `TRANSPORT_ERROR` | 502 | Communication error with server |
| `PROTOCOL_ERROR` | 502 | Invalid MCP response from server |

---

## Implementation Notes

### Startup Sequence

1. Load `mcp.json` configuration file
2. Generate session token
3. Initialize Pino logger
4. Set up Hono routes
5. Bind to localhost:3000
6. Print session token and ready message

### Graceful Shutdown

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down...");

  // Kill all STDIO processes
  for (const proc of processes.values()) {
    proc.process.kill();
  }

  // Close all SSE connections
  for (const conn of connections.values()) {
    conn.eventSource.close();
  }

  // Flush logs
  await logger.flush();

  process.exit(0);
});
```

### Dependencies

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "pino": "^8.0.0",
    "pino-pretty": "^10.0.0",
    "uuid": "^9.0.0"
  }
}
```

See [v2_tech_stack.md](v2_tech_stack.md) for technology selection rationale.
