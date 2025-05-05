import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { McpResponse } from "./types.js";
import { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";

export const validLogLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
] as const;

export type LogLevel = (typeof validLogLevels)[number];

// Enhance debugging for timeout-related options
export async function connect(
  client: Client,
  transport: Transport,
  options: RequestOptions,
): Promise<void> {
  // Log timeout configuration for debugging
  if (options.timeout || options.resetTimeoutOnProgress || options.maxTotalTimeout) {
    console.log("MCP Connection timeout configuration:", {
      requestTimeout: options.timeout ?? "default (60s)",
      resetTimeoutOnProgress: options.resetTimeoutOnProgress ?? false,
      maxTotalTimeout: options.maxTotalTimeout ?? "none",
    });
  }
  
  try {
    await client.connect(transport, options);
  } catch (error) {
    throw new Error(
      `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function disconnect(transport: Transport): Promise<void> {
  try {
    await transport.close();
  } catch (error) {
    throw new Error(
      `Failed to disconnect from MCP server: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Enhanced request function with better timeout handling logs
export async function makeRequest(
  client: Client, 
  method: string, 
  params: any, 
  options: RequestOptions
): Promise<any> {
  const startTime = Date.now();
  let progressCount = 0;
  
  // Clone options and add progress tracking if not already present
  const enhancedOptions: RequestOptions = {
    ...options,
    onprogress: options.onprogress ? 
      (progress) => {
        progressCount++;
        const elapsed = Date.now() - startTime;
        console.log(`Progress update received after ${elapsed}ms (${progressCount} total)`, progress);
        
        if (options.resetTimeoutOnProgress) {
          console.log(`Timeout reset due to progress (resetTimeoutOnProgress=true)`);
        } else {
          console.log(`Timeout NOT reset (resetTimeoutOnProgress=false)`);
        }
        
        // Call the original progress handler if provided
        options.onprogress?.(progress);
      } : undefined
  };
  
  try {
    console.log(`Starting request: ${method} with timeout ${options.timeout}ms`);
    const result = await client.request({ method, params }, enhancedOptions);
    const totalTime = Date.now() - startTime;
    console.log(`Request completed successfully after ${totalTime}ms with ${progressCount} progress updates`);
    return result;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Request failed after ${totalTime}ms with ${progressCount} progress updates: ${
      error instanceof Error ? error.message : String(error)
    }`);
    throw error;
  }
}

// Set logging level
export async function setLoggingLevel(
  client: Client,
  level: LogLevel,
): Promise<McpResponse> {
  try {
    const response = await client.setLoggingLevel(level as any);
    return response;
  } catch (error) {
    throw new Error(
      `Failed to set logging level: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
