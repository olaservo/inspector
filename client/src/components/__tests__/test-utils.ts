import express, { Express } from "express";
import { Server } from "http";

export interface TestServer {
  app: Express;
  httpServer: Server;
  url: string;
  cleanup: () => Promise<void>;
}

export async function createTestServer(port: number): Promise<TestServer> {
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
