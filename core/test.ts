#!/usr/bin/env npx tsx
/**
 * CLI test runner for inspector-core package
 *
 * Usage:
 *   npx tsx test.ts [options] [server-url]
 *
 * Options:
 *   --profile <id>   Testing profile: manual, auto-approve (default: auto-approve)
 *   --unit           Run unit tests only (no server required)
 *   --help           Show this help
 *
 * Examples:
 *   npx tsx test.ts                                    # All tests with auto-approve
 *   npx tsx test.ts --unit                             # Unit tests only
 *   npx tsx test.ts --profile manual                   # Manual approval mode
 *   npx tsx test.ts http://localhost:3000/mcp          # Custom server URL
 *
 * Default server: http://localhost:6299/mcp (everything server)
 */

import {
  // Client
  createMcpClient,
  connectClient,
  disconnectClient,
  isClientConnected,
  // Transport
  createHttpTransport,
  // Handlers
  setupSamplingHandler,
  setupElicitationHandler,
  resolveSamplingRequest,
  // Capabilities
  setupRootsHandler,
  setupLoggingHandler,
  setupListChangedHandlers,
  // Memory repositories
  createMemoryServerConfigRepository,
  createMemoryHistoryRepository,
  createMemoryLogsRepository,
  createMemoryTestingProfileRepository,
  getDefaultTestingProfiles,
  // Types
  type SamplingRequest,
  type SamplingResponse,
  type TestingProfile,
  type Root,
} from './src/index.js';

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    profileId: 'auto-approve',
    unitOnly: false,
    serverUrl: 'http://localhost:6299/mcp',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--unit') {
      options.unitOnly = true;
    } else if (arg === '--profile' && args[i + 1]) {
      options.profileId = args[++i];
    } else if (!arg.startsWith('--')) {
      options.serverUrl = arg;
    }
  }

  return options;
}

const options = parseArgs();

if (options.help) {
  console.log(`
Usage: npx tsx test.ts [options] [server-url]

Options:
  --profile <id>   Testing profile: manual, auto-approve (default: auto-approve)
  --unit           Run unit tests only (no server required)
  --help           Show this help

Examples:
  npx tsx test.ts                                    # All tests with auto-approve
  npx tsx test.ts --unit                             # Unit tests only
  npx tsx test.ts --profile manual                   # Manual approval mode
  npx tsx test.ts http://localhost:3000/mcp          # Custom server URL
`);
  process.exit(0);
}

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function logSection(title: string) {
  console.log();
  log(`=== ${title} ===`, colors.cyan);
}

function logSuccess(msg: string) {
  log(`[OK] ${msg}`, colors.green);
}

function logError(msg: string) {
  log(`[ERROR] ${msg}`, colors.red);
}

function logInfo(msg: string) {
  log(`[INFO] ${msg}`, colors.dim);
}

async function testMemoryRepositories() {
  logSection('Testing Memory Repositories');

  // Server Config Repository
  const serverRepo = createMemoryServerConfigRepository();
  const server = await serverRepo.create({
    name: 'Test Server',
    transport: 'http',
    url: 'http://localhost:3000/mcp',
  });
  logSuccess(`Created server config: ${server.id}`);

  const servers = await serverRepo.list();
  logSuccess(`Listed ${servers.length} server(s)`);

  await serverRepo.update(server.id, { name: 'Updated Server' });
  const updated = await serverRepo.get(server.id);
  logSuccess(`Updated server name: ${updated?.name}`);

  // History Repository
  const historyRepo = createMemoryHistoryRepository();
  const entry = await historyRepo.add({
    method: 'tools/call',
    target: 'echo',
    params: { message: 'hello' },
    response: { content: [{ type: 'text', text: 'hello' }] },
    duration: 42,
    success: true,
    requestType: 'primary',
  });
  logSuccess(`Added history entry: ${entry.id}`);

  const history = await historyRepo.list({ limit: 10 });
  logSuccess(`Listed ${history.length} history entry(ies)`);

  // Logs Repository
  const logsRepo = createMemoryLogsRepository();
  await logsRepo.add({ level: 'info', message: 'Test log', logger: 'test' });
  await logsRepo.addBatch([
    { level: 'debug', message: 'Debug 1', logger: 'test' },
    { level: 'warning', message: 'Warning 1', logger: 'test' },
  ]);
  const logs = await logsRepo.list({ minLevel: 'info' });
  logSuccess(`Listed ${logs.length} log(s) at info level or higher`);

  // Testing Profiles Repository
  const profilesRepo = createMemoryTestingProfileRepository();
  const profiles = await profilesRepo.list();
  logSuccess(`Listed ${profiles.length} default profile(s): ${profiles.map((p) => p.name).join(', ')}`);

  const defaults = getDefaultTestingProfiles();
  logSuccess(`getDefaultTestingProfiles() returned ${defaults.length} profile(s)`);
}

async function testMcpConnection() {
  logSection('Testing MCP Client Connection');

  logInfo(`Connecting to: ${options.serverUrl}`);

  // Build capabilities object explicitly for debugging
  const capabilities = {
    sampling: { tools: {} },
    roots: { listChanged: true },
  };
  logInfo(`Client capabilities to send: ${JSON.stringify(capabilities)}`);

  const client = createMcpClient({
    name: 'Inspector Core Test',
    version: '1.0.0',
  });

  const transport = createHttpTransport(options.serverUrl);

  try {
    const serverInfo = await connectClient(client, transport);
    logSuccess(`Connected to: ${serverInfo.name} v${serverInfo.version}`);

    if (serverInfo.capabilities) {
      const caps = serverInfo.capabilities;
      logInfo(`Capabilities: tools=${!!caps.tools}, resources=${!!caps.resources}, prompts=${!!caps.prompts}`);
    }

    // Test isClientConnected
    const connected = isClientConnected(client);
    logSuccess(`isClientConnected: ${connected}`);

    return { client, serverInfo };
  } catch (error) {
    logError(`Failed to connect: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function testCapabilities(client: ReturnType<typeof createMcpClient>) {
  logSection('Testing Capability Handlers');

  // Setup roots
  const roots: Root[] = [
    { name: 'Project', uri: 'file:///home/user/project' },
    { name: 'Config', uri: 'file:///etc/myapp' },
  ];

  const notifyRootsChanged = setupRootsHandler(client, {
    getRoots: () => roots,
  });
  logSuccess('Roots handler set up');

  // Setup logging
  setupLoggingHandler(client, {
    onLogMessage: (msg) => {
      logInfo(`[Server Log] ${msg.level}: ${JSON.stringify(msg.data)}`);
    },
  });
  logSuccess('Logging handler set up');

  // Setup list changed
  setupListChangedHandlers(client, {
    onToolsListChanged: () => logInfo('Tools list changed!'),
    onResourcesListChanged: () => logInfo('Resources list changed!'),
    onPromptsListChanged: () => logInfo('Prompts list changed!'),
  });
  logSuccess('List changed handlers set up');
}

async function testSamplingWithProfile(client: ReturnType<typeof createMcpClient>, profile: TestingProfile) {
  logSection(`Testing Sampling Handler (Profile: ${profile.name})`);

  const isAutoMode = profile.id === 'auto-approve';
  let requestCount = 0;

  setupSamplingHandler(
    client,
    {
      onSamplingRequest: (reqId, req, parentId) => {
        requestCount++;
        logInfo(`Sampling request received: ${reqId}`);
        if (req.tools && req.tools.length > 0) {
          logInfo(`  Tools available: ${req.tools.map(t => t.name).join(', ')}`);
        }
        if (req.toolChoice) {
          logInfo(`  Tool choice: ${JSON.stringify(req.toolChoice)}`);
        }
      },
      onSamplingAutoApproved: (reqId, req, resp) => {
        logSuccess(`Auto-approved sampling request: ${reqId}`);
        logInfo(`Response: "${resp.content.type === 'text' ? resp.content.text : '[image]'}"`);
        if (resp.toolCalls && resp.toolCalls.length > 0) {
          logInfo(`  Tool calls: ${resp.toolCalls.map(t => t.name).join(', ')}`);
        }
      },
    },
    'test-parent-id',
    {
      approvalMode: isAutoMode ? 'auto' : 'manual',
      testingProfile: profile,
    }
  );
  logSuccess(`Sampling handler set up with profile: ${profile.name}`);
  logInfo(`Approval mode: ${isAutoMode ? 'auto' : 'manual'}`);
}

async function testSamplingWithToolsTypes() {
  logSection('Testing Sampling With Tools Types');

  // Type verification (imports already at top)

  // Create a mock sampling request with tools
  const mockRequest: SamplingRequest = {
    messages: [
      { role: 'user', content: { type: 'text', text: 'What is 2+2?' } },
    ],
    maxTokens: 100,
    tools: [
      {
        name: 'calculator',
        description: 'Performs arithmetic',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string' },
          },
        },
      },
    ],
    toolChoice: { type: 'auto' },
  };

  logSuccess(`Created mock request with ${mockRequest.tools?.length} tool(s)`);
  logInfo(`Tool: ${mockRequest.tools?.[0]?.name}`);
  logInfo(`Tool choice: ${JSON.stringify(mockRequest.toolChoice)}`);

  // Create a mock response with tool calls
  const mockResponse: SamplingResponse = {
    content: { type: 'text', text: 'I will calculate that for you.' },
    model: 'test-model',
    stopReason: 'toolUse',
    toolCalls: [
      {
        id: 'call-123',
        name: 'calculator',
        arguments: { expression: '2+2' },
      },
    ],
  };

  logSuccess(`Created mock response with stopReason: ${mockResponse.stopReason}`);
  logInfo(`Tool calls: ${mockResponse.toolCalls?.map(t => `${t.name}(${JSON.stringify(t.arguments)})`).join(', ')}`);
}

async function testToolExecution(client: ReturnType<typeof createMcpClient>) {
  logSection('Testing Tool Execution');

  try {
    // List tools
    const toolsResult = await client.listTools();
    const tools = toolsResult.tools || [];
    logSuccess(`Found ${tools.length} tool(s)`);

    if (tools.length > 0) {
      logInfo(`All tools: ${tools.map((t) => t.name).join(', ')}`);

      // Check for conditional tools that require specific capabilities
      const conditionalTools = [
        { name: 'trigger-sampling-request', desc: 'basic sampling' },
        { name: 'trigger-agentic-sampling', desc: 'sampling.tools' },
        { name: 'trigger-elicitation-request', desc: 'elicitation' },
        { name: 'get-roots-list', desc: 'roots' },
      ];

      logSection('Conditional Tools Registration Check');
      for (const ct of conditionalTools) {
        const found = tools.find((t) => t.name === ct.name);
        if (found) {
          logSuccess(`${ct.name} (requires ${ct.desc})`);
        } else {
          logError(`${ct.name} NOT found (requires ${ct.desc})`);
        }
      }

      // Try to call echo tool if available
      const echoTool = tools.find((t) => t.name === 'echo');
      if (echoTool) {
        logInfo('Calling echo tool...');
        const result = await client.callTool({
          name: 'echo',
          arguments: { message: 'Hello from inspector-core!' },
        });
        logSuccess(`Echo result: ${JSON.stringify(result.content)}`);
      }
    }
  } catch (error) {
    logError(`Tool execution failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function testSamplingWithToolsLive(client: ReturnType<typeof createMcpClient>) {
  logSection('Testing Live Sampling With Tools');

  // Set up handler to capture sampling requests with tools
  let samplingRequestReceived = false;
  let receivedTools: unknown[] = [];
  let receivedToolChoice: unknown = null;

  setupSamplingHandler(
    client,
    {
      onSamplingRequest: (reqId, req, parentId) => {
        samplingRequestReceived = true;
        logSuccess(`Received sampling request: ${reqId}`);
        logInfo(`  Messages: ${req.messages.length}`);

        if (req.tools && req.tools.length > 0) {
          receivedTools = req.tools;
          logSuccess(`  Tools in request: ${req.tools.map(t => t.name).join(', ')}`);
          for (const tool of req.tools) {
            logInfo(`    - ${tool.name}: ${tool.description?.slice(0, 50) || 'no description'}...`);
          }
        } else {
          logInfo('  No tools in request');
        }

        if (req.toolChoice) {
          receivedToolChoice = req.toolChoice;
          logSuccess(`  Tool choice: ${JSON.stringify(req.toolChoice)}`);
        }

        // Auto-respond so the tool can continue
        resolveSamplingRequest(reqId, {
          content: { type: 'text', text: 'The answer is 42.' },
          model: 'test-model',
          stopReason: 'endTurn',
        });
      },
      onSamplingCancelled: (reqId) => {
        logInfo(`Sampling cancelled: ${reqId}`);
      },
    },
    'live-test-parent'
  );

  // Wait for conditional tools to be registered after oninitialized
  logInfo('Waiting for conditional tools to register...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Re-list tools to get conditional ones
  const toolsResult = await client.listTools();
  const allTools = toolsResult.tools || [];
  logInfo(`After wait: found ${allTools.length} tool(s)`);

  // First try trigger-agentic-sampling (requires sampling.tools)
  const agenticTool = allTools.find((t) => t.name === 'trigger-agentic-sampling');
  // Fall back to trigger-sampling-request (just requires sampling)
  const samplingTool = allTools.find((t) => t.name === 'trigger-sampling-request');

  if (!agenticTool && !samplingTool) {
    logInfo('No sampling trigger tools available on this server');
    logInfo(`Available tools: ${allTools.map(t => t.name).join(', ')}`);
    return;
  }

  const toolToUse = agenticTool || samplingTool;
  const isAgenticTool = !!agenticTool;

  logInfo(`Calling ${toolToUse!.name} tool...`);
  if (isAgenticTool) {
    logInfo('(This will trigger a sampling request WITH tools from the server)');
  } else {
    logInfo('(This will trigger a basic sampling request from the server)');
  }

  try {
    const toolArgs = isAgenticTool
      ? { prompt: 'What is 2+2?', availableTools: ['add'], maxIterations: 1 }
      : { prompt: 'Say hello', maxTokens: 100 };

    const result = await client.callTool({
      name: toolToUse!.name,
      arguments: toolArgs,
    });

    if (samplingRequestReceived) {
      logSuccess('Sampling with tools flow completed!');
      logInfo(`Received ${receivedTools.length} tool(s) in sampling request`);
    } else {
      logError('No sampling request was received');
    }

    logInfo(`Tool result: ${JSON.stringify(result.content).slice(0, 100)}...`);
  } catch (error) {
    // This is expected if we don't have an actual LLM configured
    logInfo(`Tool call ended: ${error instanceof Error ? error.message : 'completed'}`);

    if (samplingRequestReceived && receivedTools.length > 0) {
      logSuccess('SUCCESS: Received sampling request with tools!');
    }
  }
}

async function testResourceAccess(client: ReturnType<typeof createMcpClient>) {
  logSection('Testing Resource Access');

  try {
    const resourcesResult = await client.listResources();
    const resources = resourcesResult.resources || [];
    logSuccess(`Found ${resources.length} resource(s)`);

    if (resources.length > 0) {
      logInfo(`Resources: ${resources.slice(0, 3).map((r) => r.name || r.uri).join(', ')}${resources.length > 3 ? '...' : ''}`);

      // Try to read first resource
      const first = resources[0];
      logInfo(`Reading resource: ${first.uri}`);
      const content = await client.readResource({ uri: first.uri });
      logSuccess(`Resource content type: ${content.contents[0]?.mimeType || 'unknown'}`);
    }
  } catch (error) {
    logError(`Resource access failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function testPromptAccess(client: ReturnType<typeof createMcpClient>) {
  logSection('Testing Prompt Access');

  try {
    const promptsResult = await client.listPrompts();
    const prompts = promptsResult.prompts || [];
    logSuccess(`Found ${prompts.length} prompt(s)`);

    if (prompts.length > 0) {
      logInfo(`Prompts: ${prompts.slice(0, 3).map((p) => p.name).join(', ')}${prompts.length > 3 ? '...' : ''}`);
    }
  } catch (error) {
    logError(`Prompt access failed: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  console.log();
  log('Inspector Core CLI Test', colors.cyan);
  log('========================', colors.cyan);

  // Get testing profile
  const profiles = getDefaultTestingProfiles();
  const profile = profiles.find((p) => p.id === options.profileId);
  if (!profile) {
    logError(`Unknown profile: ${options.profileId}`);
    logInfo(`Available profiles: ${profiles.map(p => p.id).join(', ')}`);
    process.exit(1);
  }
  logInfo(`Using profile: ${profile.name}`);

  // Unit tests (no server needed)
  await testMemoryRepositories();
  await testSamplingWithToolsTypes();

  if (options.unitOnly) {
    console.log();
    log('Unit tests complete!', colors.green);
    return;
  }

  // Integration tests (server required)
  const connection = await testMcpConnection();

  if (connection) {
    const { client, serverInfo } = connection;

    await testCapabilities(client);
    await testSamplingWithProfile(client, profile);
    await testToolExecution(client);
    await testResourceAccess(client);
    await testPromptAccess(client);
    await testSamplingWithToolsLive(client);

    logSection('Cleanup');
    await disconnectClient(client);
    logSuccess('Disconnected from server');
  }

  console.log();
  log('Tests complete!', colors.green);
}

main().catch((error) => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
