# Inspector V2 UX - Handlers & Patterns

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: [Overview](v2_ux.md) | [Features](v2_ux_features.md) | Handlers | [Screenshots](v2_screenshots.md)
### Implementation: [Logic](v2_logic.md) | [Proxy](v2_proxy.md)

---

## Table of Contents
  * [Client Feature Handlers](#client-feature-handlers)
    * [Sampling Panel](#sampling-panel)
    * [Elicitation Handler](#elicitation-handler)
    * [Roots Configuration](#roots-configuration)
    * [Experimental Features Panel](#experimental-features-panel)
  * [Form Generation](#form-generation)
  * [Error Handling UX](#error-handling-ux)

## Client Feature Handlers

These are modals/panels that appear when the server invokes client capabilities.

### Sampling Panel

When server sends `sampling/createMessage` request:

```
+-------------------------------------------------------------------------+
| Sampling Request                                                    [x] |
+-------------------------------------------------------------------------+
|                                                                         |
| The server is requesting an LLM completion.                             |
|                                                                         |
| Messages:                                                               |
| +---------------------------------------------------------------------+ |
| | [0] role: user                                                      | |
| |     "Analyze this data and provide insights about the trends..."    | |
| |                                                                     | |
| | [1] role: user                                                      | |
| |     [Image: data_chart.png - Click to preview]                      | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Model Preferences:                                                      |
| +---------------------------------------------------------------------+ |
| | Hints: ["claude-3-sonnet", "gpt-4"]                                 | |
| | Cost Priority: low (0.2)                                            | |
| | Speed Priority: medium (0.5)                                        | |
| | Intelligence Priority: high (0.8)                                   | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Parameters:                                                             |
|   Max Tokens: 1000                                                      |
|   Stop Sequences: ["\n\n", "END"]                                       |
|   Temperature: (not specified)                                          |
|                                                                         |
| Include Context: [x] thisServer                                         |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Response (enter mock response or connect to LLM):                       |
| +---------------------------------------------------------------------+ |
| | Based on the data chart, I can see several key trends:              | |
| |                                                                     | |
| | 1. Revenue has increased 25% quarter-over-quarter                   | |
| | 2. User engagement peaks on Tuesdays...                             | |
| |                                                                     | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Model Used: ________________    Stop Reason: [end_turn v]               |
|                                                                         |
|                                      [Reject Request]  [Send Response]  |
+-------------------------------------------------------------------------+
```

**Features:**
- Display full sampling request details:
  - Messages with text, image, and audio content
  - Model hints and preferences
  - Max tokens, stop sequences, temperature
  - Context inclusion settings
- **Editable response field** for mock LLM testing
- Model and stop reason fields for response
- **Approve/Reject** with human-in-the-loop
- Image/audio preview in messages
- Option to integrate with real LLM (deferred to plugins)

### Elicitation Handler

When server sends `elicitation/create` request:

**Form Mode:**

```
+-------------------------------------------------------------------------+
| Server Request: User Input Required                                 [x] |
+-------------------------------------------------------------------------+
|                                                                         |
| "Please provide your database connection details to proceed."           |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Host *                                                                  |
| +---------------------------------------------------------------------+ |
| | localhost                                                           | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Port *                                                                  |
| +---------------------------------------------------------------------+ |
| | 5432                                                                | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Database                                                                |
| +---------------------------------------------------------------------+ |
| | myapp_production                                                    | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| SSL Mode                                                                |
| +---------------------------------------------------------------------+ |
| | require                                                           v | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| WARNING: Only provide information you trust this server with.           |
|    The server "{server_name}" is requesting this data.                  |
|                                                                         |
|                                              [Cancel]  [Submit]         |
+-------------------------------------------------------------------------+
```

**URL Mode:**

```
+-------------------------------------------------------------------------+
| Server Request: External Action Required                            [x] |
+-------------------------------------------------------------------------+
|                                                                         |
| "Please complete the OAuth authorization in your browser."              |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| The server is requesting you visit:                                     |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | https://auth.example.com/oauth/authorize?client_id=abc&state=xyz    | |
| +---------------------------------------------------------------------+ |
|                                                            [Copy URL]   |
|                                                                         |
|                           [Open in Browser]                             |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Status: Waiting for completion...                        (spinning)     |
|                                                                         |
| Elicitation ID: abc123-def456                                           |
|                                                                         |
| WARNING: This will open an external URL. Verify the domain before       |
| proceeding.                                                             |
|                                                                         |
|                                              [Cancel]                   |
+-------------------------------------------------------------------------+
```

**Features:**
- **Form Mode:**
  - Generate form from JSON Schema in request
  - Validate input before submission
  - Required field indicators
  - Security warning with server name
  - Submit returns response to server
- **URL Mode:**
  - Display URL for user to visit
  - Copy URL button
  - Open in browser button
  - Waiting indicator until `notifications/elicitation/complete` received
  - Elicitation ID display
  - Domain verification warning
- **Cancel** sends declined response

### Roots Configuration

Accessed via Settings or Server Info panel:

```
+-------------------------------------------------------------------------+
| Roots Configuration                                                     |
+-------------------------------------------------------------------------+
|                                                                         |
| Filesystem roots exposed to the connected server:                       |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | Name          URI                                          Actions  | |
| +---------------------------------------------------------------------+ |
| | Project       file:///home/user/myproject               [Remove]    | |
| +---------------------------------------------------------------------+ |
| | Documents     file:///home/user/Documents               [Remove]    | |
| +---------------------------------------------------------------------+ |
| | Config        file:///etc/myapp                         [Remove]    | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| [+ Add Root]                                                            |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Add New Root:                                                           |
|                                                                         |
| Name:                                                                   |
| +---------------------------------------------------------------------+ |
| | Downloads                                                           | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Path:                                                                   |
| +---------------------------------------------------------------------+ |
| | /home/user/Downloads                                                | |
| +---------------------------------------------------------------------+ |
|                                                        [Browse] [Add]   |
|                                                                         |
| WARNING: Roots give the server access to these directories.             |
| Only add directories you trust the server to access.                    |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Features:**
- List configured roots with name and URI
- Add new roots:
  - Name field
  - Path field with browse button
- Remove roots
- **Sends `notifications/roots/listChanged`** when roots are modified
- Responds to `roots/list` requests from server
- Security warning about filesystem access

### Experimental Features Panel

Accessed via Settings or dedicated nav item:

```
+-------------------------------------------------------------------------+
| Experimental Features & Advanced Testing                                |
+-------------------------------------------------------------------------+
|                                                                         |
| WARNING: These features are non-standard and may change or be removed.  |
|                                                                         |
| Server Experimental Capabilities:                                       |
| +---------------------------------------------------------------------+ |
| | custom_analytics                                                    | |
| |   Description: Custom analytics tracking                            | |
| |   Methods: analytics/track, analytics/query                         | |
| |                                                            [Test ->] | |
| +---------------------------------------------------------------------+ |
| | streaming_v2                                                        | |
| |   Description: Enhanced streaming support                           | |
| |   Methods: stream/start, stream/stop, stream/data                   | |
| |                                                            [Test ->] | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Client Experimental Capabilities (advertised to server):                |
| +---------------------------------------------------------------------+ |
| | [ ] custom_analytics                                                | |
| | [ ] streaming_v2                                                    | |
| | [ ] Add custom capability...                                        | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Advanced JSON-RPC Tester                                                |
| Send raw JSON-RPC requests to test ANY method (standard or experimental)|
|                                                                         |
| Custom Headers (optional):                                              |
| +---------------------------------------------------------------------+ |
| | X-Debug-Mode         | true                              [Remove]   | |
| | X-Request-ID         | test-123                          [Remove]   | |
| +---------------------------------------------------------------------+ |
| [+ Add Header]                                                          |
|                                                                         |
| Request:                                                                |
| +---------------------------------------------------------------------+ |
| | {                                                                   | |
| |   "jsonrpc": "2.0",                                                 | |
| |   "id": 1,                                                          | |
| |   "method": "tools/call",                                           | |
| |   "params": {                                                       | |
| |     "name": "echo",                                                 | |
| |     "arguments": { "message": "test" },                             | |
| |     "_meta": { "progressToken": "abc123" }                          | |
| |   }                                                                 | |
| | }                                                                   | |
| +---------------------------------------------------------------------+ |
|                       [Load from History v]  [Send Request]             |
|                                                                         |
| Response:                                                               |
| +---------------------------------------------------------------------+ |
| | {                                                                   | |
| |   "jsonrpc": "2.0",                                                 | |
| |   "id": 1,                                                          | |
| |   "result": {                                                       | |
| |     "content": [{ "type": "text", "text": "test" }]                 | |
| |   }                                                                 | |
| | }                                                                   | |
| +---------------------------------------------------------------------+ |
|                                                              [Copy]     |
|                                                                         |
| Request History:                                                        |
|   14:32:05 - tools/call (success) 45ms                                  |
|   14:31:22 - resources/list (success) 12ms                              |
|   14:30:01 - experimental/myMethod (error) 200ms                        |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Features:**
- Display server's experimental capabilities from initialization
- Toggle client experimental capabilities to advertise
- Add custom client experimental capabilities
- **Advanced JSON-RPC Tester:**
  - Test ANY JSON-RPC method (not just experimental)
  - **Custom headers** for per-request header injection
  - JSON editor with syntax highlighting
  - Full control over `_meta` and `progressToken` fields
  - [Load from History] to replay previous requests
  - Response display with copy button
  - Request history with method, status, and duration
- **Use Cases:**
  - Testing server behavior with invalid parameters
  - Debugging SDK message formatting (see full request/response)
  - Verifying `_meta`/`progressToken` handling
  - Testing experimental methods before SDK support
  - Comparing behavior across different servers

## Form Generation

Forms are dynamically generated from JSON Schema for tool inputs, prompt arguments, and resource template variables.

**Supported Field Types:**
| JSON Schema Type | Form Control |
|------------------|--------------|
| `string` | Text input |
| `string` (enum) | Select dropdown |
| `string` (enum with `oneOf`) | Select dropdown with titles |
| `array` (enum items with `anyOf`) | Multi-select dropdown or checkboxes |
| `string` (format: uri) | URL input with validation |
| `number` / `integer` | Number input |
| `boolean` | Checkbox or toggle |
| `array` | Dynamic list with add/remove |
| `object` | Nested fieldset |

**Enum Handling (Single and Multi-select):**

The MCP 2025-11-25 spec supports titled enums using `oneOf`/`anyOf`:

```json
// Single-select enum (oneOf) - renders as dropdown
{
  "type": "string",
  "oneOf": [
    { "const": "small", "title": "Small (1-10 items)" },
    { "const": "medium", "title": "Medium (11-100 items)" },
    { "const": "large", "title": "Large (100+ items)" }
  ]
}

// Multi-select enum (anyOf with array) - renders as multi-select or checkboxes
{
  "type": "array",
  "items": {
    "type": "string",
    "anyOf": [
      { "const": "read", "title": "Read access" },
      { "const": "write", "title": "Write access" },
      { "const": "delete", "title": "Delete access" }
    ]
  }
}
```

| Pattern | Form Control |
|---------|--------------|
| `oneOf` with `const` values | Single-select dropdown with titles |
| `anyOf` with `const` values in array items | Multi-select dropdown or checkboxes |
| Legacy `enum` array | Single-select dropdown (no titles) |

Note: For Shadcn, multi-select requires a third-party component (e.g., [shadcn-multi-select](https://shadcn-multi-select-component.vercel.app/)). Mantine has built-in `MultiSelect`.

**Schema Features:**
- `required` - Mark fields as required (*)
- `default` - Pre-fill with default value
- `description` - Show as helper text
- `title` - Display label (used in `oneOf`/`anyOf` for enum titles)
- `enum` - Render as select dropdown
- `minimum` / `maximum` - Validation for numbers
- `minLength` / `maxLength` - Validation for strings

**Complex Schema Handling:**
- `$ref` - Resolve references and render inline (when possible)
- `anyOf` / `oneOf` (non-enum) - Show JSON editor as fallback
- Toggle between form view and JSON editor for complex cases

## Error Handling UX

### Toast Notifications

Transient errors and success messages shown as toasts:

```
+-----------------------------------------------------------+
| [check] Connected to everything-server                 [x] |
+-----------------------------------------------------------+

+-----------------------------------------------------------+
| [!] Tool execution failed: Invalid parameters          [x] |
|    [View Documentation ->]                                 |
+-----------------------------------------------------------+
```

### Inline Error Display

Persistent errors shown inline in context (e.g., server cards):

```
+-----------------------------------------------------------+
| [!] Connection Error                                       |
|                                                            |
| Failed to connect: ECONNREFUSED                            |
| Retry attempt 3 of 5                                       |
|                                                            |
| [Show full error]        [Troubleshooting Guide ->]        |
+-----------------------------------------------------------+
```

**Error Display Patterns:**
- **Truncation** - Long errors truncated to ~100 chars with "Show more"
- **Retry count** - Display retry attempts for connection errors
- **Doc links** - Contextual links to troubleshooting documentation
- **Expandable** - Click to show full error message/stack trace

### Connection States

Clear visual feedback for connection lifecycle:

| State | Visual | User Action |
|-------|--------|-------------|
| Disconnected | Gray status, toggle off | Click toggle to connect |
| Connecting | Yellow pulsing, spinner | Wait or cancel |
| Connected | Green status, toggle on | Click toggle to disconnect |
| Failed | Red status, error shown | Retry or edit config |
| OAuth Flow | Redirect indicator | Complete OAuth in browser |
