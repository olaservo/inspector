# Testing Guidelines

## Unit and Integration Testing

For quick reference commands and more details on unit and integration testing, please see the [Testing section in CLAUDE.md](CLAUDE.md#testing).

## E2E Testing Using Playwright

### Recommended Servers For Testing Inspector

| Server | Transport(s) | Auth |
|--------|-------------|------|
| [Everything MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/everything) | STDIO, SSE, Streamable HTTP | None |

### Scripted Playwright E2E Tests

Playwright tests for smoke testing core UI mode functions (such as connecting to a local server over STDIO) are located in the `client\e2e` directory.  These tests are run automatically as part of CI.

### E2E Testing Using Playwright MCP

For additional testing, you can also use an [MCP client app](https://modelcontextprotocol.io/clients) with the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) to automate testing Inspector using an LLM.

We recommend generating a detailed, step-by-step test prompt to use with Playwright MCP based on the exact scenario you want to test, using the relevant GitHub issue and/or PR as context.  For example:

**Testing Scenario:** We'd like to test that we can connect to the Everything MCP Server successfully using STDIO using default settings, manual token entry, and with auth disabled.

**Example Testing Prompt:**

```markdown
## Testing Plan

### Phase 1: Test Normal Authentication Flow (Default Behavior)

1. __Start the inspector with default settings__

   - Run `npm start` to launch both proxy and client
   - Verify the session token is generated and displayed in console
   - Check if browser opens automatically with token pre-filled
   - Test STDIO connection using commmand `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 2: Test Manual Authentication Configuration

1. __Test manual token entry__

   - Start inspector without auto-opening browser
   - Open browser manually to localhost:6274
   - Enter session token via Configuration UI
   - Test STDIO connection using commmand `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 3: Test Authentication Disabled (Backward Compatibility)

1. __Test with DANGEROUSLY_OMIT_AUTH=true__

   - Start inspector with auth disabled
   - Verify STDIO connections work without any token

### Phase 4: Documentation Verification

1. __Check if README matches current behavior__

   - Verify authentication section is accurate
   - Check if examples work as documented

## Expected Outcomes

If the issue is resolved, we should see:

- ✅ STDIO connections work with proper authentication
- ✅ Backward compatibility via DANGEROUSLY_OMIT_AUTH
- ✅ Automatic browser opening with pre-filled token
- ✅ Manual token configuration works properly
```
