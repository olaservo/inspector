# Inspector V2 UX - Handlers & Patterns

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: [Overview](v2_ux.md) | [Features](v2_ux_features.md) | Handlers | [Screenshots](v2_screenshots.md)

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

Client feature requests (sampling, elicitation) appear **inline** during tool execution, replacing the Results panel. This keeps the user focused on the tool workflow without context-switching to separate modals.

### Sampling Panel

When a tool triggers a `sampling/createMessage` request, it appears inline:

```
+-------------------------------------------------------------------------+
| Tool: trigger-agentic-sampling                           [Executing...] |
+-------------------------------------------------------------------------+
| Parameters: { "prompt": "What is 2+2?", "availableTools": ["add"] }     |
+-------------------------------------------------------------------------+
| Progress: 50% complete                                           12.5s  |
+=========================================================================+
| [!] Pending Client Requests (1)                                         |
|     Tool execution is waiting for your response to continue.            |
+-------------------------------------------------------------------------+
| sampling/createMessage                                        [1 of 1]  |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | [user] What is 2+2?                                                 | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Model hints: claude-3-sonnet, gpt-4                                     |
| Max Tokens: 1000    Temperature: 0.7                                    |
|                                                                         |
| +--- Tools (1) -------------------------------------------------------+ |
| | [add]  Adds two numbers together                                    | |
| | Tool Choice: [auto v]                                               | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| [x] Include Context: thisServer                                         |
|                                                                         |
| ----------------------------------------------------------------------- |
|                                                                         |
| Testing Profile: [Manual v]                                             |
|                                                                         |
| Response:                                                         [Copy]|
| +---------------------------------------------------------------------+ |
| | The answer is 4.                                                    | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Model: [mock-model-1.0]              Stop Reason: [endTurn v]           |
|                                                                         |
|                          [Reject]  [Edit & Send]  [Auto-respond]        |
+-------------------------------------------------------------------------+
|                      [Cancel Tool Execution]                            |
+-------------------------------------------------------------------------+
```

**Features:**
- **Inline display** - Appears in Results panel during tool execution
- **Full request details** visible without modal:
  - Messages with role badges (text, image, tool_use, tool_result)
  - Model hints badges
  - Parameters (Max Tokens, Temperature, Stop Sequences)
  - **Tools list** with names and descriptions (MCP 2025-11-25)
  - **Tool Choice** dropdown (auto/none/required/specific)
  - Include Context checkbox
- **Testing Profile** selector for response behavior
- **Response field** with copy button
- **Model** and **Stop Reason** fields
- **Tool Calls builder** (when stopReason is "toolUse")
- Action buttons:
  - **[Reject]** - Decline the sampling request
  - **[Edit & Send]** - Send the response as-is or after editing
  - **[Auto-respond]** - Use Testing Profile to auto-generate response
- **[Cancel Tool Execution]** - Abort the entire tool call

#### Sampling with Tool Calling (MCP 2025-11-25)

When `tools` and `toolChoice` are provided, the LLM can request tool execution:

**Response with toolUse:**
When stopReason is set to "toolUse", a Tool Calls section appears:

```
| Stop Reason: [toolUse v]                                                |
|                                                                         |
| +--- Tool Calls ------------------------------------------------------+ |
| | [add v] {"a": 2, "b": 2}                                     [x]    | |
| |                                                        [+ Add]      | |
| +---------------------------------------------------------------------+ |
```

The server receives the tool calls, executes them, and sends a follow-up sampling request with results.

### Elicitation Handler

When a tool triggers an `elicitation/create` request, it appears inline:

**Form Mode:**

```
+-------------------------------------------------------------------------+
| [!] Pending Client Requests (1)                                         |
+-------------------------------------------------------------------------+
| elicitation/create (form)                                     [1 of 1]  |
|                                                                         |
| "Please provide your database connection details to proceed."           |
|                                                                         |
| Host *                                                                  |
|   The database server hostname or IP address                            |
| +---------------------------------------------------------------------+ |
| | localhost                                                           | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Port *                                                                  |
|   The database server port (default: 5432)                              |
| +---------------------------------------------------------------------+ |
| | 5432                                                                | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Database                                                                |
|   Name of the database to connect to                                    |
| +---------------------------------------------------------------------+ |
| | myapp_production                                                    | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| SSL Mode                                                                |
| +---------------------------------------------------------------------+ |
| | require                                                           v | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| [!] WARNING: Server "data-processor" is requesting this data.           |
|                                                                         |
|                                              [Cancel]  [Submit]         |
+-------------------------------------------------------------------------+
```

**URL Mode:**

```
+-------------------------------------------------------------------------+
| [!] Pending Client Requests (1)                                         |
+-------------------------------------------------------------------------+
| elicitation/create (URL)                                      [1 of 1]  |
|                                                                         |
| "Please complete the OAuth authorization in your browser."              |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | https://auth.example.com/oauth/authorize?client_id=abc&state=xyz    | |
| +---------------------------------------------------------------------+ |
|                                                                         |
|                                               [Copy]  [Open]            |
|                                                                         |
| Status: (spinner) Waiting for completion...                             |
|                                                                         |
| Elicitation ID: abc123-def456                                           |
|                                                                         |
| [!] WARNING: Opening external URL (auth.example.com). Verify the domain.|
|                                                                         |
|                                                            [Cancel]     |
+-------------------------------------------------------------------------+
```

**Features:**
- **Inline display** - Appears in Results panel during tool execution
- **Form Mode:**
  - Generate form from JSON Schema in request
  - **Field descriptions** shown above each field
  - Required field indicators (*)
  - Security warning with server name
  - Submit returns response to server
- **URL Mode:**
  - Display URL for user to visit
  - Copy URL and Open in browser buttons
  - Waiting indicator until completion
  - **Elicitation ID** display
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
