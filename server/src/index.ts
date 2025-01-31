#!/usr/bin/env node

import cors from "cors";
import { parseArgs } from "node:util";
import { parse as shellParseArgs } from "shell-quote";

import {
  SSEClientTransport,
  SseError
} from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  getDefaultEnvironment
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { findActualExecutable } from "spawn-rx";
import mcpProxy from "./mcpProxy.js";
import samplingRoutes from "./routes/sampling.js";

const SSE_HEADERS_PASSTHROUGH = ["authorization"];

const defaultEnvironment = {
  ...getDefaultEnvironment(),
  ...(process.env.MCP_ENV_VARS ? JSON.parse(process.env.MCP_ENV_VARS) : {})
};

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: "string",
    },
    "stdio-server": {
      type: "string",
    },
    "sse-server": {
      type: "string",
    },
  },
});
