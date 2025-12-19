# Inspector V2 UX Specification

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: Overview | [Features](v2_ux_features.md) | [Handlers](v2_ux_handlers.md) | [Screenshots](v2_screenshots.md)

---

## Table of Contents
  * [Design Principles](#design-principles)
  * [Navigation Model](#navigation-model)
  * [Screen Flows](#screen-flows)
    * [Server List (Home)](#server-list-home)
    * [Server Connection Card](#server-connection-card)
    * [Server Settings Modal](#server-settings-modal)
    * [Import server.json Modal](#import-serverjson-modal)
    * [Server Info (Connected)](#server-info-connected)
    * [OAuth Debugger](#oauth-debugger)
  * [MCP Protocol Coverage](#mcp-protocol-coverage)

**Additional UX Documentation:**
- [Feature Screens](v2_ux_features.md) - Tools, Resources, Prompts, Logging, Tasks, History
- [Handlers & Patterns](v2_ux_handlers.md) - Sampling, Elicitation, Roots, Form Generation, Error Handling
- [Visual Reference](v2_screenshots.md) - Screenshots from the Shadcn prototype

## Design Principles

- **Single server connection** - No multiple concurrent connections (defer to plugins)
- **MCPJam-inspired** - Use MCPJam Inspector as UX reference model
- **Full-width content** - Maximize screen real estate for each section
- **No sidebar** - Deferred until menu becomes cumbersome or extensions multiply
- **Progressive disclosure** - Show relevant information at each connection stage
- **Resizable panels** - Allow users to adjust panel sizes on feature screens

## Navigation Model

```
+-------------------------------------------------------------------------------------+
|  [Server Name v]  (*) Connected (23ms)  [Tools] [Resources] [Prompts] [Logs] [Tasks] [History] [Disconnect] |
+-------------------------------------------------------------------------------------+
|                                                                                     |
|                                   Full-width content                                |
|                                                                                     |
+-------------------------------------------------------------------------------------+
```

- **Menu bar** displays server name, connection status with latency, and disconnect button when connected
- **Top navigation** links to Tools, Resources, Prompts, Logs, Tasks, and History sections
- **Connection indicator** shows latency from periodic `ping` requests
- **No sidebar** - content areas use full width

## Screen Flows

### Server List (Home)

Initial screen shown when no server is connected. Displays server cards in a responsive grid (1-2 columns).

```
+---------------------------------------------------------+
|                    MCP Inspector                         |
|                                        [+ Add Server v]  |
+---------------------------------------------------------+
|                                                          |
|  +-------------------------+  +-------------------------+
|  | Server Card 1           |  | Server Card 2           |
|  | (see below)             |  | (see below)             |
|  +-------------------------+  +-------------------------+
|                                                          |
|  +-------------------------+                             |
|  | Server Card 3           |                             |
|  +-------------------------+                             |
|                                                          |
+---------------------------------------------------------+
```

**Add Server Options:**
- **Add manually** - Opens form modal for manual configuration
- **Import config** - Paste/upload internal `mcp.json` config
- **Import server.json** - Import MCP Registry format ([Issue #922](https://github.com/modelcontextprotocol/inspector/issues/922))

**Functionality:**
- List servers from `mcp.json` config file
- Add/edit/delete servers via CRUD endpoints on proxy
- Responsive grid layout (1 column mobile, 2 columns desktop)

### Server Connection Card

Each server in the list is displayed as a card with connection controls and status.

```
+-----------------------------------------------------------------+
| [Icon] Server Name                        v1.0.0                 |
|        STDIO  [Via Proxy v]               (*) Connected [Toggle] |
+-----------------------------------------------------------------+
| npx -y @modelcontextprotocol/server-everything            [Copy] |
+-----------------------------------------------------------------+
| [Server Info] [Settings] [Clone]                 [Edit] [Remove] |
+-----------------------------------------------------------------+
```

**Connection Mode Dropdown:**
- Quick access to switch between Direct and Via Proxy modes without opening Settings
- STDIO servers default to "Via Proxy" (required - cannot connect directly from browser)
- HTTP/SSE servers default to "Direct" (assumes CORS enabled)
- Shows warning text if STDIO + Direct selected: "(STDIO requires proxy)"

**With OAuth (shows OAuth Debug button):**
```
+-----------------------------------------------------------------+
| [Icon] Server Name                        v1.0.0                 |
|        HTTP  [Direct v]                   (*) Connected [Toggle] |
+-----------------------------------------------------------------+
| https://api.example.com/mcp                               [Copy] |
+-----------------------------------------------------------------+
| [Server Info] [Settings] [OAuth Debug] [Clone]   [Edit] [Remove] |
+-----------------------------------------------------------------+
```

**With Error State:**
```
+-----------------------------------------------------------------+
| [Icon] Server Name                        v1.0.0                 |
|        HTTP  [Direct v]                   (!) Failed (3) [Toggle] |
+-----------------------------------------------------------------+
| https://api.example.com/mcp                               [Copy] |
+-----------------------------------------------------------------+
| [Server Info] [Settings] [Clone]                 [Edit] [Remove] |
+-----------------------------------------------------------------+
| [!] Connection timeout after 20s                                 |
| [Show more]                        [View Troubleshooting Guide]  |
+-----------------------------------------------------------------+
```

**Status Indicators:**
| Status | Indicator | Display |
|--------|-----------|---------|
| Connected | Green dot | "Connected" |
| Connecting | Yellow pulsing dot | "Connecting..." |
| Failed | Red dot | "Failed (N)" with retry count |
| Disconnected | Gray dot | "Disconnected" |

**Card Actions:**
- **Toggle switch** - Connect/disconnect the server
- **Copy** - Copy command/URL to clipboard
- **Server Info** - Opens server info modal
- **Settings** - Opens server settings modal (see below)
- **OAuth Debug** - Opens OAuth debugger modal (visible when server uses OAuth)
- **Clone** - Duplicates server config for creating variants
- **Edit** - Opens edit server modal
- **Remove** - Deletes server (with confirmation)

### Server Settings Modal

Per-server configuration for connection behavior, headers, metadata, timeouts, and OAuth credentials.

```
+---------------------------------------------------------------------------+
| Server Settings: my-server                                            [x] |
+---------------------------------------------------------------------------+
|                                                                           |
| Connection Mode                                                           |
| +-----------------------------------------------------------------------+ |
| | Via Proxy                                                           v | |
| +-----------------------------------------------------------------------+ |
|   Direct - Connect directly to server (requires CORS support)             |
|   Via Proxy - Route through inspector proxy (required for STDIO)          |
|                                                                           |
| ---------------------------------------------------------------------------
|                                                                           |
| Custom Headers                                                            |
| +-----------------------------------------------------------------------+ |
| | Authorization      | Bearer sk-...                           [Remove]| |
| | X-Custom-Header    | custom-value                            [Remove]| |
| +-----------------------------------------------------------------------+ |
| [+ Add Header]                                                            |
|                                                                           |
| ---------------------------------------------------------------------------
|                                                                           |
| Request Metadata                                                          |
| Metadata sent with every MCP request to this server.                      |
| +-----------------------------------------------------------------------+ |
| | session_id         | abc123                                  [Remove]| |
| +-----------------------------------------------------------------------+ |
| [+ Add Metadata]                                                          |
|                                                                           |
| ---------------------------------------------------------------------------
|                                                                           |
| Timeouts                                                                  |
| +-----------------------------------+-----------------------------------+ |
| | Connection Timeout                | Request Timeout                   | |
| | +-----------------------------+   | +-----------------------------+   | |
| | | 30000                     ms|   | | 60000                     ms|   | |
| | +-----------------------------+   | +-----------------------------+   | |
| +-----------------------------------+-----------------------------------+ |
|                                                                           |
| ---------------------------------------------------------------------------
|                                                                           |
| OAuth Settings (for servers requiring authentication)                     |
| +-----------------------------------------------------------------------+ |
| | Client ID                                                             | |
| | +-------------------------------------------------------------------+ | |
| | | my-client-id                                                      | | |
| | +-------------------------------------------------------------------+ | |
| |                                                                       | |
| | Client Secret                                                         | |
| | +-------------------------------------------------------------------+ | |
| | | ********                                              [Show/Hide] | | |
| | +-------------------------------------------------------------------+ | |
| |                                                                       | |
| | Scopes                                                                | |
| | +-------------------------------------------------------------------+ | |
| | | read write profile                                                | | |
| | +-------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
|                                                 [Cancel]  [Save Settings] |
+---------------------------------------------------------------------------+
```

**Connection Mode:**
- **Direct** - Browser connects directly to server (requires server to have CORS headers)
- **Via Proxy** - Route through inspector proxy (required for STDIO transport, useful for CORS-restricted servers)

**Custom Headers:**
- Key-value pairs sent with every HTTP request to this server
- Useful for API keys, authorization tokens, custom routing

**Request Metadata:**
- Data included in `_meta` field of every MCP request
- Per-server isolation (previously stored globally in localStorage)

**Timeouts:**
- **Connection Timeout** - Max time to establish connection (ms)
- **Request Timeout** - Max time for individual requests (ms)

**OAuth Settings:**
- Pre-configure OAuth credentials for servers requiring authentication
- Client ID and Client Secret for OAuth 2.0 flows
- Scopes to request during authorization

**Clone Functionality:**
The [Clone] button on the server card creates a duplicate configuration, enabling:
- Testing same server with different headers/metadata
- Comparing behavior with different timeout settings
- Maintaining separate OAuth credentials for different environments

### Import server.json Modal

Support for importing MCP Registry `server.json` format for testing servers before publishing.

```
+-----------------------------------------------------------------------------+
| Import MCP Registry server.json                                         [x] |
+-----------------------------------------------------------------------------+
|                                                                             |
| Paste server.json content or drag and drop a file:                          |
| +-------------------------------------------------------------------------+ |
| | {                                                                       | |
| |   "$schema": "https://static.modelcontextprotocol.io/schemas/...",      | |
| |   "name": "io.github.user/my-server",                                   | |
| |   "description": "A sample MCP server",                                 | |
| |   "version": "1.0.0",                                                   | |
| |   "packages": [{                                                        | |
| |     "registryType": "npm",                                              | |
| |     "identifier": "my-mcp-server",                                      | |
| |     "runtimeHint": "npx",                                               | |
| |     "transport": { "type": "stdio" },                                   | |
| |     "environmentVariables": [                                           | |
| |       { "name": "API_KEY", "description": "API key", "required": true } | |
| |     ]                                                                   | |
| |   }]                                                                    | |
| | }                                                                       | |
| +-------------------------------------------------------------------------+ |
|                                                          [Browse...] [Clear]|
|                                                                             |
| --------------------------------------------------------------------------- |
|                                                                             |
| Validation Results:                                                         |
| +-------------------------------------------------------------------------+ |
| | [check] Schema validation passed                                        | |
| | [check] Package found: my-mcp-server (npm)                              | |
| | [warn] Environment variable API_KEY not set                             | |
| | [info] Runtime hint: npx                                                | |
| | [info] Transport: stdio                                                 | |
| +-------------------------------------------------------------------------+ |
|                                                                             |
| --------------------------------------------------------------------------- |
|                                                                             |
| Package Selection (if multiple packages):                                   |
| +-------------------------------------------------------------------------+ |
| | (*) npm: my-mcp-server (npx)                                            | |
| | ( ) pypi: my-mcp-server (uvx)                                           | |
| +-------------------------------------------------------------------------+ |
|                                                                             |
| Environment Variables:                                                      |
| +-------------------------------------------------------------------------+ |
| | API_KEY *                   Description: API key                        | |
| | +---------------------------------------------------------------------+ | |
| | | sk-...                                                              | | |
| | +---------------------------------------------------------------------+ | |
| |                                                                         | |
| | OPTIONAL_VAR                Description: Optional setting               | |
| | +---------------------------------------------------------------------+ | |
| | |                                                                     | | |
| | +---------------------------------------------------------------------+ | |
| +-------------------------------------------------------------------------+ |
|                                                                             |
| Server Name (optional override):                                            |
| +-------------------------------------------------------------------------+ |
| | my-server                                                               | |
| +-------------------------------------------------------------------------+ |
|                                                                             |
|                                    [Validate Again]  [Cancel]  [Add Server] |
+-----------------------------------------------------------------------------+
```

**Browse Button:**
- Opens native file picker to select a local `server.json` file
- Supports `.json` file filter
- Note: Registry browser may be added as future enhancement or plugin

**Schema Validation:**
- Validate against official MCP Registry schema
- Show validation errors inline with line numbers
- Highlight issues in the JSON editor

**Package Selection:**
- If server.json contains multiple packages (npm + pypi), let user choose which to use
- Display registry type, identifier, and runtime hint for each option

**Environment Variables:**
- Parse `environmentVariables` array from selected package
- Generate form fields for each variable
- Mark required variables with asterisk (*)
- Show description as helper text
- Validate required variables are filled before enabling "Add Server"

**Value Verification:**
- Check if package exists in registry (npm, pypi)
- Verify environment variables are set (or prompt user)
- For HTTP transport: optionally verify URL is reachable
- For STDIO: verify command is available (e.g., `npx` installed)

**Server Generation:**
- Convert server.json to internal config format
- Construct command from runtime hint + package identifier (e.g., `npx -y my-mcp-server`)
- Apply environment variables
- Set transport type from package.transport

**server.json to Internal Config Mapping:**
| server.json Field | Internal Config Field |
|-------------------|----------------------|
| `name` | `name` (display name) |
| `packages[n].registryType` | Determines command prefix |
| `packages[n].identifier` | Package name in command |
| `packages[n].runtimeHint` | Command prefix (npx, uvx, etc.) |
| `packages[n].transport.type` | `transportType` |
| `packages[n].environmentVariables` | `env` object |

**Use Cases:**
1. MCP authors testing server.json before publishing to registry
2. Developers importing servers from registry without manual setup
3. Configuration troubleshooting with detailed validation feedback

### Server Info (Connected)

Shown as a modal or dedicated screen after successful connection.

```
+---------------------------------------------------------+
|  Server Information                              [x]     |
+---------------------------------------------------------+
|                                                          |
|  Name:        everything-server                          |
|  Version:     1.0.0                                      |
|  Protocol:    2025-11-25                                 |
|  Transport:   stdio                                      |
|                                                          |
|  Server Capabilities          Client Capabilities        |
|  ---------------------        ---------------------      |
|  [check] Tools (4)            [check] Sampling           |
|  [check] Resources (12)       [check] Elicitation        |
|  [check] Prompts (2)          [check] Roots (3)          |
|  [check] Logging              [check] Tasks              |
|  [check] Completions                                     |
|  [check] Tasks                                           |
|  [x] Experimental                                        |
|                                                          |
|  Server Instructions                                     |
|  -------------------                                     |
|  "This server provides testing tools for MCP..."         |
|                                                          |
|  OAuth Details (if applicable)                           |
|  -------------                                           |
|  Auth URL:    https://auth.example.com                   |
|  Scopes:      read, write                                |
|  Access Token: eyJhbG... [Copy] [Decode JWT v]           |
|                                                          |
+---------------------------------------------------------+
```

**Functionality:**
- Display server metadata, version, and negotiated protocol version
- Show both **server** and **client** capabilities with counts
- Server capabilities: Tools, Resources, Prompts, Logging, Completions, Tasks, Experimental
- Client capabilities: Sampling, Elicitation, Roots, Tasks, Experimental
- Display server instructions if provided
- Show OAuth tokens with copy and JWT decode options

### OAuth Debugger

Accessed via [OAuth Debug] button on the server card (visible when server uses OAuth).

```
+---------------------------------------------------------------------------+
| OAuth Debugger: my-server                                             [x] |
+---------------------------------------------------------------------------+
|                                                                           |
| OAuth Flow Status                                                         |
| +-----------------------------------------------------------------------+ |
| | Step 1: Authorization Request                             [Completed] | |
| | +-------------------------------------------------------------------+ | |
| | | GET https://auth.example.com/authorize                            | | |
| | |   ?client_id=my-client-id                                         | | |
| | |   &redirect_uri=http://localhost:5173/callback                    | | |
| | |   &response_type=code                                             | | |
| | |   &scope=read%20write                                             | | |
| | |   &state=abc123                                                   | | |
| | +-------------------------------------------------------------------+ | |
| |                                                             [Copy URL] | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
| +-----------------------------------------------------------------------+ |
| | Step 2: Authorization Code                                [Completed] | |
| | +-------------------------------------------------------------------+ | |
| | | code: xyz789...                                                   | | |
| | | state: abc123 (verified)                                          | | |
| | +-------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
| +-----------------------------------------------------------------------+ |
| | Step 3: Token Exchange                                    [Completed] | |
| | +-------------------------------------------------------------------+ | |
| | | POST https://auth.example.com/token                               | | |
| | | grant_type=authorization_code&code=xyz789...                      | | |
| | +-------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
| +-----------------------------------------------------------------------+ |
| | Step 4: Access Token                                      [Active]    | |
| | +-------------------------------------------------------------------+ | |
| | | access_token: eyJhbG...                           [Copy] [Decode] | | |
| | | token_type: Bearer                                                | | |
| | | expires_in: 3600 (expires at 15:32:00)                            | | |
| | | scope: read write                                                 | | |
| | +-------------------------------------------------------------------+ | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
| +-----------------------------------------------------------------------+ |
| | Refresh Token                                                         | |
| | +-------------------------------------------------------------------+ | |
| | | refresh_token: def456...                                  [Copy]  | | |
| | +-------------------------------------------------------------------+ | |
| |                                                    [Test Refresh Now] | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
| ---------------------------------------------------------------------------
|                                                                           |
| Decoded Access Token (JWT)                                                |
| +-----------------------------------------------------------------------+ |
| | Header:                                                               | |
| |   { "alg": "RS256", "typ": "JWT" }                                   | |
| |                                                                       | |
| | Payload:                                                              | |
| |   {                                                                   | |
| |     "sub": "user123",                                                 | |
| |     "aud": "my-client-id",                                            | |
| |     "scope": "read write",                                            | |
| |     "exp": 1732990800,                                                | |
| |     "iat": 1732987200                                                 | |
| |   }                                                                   | |
| +-----------------------------------------------------------------------+ |
|                                                                           |
|                                          [Revoke Token]  [Start New Flow] |
+---------------------------------------------------------------------------+
```

**Features:**
- **Flow Visualization** - Step-by-step view of OAuth 2.0 flow
  - Authorization request URL with all parameters
  - Authorization code received
  - Token exchange request/response
  - Access token details
- **Token Display:**
  - Access token with copy and decode options
  - Token type and expiration time
  - Refresh token (if available)
  - Decoded JWT payload and header
- **Actions:**
  - [Test Refresh Now] - Manually trigger token refresh
  - [Revoke Token] - Revoke current access token
  - [Start New Flow] - Begin fresh OAuth flow
  - [Copy] - Copy tokens/URLs to clipboard
  - [Decode] - Show JWT contents

**Use Cases:**
1. Debugging OAuth configuration issues
2. Verifying token claims and scopes
3. Testing token refresh behavior
4. Understanding the full OAuth handshake

---

## MCP Protocol Coverage

This UX specification covers **100% of the MCP 2025-11-25 protocol specification**.

### Request Methods

| Method | UX Location |
|--------|-------------|
| `initialize` | Connection flow (implicit) |
| `ping` | Navigation bar latency display |
| `tools/list` | [Tools Screen](v2_ux_features.md#tools-screen) |
| `tools/call` | [Tools Screen](v2_ux_features.md#tools-screen) |
| `resources/list` | [Resources Screen](v2_ux_features.md#resources-screen) |
| `resources/templates/list` | [Resources Screen](v2_ux_features.md#resources-screen) (templates section) |
| `resources/read` | [Resources Screen](v2_ux_features.md#resources-screen) |
| `resources/subscribe` | [Resources Screen](v2_ux_features.md#resources-screen) |
| `resources/unsubscribe` | [Resources Screen](v2_ux_features.md#resources-screen) |
| `prompts/list` | [Prompts Screen](v2_ux_features.md#prompts-screen) |
| `prompts/get` | [Prompts Screen](v2_ux_features.md#prompts-screen) |
| `sampling/createMessage` | [Sampling Panel](v2_ux_handlers.md#sampling-panel) |
| `elicitation/create` | [Elicitation Handler](v2_ux_handlers.md#elicitation-handler) |
| `completion/complete` | [Tools](v2_ux_features.md#tools-screen)/[Prompts](v2_ux_features.md#prompts-screen) autocomplete |
| `logging/setLevel` | [Logging Screen](v2_ux_features.md#logging-screen) |
| `roots/list` | [Roots Configuration](v2_ux_handlers.md#roots-configuration) |
| `tasks/list` | [Tasks Screen](v2_ux_features.md#tasks-screen) |
| `tasks/get` | [Tasks Screen](v2_ux_features.md#tasks-screen) |
| `tasks/result` | [Tasks Screen](v2_ux_features.md#tasks-screen) |
| `tasks/cancel` | [Tasks Screen](v2_ux_features.md#tasks-screen) |

### Notification Methods

| Notification | UX Location |
|--------------|-------------|
| `notifications/initialized` | Connection flow (implicit) |
| `notifications/progress` | [Tools Screen](v2_ux_features.md#tools-screen) progress bar, [Tasks Screen](v2_ux_features.md#tasks-screen) |
| `notifications/cancelled` | [Tools Screen](v2_ux_features.md#tools-screen) cancel button |
| `notifications/message` | [Logging Screen](v2_ux_features.md#logging-screen) |
| `notifications/tools/list_changed` | [Tools Screen](v2_ux_features.md#tools-screen) indicator |
| `notifications/resources/list_changed` | [Resources Screen](v2_ux_features.md#resources-screen) indicator |
| `notifications/prompts/list_changed` | [Prompts Screen](v2_ux_features.md#prompts-screen) indicator |
| `notifications/resources/updated` | [Resources Screen](v2_ux_features.md#resources-screen) subscriptions |
| `notifications/roots/listChanged` | [Roots Configuration](v2_ux_handlers.md#roots-configuration) |
| `notifications/task/statusChanged` | [Tasks Screen](v2_ux_features.md#tasks-screen) |
| `notifications/elicitation/complete` | [Elicitation Handler](v2_ux_handlers.md#elicitation-handler) (URL mode) |

### Capabilities

| Capability | Type | UX Location |
|------------|------|-------------|
| `tools` | Server | [Tools Screen](v2_ux_features.md#tools-screen), Server Info |
| `resources` | Server | [Resources Screen](v2_ux_features.md#resources-screen), Server Info |
| `prompts` | Server | [Prompts Screen](v2_ux_features.md#prompts-screen), Server Info |
| `logging` | Server | [Logging Screen](v2_ux_features.md#logging-screen), Server Info |
| `completions` | Server | Forms autocomplete, Server Info |
| `tasks` | Server | [Tasks Screen](v2_ux_features.md#tasks-screen), Server Info |
| `experimental` | Server | [Experimental Features Panel](v2_ux_handlers.md#experimental-features-panel), Server Info |
| `sampling` | Client | [Sampling Panel](v2_ux_handlers.md#sampling-panel), Server Info |
| `elicitation` | Client | [Elicitation Handler](v2_ux_handlers.md#elicitation-handler), Server Info |
| `roots` | Client | [Roots Configuration](v2_ux_handlers.md#roots-configuration), Server Info |
| `tasks` | Client | [Tasks Screen](v2_ux_features.md#tasks-screen), Server Info |
| `experimental` | Client | [Experimental Features Panel](v2_ux_handlers.md#experimental-features-panel), Server Info |

### Content Types

| Content Type | UX Location |
|--------------|-------------|
| Text | All screens (default) |
| Image (base64) | [Tools](v2_ux_features.md#tools-screen) results, [Prompts](v2_ux_features.md#prompts-screen) messages, [Resources](v2_ux_features.md#resources-screen) |
| Audio (base64) | [Tools](v2_ux_features.md#tools-screen) results, [Prompts](v2_ux_features.md#prompts-screen) messages, [Resources](v2_ux_features.md#resources-screen) |
| Resource links | [Tools](v2_ux_features.md#tools-screen) results, embedded display |
| Embedded resources | [Prompts](v2_ux_features.md#prompts-screen) messages |

### Annotations

| Annotation | UX Location |
|------------|-------------|
| Tool audience | [Tools Screen](v2_ux_features.md#tools-screen) badges |
| Tool hints | [Tools Screen](v2_ux_features.md#tools-screen) description |
| Tool readOnly | [Tools Screen](v2_ux_features.md#tools-screen) indicator |
| Tool destructive | [Tools Screen](v2_ux_features.md#tools-screen) warning |
| Resource audience | [Resources Screen](v2_ux_features.md#resources-screen) badges |
| Resource priority | [Resources Screen](v2_ux_features.md#resources-screen) indicator |
