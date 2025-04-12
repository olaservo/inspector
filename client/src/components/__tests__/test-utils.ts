import express, { Express } from "express";
import { Server } from "http";

export interface MinimalTestProvider {
  authorize: (params: { redirectUri: string; state?: string }) => void;
  exchangeToken: (code: string) => Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export interface TestServer {
  app: Express;
  httpServer: Server;
  url: string;
  cleanup: () => Promise<void>;
}

export async function createTestServer(
  port: number,
  provider: MinimalTestProvider
): Promise<TestServer> {
  const app = express();
  
  // Add CORS support
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // OAuth endpoints
  app.get("/oauth/authorize", (req, res) => {
    const { redirect_uri, state } = req.query;
    provider.authorize({
      redirectUri: redirect_uri as string,
      state: state as string | undefined,
    });
    res.sendStatus(200);
  });

  app.post("/oauth/token", async (req, res) => {
    const { code } = req.body;
    try {
      const token = await provider.exchangeToken(code);
      res.json(token);
    } catch {
      res.status(400).json({ error: "invalid_grant" });
    }
  });

  const httpServer = app.listen(port);
  await new Promise<void>(resolve => httpServer.once("listening", resolve));

  const url = `http://localhost:${port}`;
  
  return {
    app,
    httpServer,
    url,
    cleanup: async () => {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    },
  };
}

export function setupOAuthTest() {
  const testProvider: MinimalTestProvider = {
    authorize: jest.fn((params) => {
      const redirectUrl = new URL(params.redirectUri);
      redirectUrl.searchParams.set("code", "test-auth-code");
      if (params.state) {
        redirectUrl.searchParams.set("state", params.state);
      }
      window.location.href = redirectUrl.toString();
    }),
    exchangeToken: jest.fn().mockResolvedValue({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
    }),
  };

  const cleanup = () => {
    (testProvider.authorize as jest.Mock).mockClear();
    (testProvider.exchangeToken as jest.Mock).mockClear();
    window.sessionStorage.clear();
  };

  return { testProvider, cleanup };
}
