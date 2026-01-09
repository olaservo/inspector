/**
 * useTrackedMcpTools - Hook for MCP tool operations with history tracking
 *
 * Wraps useMcpTools to automatically log tool executions to History and Logs contexts.
 * Use this instead of useMcpTools when you want request tracking.
 *
 * Usage:
 *   const { tools, executeToolTracked } = useTrackedMcpTools();
 *   const result = await executeToolTracked('echo', { message: 'hello' });
 */

import { useCallback } from 'react';
import { useMcpTools, type UseMcpToolsResult, type ToolResult } from './useMcpTools';
import { useHistory } from '@/context/HistoryContext';
import { useLogs } from '@/context/LogsContext';

export interface UseTrackedMcpToolsResult extends UseMcpToolsResult {
  /** Execute a tool with automatic history and log tracking */
  executeToolTracked: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ result: ToolResult; requestId: string }>;
}

/**
 * Hook to access and execute MCP tools with automatic tracking.
 */
export function useTrackedMcpTools(): UseTrackedMcpToolsResult {
  const mcpTools = useMcpTools();
  const { addRequest, updateRequest } = useHistory();
  const { addLog } = useLogs();

  /**
   * Execute a tool with automatic tracking.
   */
  const executeToolTracked = useCallback(
    async (
      name: string,
      args: Record<string, unknown>
    ): Promise<{ result: ToolResult; requestId: string }> => {
      const startTime = Date.now();

      // Create history entry before execution
      const requestId = addRequest({
        method: 'tools/call',
        target: name,
        params: { name, arguments: args },
        duration: 0,
        success: false, // Will be updated after execution
        requestType: 'primary',
      });

      // Log request
      addLog('info', `Executing tool: ${name}`, 'tools', requestId);
      addLog('debug', `Tool arguments: ${JSON.stringify(args)}`, 'tools', requestId);

      try {
        // Execute the tool
        const result = await mcpTools.executeTool(name, args);
        const duration = Date.now() - startTime;

        // Update history with success
        updateRequest(requestId, {
          response: result as Record<string, unknown>,
          duration,
          success: !result.isError,
        });

        // Log response
        if (result.isError) {
          addLog('error', `Tool ${name} returned error`, 'tools', requestId);
        } else {
          addLog('info', `Tool ${name} completed successfully (${duration}ms)`, 'tools', requestId);
        }

        return { result, requestId };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Update history with failure
        updateRequest(requestId, {
          response: { error: errorMessage },
          duration,
          success: false,
        });

        // Log error
        addLog('error', `Tool ${name} failed: ${errorMessage}`, 'tools', requestId);

        throw error;
      }
    },
    [mcpTools, addRequest, updateRequest, addLog]
  );

  return {
    ...mcpTools,
    executeToolTracked,
  };
}
