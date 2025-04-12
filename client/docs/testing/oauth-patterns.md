# OAuth Testing Patterns

## Overview
Testing OAuth flows in the Inspector requires careful consideration of several aspects:
- OAuth proxy server setup and management
- Connection and token exchange tracking
- URL and session state management
- Error handling and edge cases

This guide documents the patterns we use for testing OAuth-related components.

## Using the SDK's OAuth Proxy Provider

We use the `ProxyOAuthServerProvider` from `@modelcontextprotocol/sdk` to handle OAuth flows in tests. This provides:
- A complete OAuth server implementation
- Connection tracking
- Token exchange monitoring
- Built-in error handling

### Setting up the Proxy Test Server

```typescript
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export async function createProxyTestServer(port: number): Promise<ProxyTestServer> {
  const app = express();
  let connectionCount = 0;
  let tokenExchangeCount = 0;

  // Create proxy provider
  const proxyProvider = new ProxyOAuthServerProvider({
    endpoints: {
      authorizationUrl: `http://localhost:${port}/oauth/authorize`,
      tokenUrl: `http://localhost:${port}/oauth/token`,
      revocationUrl: `http://localhost:${port}/oauth/revoke`,
    },
    verifyAccessToken: async (token: string): Promise<AuthInfo> => {
      return {
        token,
        clientId: TEST_CLIENT_ID,
        scopes: ["openid", "email", "profile"],
      };
    },
    getClient: async (clientId: string) => {
      if (clientId !== TEST_CLIENT_ID) {
        throw new Error("Invalid client ID");
      }
      return {
        client_id: TEST_CLIENT_ID,
        redirect_uris: [`http://localhost:${port}/callback`],
      };
    },
  });

  // Add auth router
  app.use(mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl: new URL(`http://localhost:${port}`),
    baseUrl: new URL(`http://localhost:${port}`),
    serviceDocumentationUrl: new URL("https://docs.example.com/"),
  }));

  // Track connections and token exchanges
  app.get("/sse", (req, res) => {
    connectionCount++;
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    res.write("data: connected\n\n");
    req.socket.once("close", () => connectionCount--);
  });

  app.post("/oauth/token", (req, res, next) => {
    tokenExchangeCount++;
    next();
  });

  const httpServer = app.listen(port);
  await new Promise<void>(resolve => httpServer.once("listening", resolve));

  return {
    app,
    httpServer,
    url: `http://localhost:${port}`,
    proxyUrl: `http://localhost:${port}`,
    connectionCount,
    tokenExchangeCount,
    getConnectionCount: () => connectionCount,
    getTokenExchangeCount: () => tokenExchangeCount,
    resetCounters: () => {
      connectionCount = 0;
      tokenExchangeCount = 0;
    },
    waitForConnection: (timeout = 5000) => {
      return new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (connectionCount > 0) {
            resolve();
          } else if (Date.now() - start > timeout) {
            reject(new Error("Timeout waiting for connection"));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    },
    cleanup: async () => {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  };
}
```

## Basic Test Setup

Here's a minimal example of setting up OAuth component tests:

```typescript
import { AuthResult } from '@modelcontextprotocol/sdk/client/auth.js';

// Mock auth module
const mockAuth = jest.fn().mockResolvedValue("AUTHORIZED");
jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => {
  return { auth: mockAuth };
});

// Mock toast for UI feedback
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("OAuth Component", () => {
  const TEST_PORT = 3000;
  let proxyServer: ProxyTestServer;

  beforeAll(async () => {
    proxyServer = await createProxyTestServer(TEST_PORT);
  });

  beforeEach(() => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem(SESSION_KEYS.SERVER_URL, proxyServer.proxyUrl);
    mockToast.mockClear();
    proxyServer.resetCounters();
  });

  afterAll(async () => {
    await proxyServer.cleanup();
  });
});
```

## Key Testing Patterns

### 1. Connection Lifecycle Testing
Test that connections are properly established and cleaned up:

```typescript
it("maintains single connection through re-renders", async () => {
  const mockOnConnect = jest.fn();
  
  // Set up successful OAuth callback URL
  const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
  callbackUrl.searchParams.set("code", "test-auth-code");
  Object.defineProperty(window, "location", {
    value: callbackUrl,
    writable: true,
  });

  // Initial render
  let rerender: (ui: React.ReactElement) => void;
  await act(async () => {
    const { rerender: r } = render(<OAuthCallback onConnect={mockOnConnect} />);
    rerender = r;
  });

  // Wait for initial connection
  await proxyServer.waitForConnection();
  expect(proxyServer.getConnectionCount()).toBe(1);

  // Trigger multiple re-renders
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      rerender(<OAuthCallback onConnect={mockOnConnect} />);
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Verify connection count hasn't increased
  expect(proxyServer.getConnectionCount()).toBe(1);
});
```

### 2. Token Exchange Tracking
Monitor OAuth token exchanges:

```typescript
it("completes full OAuth flow", async () => {
  const mockOnConnect = jest.fn();
  
  // Set up successful OAuth callback URL
  const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
  callbackUrl.searchParams.set("code", "test-auth-code");
  Object.defineProperty(window, "location", {
    value: callbackUrl,
    writable: true,
  });

  await act(async () => {
    render(<OAuthCallback onConnect={mockOnConnect} />);
  });

  // Wait for connection
  await proxyServer.waitForConnection();

  // Verify token exchange
  expect(proxyServer.getTokenExchangeCount()).toBe(1);
  expect(mockOnConnect).toHaveBeenCalledWith(proxyServer.proxyUrl);
});
```

### 3. Error Cases
Test various error scenarios:

```typescript
it("handles proxy token exchange errors", async () => {
  const mockOnConnect = jest.fn();
  
  // Mock auth module to simulate token exchange error
  mockAuth.mockRejectedValueOnce(new Error("Token exchange failed"));
  
  // Set up callback URL
  const callbackUrl = new URL(`${proxyServer.proxyUrl}/oauth/callback`);
  callbackUrl.searchParams.set("code", "invalid-code");
  Object.defineProperty(window, "location", {
    value: callbackUrl,
    writable: true,
  });

  await act(async () => {
    render(<OAuthCallback onConnect={mockOnConnect} />);
  });

  // Verify error handling
  expect(mockToast).toHaveBeenCalledWith({
    title: "OAuth Authorization Error",
    description: expect.stringContaining("Token exchange failed"),
    variant: "destructive",
  });
  expect(proxyServer.getConnectionCount()).toBe(0);
  expect(mockOnConnect).not.toHaveBeenCalled();
});
```

## Common Pitfalls

1. **Proxy Server Management**
   - ❌ Not cleaning up proxy server between tests
   - ✅ Use beforeAll/afterAll for proper setup/cleanup

2. **Connection Tracking**
   - ❌ Not waiting for connections to establish/close
   - ✅ Use waitForConnection and verify counts

3. **Token Exchange Monitoring**
   - ❌ Not verifying token exchange behavior
   - ✅ Track and assert token exchange counts

4. **State Cleanup**
   - ❌ Letting state leak between tests
   - ✅ Reset counters and clear session storage

## Best Practices

1. **Use SDK's Proxy Provider**
   - Leverage built-in OAuth server implementation
   - Track connections and token exchanges
   - Handle common OAuth scenarios

2. **Test Connection Lifecycle**
   - Verify connection establishment
   - Test connection cleanup
   - Monitor connection count through re-renders

3. **Track Token Exchanges**
   - Monitor successful exchanges
   - Test error scenarios
   - Verify exchange count matches expectations

4. **Clean State**
   - Reset proxy server counters
   - Clean up session storage
   - Reset mock functions
   - Properly close proxy server

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [MCP SDK Documentation](https://modelcontextprotocol.io)
