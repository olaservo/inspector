/**
 * useTrackedMcpResources - Hook for MCP resource operations with history tracking
 *
 * Wraps useMcpResources to automatically log resource reads to History and Logs contexts.
 * Use this instead of useMcpResources when you want request tracking.
 *
 * Usage:
 *   const { resources, readResourceTracked } = useTrackedMcpResources();
 *   const content = await readResourceTracked('file:///config.json');
 */

import { useCallback } from 'react';
import {
  useMcpResources,
  type UseMcpResourcesResult,
} from './useMcpResources';
import { useHistory } from '@/context/HistoryContext';
import { useLogs } from '@/context/LogsContext';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export interface UseTrackedMcpResourcesResult extends UseMcpResourcesResult {
  /** Read a resource with automatic history and log tracking */
  readResourceTracked: (uri: string) => Promise<{ result: ReadResourceResult; requestId: string }>;
}

/**
 * Hook to access and read MCP resources with automatic tracking.
 */
export function useTrackedMcpResources(): UseTrackedMcpResourcesResult {
  const mcpResources = useMcpResources();
  const { addRequest, updateRequest } = useHistory();
  const { addLog } = useLogs();

  /**
   * Read a resource with automatic tracking.
   */
  const readResourceTracked = useCallback(
    async (uri: string): Promise<{ result: ReadResourceResult; requestId: string }> => {
      const startTime = Date.now();

      // Create history entry before read
      const requestId = addRequest({
        method: 'resources/read',
        target: uri,
        params: { uri },
        duration: 0,
        success: false,
        requestType: 'primary',
      });

      // Log request
      addLog('info', `Reading resource: ${uri}`, 'resources', requestId);

      try {
        // Read the resource
        const result = await mcpResources.readResource(uri);
        const duration = Date.now() - startTime;

        // Summarize content for history (avoid storing huge blobs)
        const contentSummary = result.contents?.map((c) => ({
          uri: c.uri,
          mimeType: c.mimeType,
          // Truncate text content for storage
          text: 'text' in c && typeof c.text === 'string'
            ? c.text.length > 500 ? c.text.substring(0, 500) + '...' : c.text
            : undefined,
          hasBlob: 'blob' in c,
        }));

        // Update history with success
        updateRequest(requestId, {
          response: { contents: contentSummary },
          duration,
          success: true,
        });

        // Log response
        const contentCount = result.contents?.length || 0;
        addLog('info', `Resource read complete: ${contentCount} content item(s) (${duration}ms)`, 'resources', requestId);

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
        addLog('error', `Resource read failed: ${errorMessage}`, 'resources', requestId);

        throw error;
      }
    },
    [mcpResources, addRequest, updateRequest, addLog]
  );

  return {
    ...mcpResources,
    readResourceTracked,
  };
}
