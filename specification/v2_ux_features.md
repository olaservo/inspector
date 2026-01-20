# Inspector V2 UX - Feature Screens

### [Brief](README.md) | [V1 Problems](v1_problems.md) | [V2 Scope](v2_scope.md) | [V2 Tech Stack](v2_tech_stack.md)
### UX: [Overview](v2_ux.md) | Features | [Handlers](v2_ux_handlers.md) | [Screenshots](v2_screenshots.md)
### Implementation: [Logic](v2_logic.md) | [Proxy](v2_proxy.md)

---

Each feature screen uses a **resizable panel layout** for flexibility.

## Table of Contents
  * [Tools Screen](#tools-screen)
  * [Resources Screen](#resources-screen)
  * [Prompts Screen](#prompts-screen)
  * [Logging Screen](#logging-screen)
  * [Tasks Screen](#tasks-screen)
  * [History Screen](#history-screen)

## Tools Screen

```
+---------------------+--------------------------------------+------------------------+
| Tools (4)           | Parameters                           | Results                |
| [*] List updated    | (40%)                                | (30%)                  |
| [Refresh Now]       | <-> resize                           |                        |
+---------------------+--------------------------------------+------------------------+
|                     |                                      |                        |
| [Search...]         | Tool: query_database                 | Output:                |
|                     | -------------------                  |                        |
| (*) query_db        | Annotations:                         | +------------------+   |
|   [user]            |   Audience: user                     | |                  |   |
|   [read-only]       |   Read-only: true                    | |   [Image]        |   |
|                     |   Hints: "Useful for data queries"   | |                  |   |
| ( ) echo            |                                      | +------------------+   |
| ( ) add             | table *                              |                        |
| ( ) longOp          | +--------------------------------+   | {                      |
|   [long-run]        | | users                        v |   |   "rows": 42,          |
| ( ) dangerOp        | +--------------------------------+   |   "data": [...]        |
|   [destructive]     |   Suggestions: users, orders, items  | }                      |
|                     |                                      |                        |
|                     | limit                                | [Play Audio]           |
|                     | +--------------------------------+   |                        |
|                     | | 100                            |   | [Copy] [Clear]         |
|                     | +--------------------------------+   |                        |
|                     |                                      |                        |
|                     | ████████████░░░░░░░░ 60%             |                        |
|                     | Processing step 3 of 5...            |                        |
|                     |                                      |                        |
|                     | [Execute Tool]           [Cancel]    |                        |
+---------------------+--------------------------------------+------------------------+
```

**Features:**
- **List Changed Indicator** - Shows when `notifications/tools/list_changed` received, with refresh button
- Searchable/filterable tool list
- **Tool Annotations** displayed:
  - Audience badge ([user], [assistant])
  - Read-only indicator ([read-only])
  - Destructive warning ([destructive])
  - Long-running indicator ([long-run])
  - Custom hints from server
- **Autocomplete** for arguments via `completion/complete`:
  - Dropdown suggestions as user types
  - Supports enum and dynamic completion
- Form generated from tool input schema
- **Per-Tool Metadata** - [Edit Metadata] button to set tool-specific `_meta` fields:
  - Stored per-server, per-tool (not in global localStorage)
  - Merged with server-level metadata on each call
  - Use case: Different progressToken behavior, tool-specific tracking IDs
- **Progress Indicator** from `notifications/progress`:
  - Progress bar with percentage
  - Step description if provided
  - Elapsed time display
- Execute button with loading state
- **Cancel button** sends `notifications/cancelled`
- **Rich Result Display**:
  - JSON/text with syntax highlighting
  - Image preview for image content (base64)
  - Audio player for audio content (base64)
  - Resource links displayed as clickable references

## Resources Screen

Uses an **accordion layout** for the left panel to organize Resources, Templates, and Subscriptions into collapsible sections.

```
+--------------------------------+--------------------------------------------+
| Resources                      | Content Preview (65%)                      |
| [*] List updated [Refresh Now] |                                            |
+--------------------------------+--------------------------------------------+
|                                |                                            |
| [Search...]                    | URI: file:///config.json                   |
|                                | MIME: application/json                     |
| [v] Resources (12)             | -----------------------------              |
| +-----------------------------+|                                            |
| | (*) config.json             || Annotations:                               |
| |   [application]             ||   Audience: application                    |
| |   [priority: 0.9]           ||   Priority: 0.9 (high)                     |
| |                             ||                                            |
| | ( ) readme.md               || {                                          |
| |   [user]                    ||   "name": "my-app",                        |
| |                             ||   "version": "1.0.0"                       |
| | ( ) data.csv                || }                                          |
| | ( ) schema.json             ||                                            |
| |   ... (8 more)              || [Copy] [Subscribe] [Unsubscribe]           |
| +-----------------------------+|                                            |
|                                | Last updated: 14:32:05                     |
| [>] Templates (2)              |                                            |
|                                |                                            |
| [>] Subscriptions (1)          |                                            |
|                                |                                            |
+--------------------------------+--------------------------------------------+
```

**Expanded Templates Section:**
```
| [v] Templates (2)              |
| +-----------------------------+|
| | ( ) user/{id}               ||
| |   [id: ________ ] [Go]      ||
| |                             ||
| | ( ) file/{path}             ||
| |   [path: _______ ] [Go]     ||
| +-----------------------------+|
```

**Expanded Subscriptions Section:**
```
| [v] Subscriptions (1)          |
| +-----------------------------+|
| | (*) config.json             ||
| |   Last update: 14:32:05     ||
| |                  [Unsub]    ||
| +-----------------------------+|
```

**Accordion Behavior:**
- Sections expand/collapse independently by clicking header
- [v] indicates expanded section, [>] indicates collapsed
- Empty sections show "(0)" count and collapse by default
- If only Resources exist, that section expands by default
- Search filters across all sections simultaneously

**Features:**
- **List Changed Indicator** - Shows when `notifications/resources/list_changed` received
- **Accordion Layout** - Collapsible sections for Resources, Templates, Subscriptions
- List resources with pagination within each section
- **Resource Annotations** displayed:
  - Audience badge ([user], [application/assistant])
  - Priority indicator ([high], [medium], [low])
- Resource templates with inline variable input and [Go] button
- Subscribe/unsubscribe to resource updates
- **Subscriptions Section** shows active subscriptions with last update time
- Content viewer (JSON, text, binary preview)
- Image preview for image resources
- Audio player for audio resources

## Prompts Screen

```
+------------------------------+----------------------------------------------+
| Prompts (2)                  | Result (65%)                                 |
| [*] List updated [Refresh]   |                                              |
+------------------------------+----------------------------------------------+
|                              |                                              |
| Select Prompt:               | Messages:                                    |
| +--------------------------+ |                                              |
| | greeting_prompt        v | | [0] role: user                               |
| +--------------------------+ |     Content:                                 |
|                              |     "Hello, my name is John and I            |
| Description:                 |      like cats"                              |
| "Generates a friendly        |                                              |
|  greeting message"           |     [Image: profile.png]                     |
|                              |                                              |
| Arguments:                   | [1] role: assistant                          |
| -------------                |     "Nice to meet you, John! I see           |
|                              |      you're a cat lover..."                  |
| name *                       |                                              |
| +--------------------------+ |                                              |
| | John                   v | |                                              |
| +--------------------------+ |                                              |
|   Suggestions: John, Jane    |                                              |
|                              |                                              |
| interests                    |                                              |
| +--------------------------+ |                                              |
| | cats                     | |                                              |
| +--------------------------+ |                                              |
|                              |                                              |
| [Get Prompt]                 | [Copy JSON] [Copy Messages]                  |
+------------------------------+----------------------------------------------+
```

**Features:**
- **List Changed Indicator** - Shows when `notifications/prompts/list_changed` received
- Dropdown to select from available prompts
- Prompt description displayed
- **Autocomplete** for arguments via `completion/complete`
- Form generated from prompt arguments
- Display prompt messages result with:
  - Role labels
  - Text content
  - Image content preview
  - Audio content player
  - Embedded resource display
- Copy functionality (JSON or plain messages)

## Logging Screen

```
+-----------------------+-----------------------------------------------------+
| Log Controls (25%)    | Log Stream (75%)                                    |
| <-> resize            |                                                     |
+-----------------------+-----------------------------------------------------+
|                       |                                                     |
| Log Level:            | 14:32:01 [INFO]     Server initialized              |
| +-----------------+   | 14:32:02 [DEBUG]    Loading tool: echo              |
| | debug         v |   | 14:32:02 [DEBUG]    Loading tool: add               |
| +-----------------+   | 14:32:03 [NOTICE]   Configuration loaded            |
|                       | 14:32:05 [WARNING]  Rate limit approaching          |
| [Set Level]           | 14:32:10 [ERROR]    Failed to fetch resource: 404   |
|                       | 14:32:15 [CRITICAL] Database connection lost        |
| Filter:               | 14:32:16 [ALERT]    Service degraded                |
| +-----------------+   | 14:32:20 [EMERGENCY] System failure                 |
| |                 |   |                                                     |
| +-----------------+   | -------------------------------------------------   |
|                       |                                                     |
| Show Levels:          |                                                     |
| [x] DEBUG             |                                                     |
| [x] INFO              |                                                     |
| [x] NOTICE            |                                                     |
| [x] WARNING           |                                                     |
| [x] ERROR             |                                                     |
| [x] CRITICAL          |                                                     |
| [x] ALERT             |                                                     |
| [x] EMERGENCY         |                                                     |
|                       |                                                     |
| [Clear] [Export]      | [Auto-scroll] [Copy All]                            |
+-----------------------+-----------------------------------------------------+
```

**Features:**
- **Set Log Level** via `logging/setLevel` request
  - Options: debug, info, notice, warning, error, critical, alert, emergency
- **Real-time Log Stream** from `notifications/message`
- Filter by text search
- Filter by log level checkboxes (all 8 RFC 5424 levels)
- **Color-coded by severity** (8 distinct visual treatments):

| Level | Color | Style |
|-------|-------|-------|
| DEBUG | Gray | Normal |
| INFO | Blue | Normal |
| NOTICE | Cyan | Normal |
| WARNING | Yellow | Normal |
| ERROR | Red | Normal |
| CRITICAL | Red | Bold |
| ALERT | Magenta | Bold |
| EMERGENCY | White on Red | Background highlight |

- Timestamp display
- Logger name display (if provided)
- Auto-scroll toggle
- Export logs to file
- Copy all logs to clipboard

## Tasks Screen

```
+-------------------------------------------------------------------------+
| Tasks                                                     [Refresh]     |
+-------------------------------------------------------------------------+
|                                                                         |
| Active Tasks (2)                                                        |
| +---------------------------------------------------------------------+ |
| | Task: abc-123              Status: running         ████████░░ 80%   | |
| | Method: tools/call                                                  | |
| | Tool: longRunningOperation                                          | |
| | Started: 14:32:05          Elapsed: 45s                             | |
| | Progress: Processing batch 4 of 5...                                | |
| |                                            [View Details] [Cancel]  | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | Task: def-456              Status: waiting         ░░░░░░░░░░ 0%    | |
| | Method: resources/read                                              | |
| | Resource: large-dataset                                             | |
| | Started: 14:33:00          Elapsed: 10s                             | |
| |                                            [View Details] [Cancel]  | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| Completed Tasks (3)                                    [Clear History]  |
| +---------------------------------------------------------------------+ |
| | Task: ghi-789              Status: completed       ██████████ 100%  | |
| | Method: tools/call (processData)                                    | |
| | Completed: 14:31:30        Duration: 1m 30s                         | |
| |                                            [View Result] [Dismiss]  | |
| +---------------------------------------------------------------------+ |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Features:**
- **Task List** via `tasks/list` request
- **Real-time Status Updates** via `notifications/task/statusChanged`
- **Progress Display** from `notifications/progress`:
  - Progress bar with percentage
  - Current step description
  - Total/current progress numbers
- Task states: waiting, running, completed, failed, cancelled
- **Cancel Tasks** via `tasks/cancel`
- **View Results** via `tasks/result`
- **View Task Details** via `tasks/get`
- Task history with dismissal
- Elapsed time / duration display

## History Screen

A unified history of all MCP requests with replay capability.

```
+-------------------------------------------------------------------------------------+
| History                                           [Search...] [Filter v] [Clear All] |
+-------------------------------------------------------------------------------------+
|                                                                                     |
| +---------------------------------------------------------------------------------+ |
| | * 14:35:22  tools/call         echo                             [Replay] [Pin]  | |
| |    Parameters: { "message": "Hello world" }                                     | |
| |    Result: Success (45ms)                                                       | |
| |    ------------------------------------------------------------------           | |
| |    Response: { "content": [{ "type": "text", "text": "Hello world" }] }         | |
| +---------------------------------------------------------------------------------+ |
|                                                                                     |
| +---------------------------------------------------------------------------------+ |
| |   14:34:15  resources/read     file:///config.json              [Replay] [Pin]  | |
| |    Result: Success (120ms)                                                      | |
| |    ------------------------------------------------------------------           | |
| |    Content: { "name": "my-app", "version": "1.0.0" }  (collapsed)  [Expand]     | |
| +---------------------------------------------------------------------------------+ |
|                                                                                     |
| +---------------------------------------------------------------------------------+ |
| |   14:33:45  prompts/get        greeting_prompt                  [Replay] [Pin]  | |
| |    Arguments: { "name": "John", "interests": "cats" }                           | |
| |    Result: Success (30ms)                                                       | |
| +---------------------------------------------------------------------------------+ |
|                                                                                     |
| +---------------------------------------------------------------------------------+ |
| |   14:32:10  tools/call         query_database                   [Replay] [Pin]  | |
| |    Parameters: { "table": "users", "limit": 10 }                                | |
| |    Result: [X] Error (200ms)                                                    | |
| |    ------------------------------------------------------------------           | |
| |    Error: "Table 'users' not found"                                             | |
| +---------------------------------------------------------------------------------+ |
|                                                                                     |
| Pinned Requests (2)                                                                 |
| +---------------------------------------------------------------------------------+ |
| | * "Test echo"      tools/call    echo             14:35:22       [Replay] [Unpin] |
| | * "Get config"     resources/read file:///config.json 14:34:15   [Replay] [Unpin] |
| +---------------------------------------------------------------------------------+ |
|                                                                                     |
|                                                          Showing 50 of 127 entries |
|                                                               [Load More]          |
+-------------------------------------------------------------------------------------+
```

**Features:**
- **Automatic Capture** - All MCP requests/responses logged automatically:
  - `tools/call` - Tool invocations
  - `resources/read` - Resource reads
  - `prompts/get` - Prompt retrievals
  - `sampling/createMessage` - Sampling requests/responses
  - `elicitation/create` - Elicitation requests/responses
- **Request Details** displayed:
  - Timestamp
  - Method name
  - Target (tool name, resource URI, prompt name)
  - Parameters/arguments
  - Result status (success/error)
  - Response time
  - Response data (collapsible)
- **Replay** - Re-execute any request with original parameters:
  - Opens relevant screen (Tools, Resources, Prompts) pre-filled
  - Option to modify parameters before replay
- **Pin/Save** - Pin important requests for quick access:
  - Pinned requests persist across sessions
  - Optional custom label for pinned items
  - Pinned section at bottom for easy access
- **Filter** by:
  - Method type (tools, resources, prompts, sampling, elicitation)
  - Status (success, error)
  - Time range
- **Search** across method names, parameters, and responses
- **Pagination** - Load more for large histories
- **Clear** - Clear history (with confirmation)
- **Export** - Export history as JSON for sharing/debugging

**Replay Workflow:**
1. Click [Replay] on any history entry
2. Inspector navigates to the appropriate screen (Tools, Resources, Prompts)
3. Form is pre-filled with the original parameters
4. User can modify parameters or execute immediately
5. New request is added to history
