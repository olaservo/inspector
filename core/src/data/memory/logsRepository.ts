/**
 * In-memory implementation of LogsRepository
 *
 * Provides a simple array-based storage for development and testing.
 * Supports filtering by level, logger, and request ID.
 */

import type { LogsRepository, LogsListOptions } from '../repositories.js';
import type { LogEntry, LogLevel } from '../../types/logs.js';
import { LOG_LEVELS, MAX_LOG_ENTRIES } from '../../types/logs.js';

/**
 * Get the severity index of a log level (lower = less severe)
 */
function getLevelIndex(level: LogLevel): number {
  return LOG_LEVELS.indexOf(level);
}

/**
 * Create an in-memory logs repository
 */
export function createMemoryLogsRepository(): LogsRepository {
  const entries: LogEntry[] = [];

  /**
   * Enforce maximum entries limit (FIFO)
   */
  function enforceLimit(): void {
    while (entries.length > MAX_LOG_ENTRIES) {
      entries.shift();
    }
  }

  return {
    async list(options?: LogsListOptions): Promise<LogEntry[]> {
      let result = [...entries];

      // Filter by minimum level
      if (options?.minLevel) {
        const minIndex = getLevelIndex(options.minLevel);
        result = result.filter((e) => getLevelIndex(e.level) >= minIndex);
      }

      // Filter by logger
      if (options?.logger) {
        result = result.filter((e) => e.logger === options.logger);
      }

      // Filter by request ID
      if (options?.requestId) {
        result = result.filter((e) => e.requestId === options.requestId);
      }

      // Sort by timestamp descending (newest first)
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit && options.limit > 0) {
        result = result.slice(0, options.limit);
      }

      return result;
    },

    async add(entry: Omit<LogEntry, 'timestamp'>): Promise<LogEntry> {
      const newEntry: LogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };
      entries.push(newEntry);
      enforceLimit();
      return newEntry;
    },

    async addBatch(batch: Array<Omit<LogEntry, 'timestamp'>>): Promise<LogEntry[]> {
      const now = new Date().toISOString();
      const newEntries: LogEntry[] = batch.map((entry, index) => ({
        ...entry,
        // Add small offset to preserve order within batch
        timestamp: new Date(Date.now() + index).toISOString(),
      }));
      entries.push(...newEntries);
      enforceLimit();
      return newEntries;
    },

    async deleteAll(): Promise<void> {
      entries.length = 0;
    },

    async getForRequest(requestId: string): Promise<LogEntry[]> {
      // Get logs for this request and any child requests
      const result = entries.filter(
        (e) => e.requestId === requestId || e.parentRequestId === requestId
      );
      return result.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
  };
}
