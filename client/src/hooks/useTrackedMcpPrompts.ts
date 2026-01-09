/**
 * useTrackedMcpPrompts - Hook for MCP prompt operations with history tracking
 *
 * Wraps useMcpPrompts to automatically log prompt gets to History and Logs contexts.
 * Use this instead of useMcpPrompts when you want request tracking.
 *
 * Usage:
 *   const { prompts, getPromptTracked } = useTrackedMcpPrompts();
 *   const result = await getPromptTracked('greeting', { name: 'John' });
 */

import { useCallback } from 'react';
import {
  useMcpPrompts,
  type UseMcpPromptsResult,
} from './useMcpPrompts';
import { useHistory } from '@/context/HistoryContext';
import { useLogs } from '@/context/LogsContext';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export interface UseTrackedMcpPromptsResult extends UseMcpPromptsResult {
  /** Get a prompt with automatic history and log tracking */
  getPromptTracked: (
    name: string,
    args?: Record<string, string>
  ) => Promise<{ result: GetPromptResult; requestId: string }>;
}

/**
 * Hook to access and get MCP prompts with automatic tracking.
 */
export function useTrackedMcpPrompts(): UseTrackedMcpPromptsResult {
  const mcpPrompts = useMcpPrompts();
  const { addRequest, updateRequest } = useHistory();
  const { addLog } = useLogs();

  /**
   * Get a prompt with automatic tracking.
   */
  const getPromptTracked = useCallback(
    async (
      name: string,
      args?: Record<string, string>
    ): Promise<{ result: GetPromptResult; requestId: string }> => {
      const startTime = Date.now();

      // Create history entry before get
      const requestId = addRequest({
        method: 'prompts/get',
        target: name,
        params: { name, arguments: args },
        duration: 0,
        success: false,
        requestType: 'primary',
      });

      // Log request
      addLog('info', `Getting prompt: ${name}`, 'prompts', requestId);
      if (args && Object.keys(args).length > 0) {
        addLog('debug', `Prompt arguments: ${JSON.stringify(args)}`, 'prompts', requestId);
      }

      try {
        // Get the prompt
        const result = await mcpPrompts.getPrompt(name, args);
        const duration = Date.now() - startTime;

        // Summarize messages for history
        const messageSummary = result.messages?.map((m) => ({
          role: m.role,
          contentType: m.content.type,
          // Truncate text content for storage
          preview: m.content.type === 'text' && typeof m.content.text === 'string'
            ? m.content.text.length > 200 ? m.content.text.substring(0, 200) + '...' : m.content.text
            : undefined,
        }));

        // Update history with success
        updateRequest(requestId, {
          response: {
            description: result.description,
            messages: messageSummary,
          },
          duration,
          success: true,
        });

        // Log response
        const messageCount = result.messages?.length || 0;
        addLog('info', `Prompt retrieved: ${messageCount} message(s) (${duration}ms)`, 'prompts', requestId);

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
        addLog('error', `Prompt get failed: ${errorMessage}`, 'prompts', requestId);

        throw error;
      }
    },
    [mcpPrompts, addRequest, updateRequest, addLog]
  );

  return {
    ...mcpPrompts,
    getPromptTracked,
  };
}
