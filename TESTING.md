# Testing Guidelines

## Unit Testing

For quick reference commands and more details on unit testing, please see the [Testing section in CLAUDE.md](CLAUDE.md#testing).

## E2E Testing Using Playwright

### Recommended Servers For Testing Inspector

- TODO

### Scripted Playwright E2E Tests

Playwright tests for smoke testing core UI mode functions (such as connecting to a local server over STDIO) are located in the `client\e2e` directory.  These tests are run automatically as part of CI.

### E2E Testing Using Playwright MCP

For additional testing, you can also use an [MCP client app](https://modelcontextprotocol.io/clients) with the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) to automate testing using an agent.

We recommend generating a detailed, step-by-step test prompt to use with Playwright MCP based on the exact server and scenario you want to test.  For example:

**Testing Scenario:**

TODO

**Example Prompt:**

TODO
