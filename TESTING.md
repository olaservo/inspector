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

For additional testing, you can also use an [MCP client app](https://modelcontextprotocol.io/clients) with the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) to automate testing Inspector using an agent.

We recommend generating a detailed, step-by-step test prompt to use with Playwright MCP based on the exact scenario you want to test, using the relevant GitHub issue and/or PR as context.  For example:

**Testing Scenario:** We'd like to test that we can connect to the Everything MCP Server successfully using STDIO using default settings, manual token entry, and with auth disabled.

**Example Testing Prompt:**

```markdown
## Inspector Testing Plan Using Playwright MCP Server

You are testing MCP Inspector using the following plan.  You MUST use the Playwright MCP Server to follow the steps below.  If the Playwright MCP Server is unavailable or disconnected, you MUST stop testing and let the user know.

### Phase 1: Test Default Authentication Flow (Auto-Open Browser)

1. __Start the inspector with default settings__

   - Run `npm start` to launch both proxy and client
   - Wait for console output showing:
     ```
     🔑 Session token: [32-character hex string]
     🔗 Open inspector with token pre-filled:
        http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=[token]
     ```
   - Verify browser automatically opens to `http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=[token]`
   - Confirm the inspector UI loads without requiring manual token entry
   - Test STDIO connection using command `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 2: Test Manual Browser Opening (With Console Token)

1. __Start inspector without auto-opening browser__

   - Run `MCP_AUTO_OPEN_ENABLED=false npm start` to disable auto-open
   - Wait for console output showing the session token and URL
   - Copy the complete URL with pre-filled token from console output
   - Manually navigate browser to the copied URL (e.g., `http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=3a1c267fad21f7150b7d624c160b7f09b0b8c4f623c7107bbf13378f051538d4`)
   - Verify the inspector UI loads without requiring manual token entry
   - Test STDIO connection using command `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 3: Test Manual Token Configuration (Via UI)

1. __Test manual token entry through Configuration UI__

   - Start inspector without auto-opening: `MCP_AUTO_OPEN_ENABLED=false npm start`
   - Note the session token from console output (32-character hex string)
   - Manually navigate browser to `http://localhost:6274` (without token parameter)
   - Click the "Configuration" button in the sidebar
   - Find the "Proxy Session Token" field
   - Enter the session token from console
   - Click "Save" to apply the configuration
   - Verify the token is saved and connections work
   - Test STDIO connection using command `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 4: Test Authentication Disabled (Backward Compatibility)

1. __Test with authentication completely disabled__

   - Run `DANGEROUSLY_OMIT_AUTH=true npm start`
   - Verify no session token is displayed in console
   - Navigate browser to `http://localhost:6274` (no token needed)
   - Verify inspector UI loads immediately without any authentication
   - Test STDIO connection using command `npx` and arguments `-y @modelcontextprotocol/server-everything@latest`

### Phase 5: Test Port Configuration

1. __Test custom port configuration__

   - Run `CLIENT_PORT=8080 SERVER_PORT=9000 npm start`
   - Verify console shows URLs with custom ports
   - Navigate to the custom client port URL
   - Verify inspector works on custom ports

### Phase 6: Documentation Verification

1. __Verify README accuracy__

   - Check that authentication section matches observed behavior
   - Verify all example commands work as documented
   - Confirm port defaults (6274 for client, 6277 for server)

## Expected Console Output Examples

**Normal startup with authentication:**
```
🔑 Session token: 3a1c267fad21f7150b7d624c160b7f09b0b8c4f623c7107bbf13378f051538d4

🔗 Open inspector with token pre-filled:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=3a1c267fad21f7150b7d624c160b7f09b0b8c4f623c7107bbf13378f051538d4

MCP Inspector Client (MCPI) running on http://localhost:6274
MCP Proxy (MCPP) running on http://localhost:6277
```

**Startup with authentication disabled:**
```
⚠️  Authentication disabled - proxy server is accessible without token
MCP Inspector Client (MCPI) running on http://localhost:6274
MCP Proxy (MCPP) running on http://localhost:6277
```

## Expected Outcomes

We should see:

- ✅ STDIO connections work with proper authentication in all auth-enabled modes
- ✅ Backward compatibility via DANGEROUSLY_OMIT_AUTH environment variable
- ✅ Automatic browser opening with pre-filled token (default behavior)
- ✅ Manual browser opening with console token works
- ✅ Manual token configuration through UI works
- ✅ Custom port configuration works correctly
- ✅ Console output matches expected format for each mode
```
