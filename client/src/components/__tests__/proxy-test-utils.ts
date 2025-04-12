import express, { Express } from "express";
import { Server } from "http";
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export interface ProxyTestServer extends TestServer {
  proxyUrl: string;
  connectionCount: number;
  tokenExchangeCount: number;
  resetCounters: () => void;
  getConnectionCount: () => number;
  getTokenExchangeCount: () => number;
  waitForConnection: (timeout?: number) => Promise<void>;
}

export interface TestServer {
  app: Express;
  httpServer: Server;
  url: string;
  cleanup: () => Promise<void>;
}

const TEST_CLIENT_ID = "test-client";

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

  // Track SSE connections
  app.get("/sse", (req, res) => {
    connectionCount++;
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    res.write("data: connected\n\n");

    req.socket.once("close", () => {
      connectionCount--;
    });
  });

  // Track token exchanges
  app.post("/oauth/token", (req, res, next) => {
    tokenExchangeCount++;
    next();
  });

  const httpServer = app.listen(port);
  await new Promise<void>(resolve => httpServer.once("listening", resolve));

  const url = `http://localhost:${port}`;

  const waitForConnection = (timeout = 5000) => {
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
  };

  return {
    app,
    httpServer,
    url,
    proxyUrl: url,
    connectionCount,
    tokenExchangeCount,
    getConnectionCount: () => connectionCount,
    getTokenExchangeCount: () => tokenExchangeCount,
    resetCounters: () => {
      connectionCount = 0;
      tokenExchangeCount = 0;
    },
    waitForConnection,
    cleanup: async () => {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  };
}

export function setupProxyTest() {
  const cleanup = () => {
    window.sessionStorage.clear();
  };

  return { cleanup };
}
