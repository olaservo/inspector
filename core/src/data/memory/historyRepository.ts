/**
 * In-memory implementation of HistoryRepository
 *
 * Provides a simple Map-based storage for development and testing.
 * Supports hierarchical queries (parent/child relationships).
 */

import type { HistoryRepository, HistoryListOptions } from '../repositories.js';
import type { HistoryEntry } from '../../types/history.js';
import { MAX_HISTORY_ENTRIES } from '../../types/history.js';

/**
 * Generate a unique ID for a history entry
 */
function generateId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an in-memory history repository
 */
export function createMemoryHistoryRepository(): HistoryRepository {
  const store = new Map<string, HistoryEntry>();

  /**
   * Enforce maximum entries limit (excluding pinned)
   */
  function enforceLimit(): void {
    const entries = Array.from(store.values())
      .filter((e) => !e.pinned)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    while (entries.length > MAX_HISTORY_ENTRIES) {
      const oldest = entries.shift();
      if (oldest) {
        store.delete(oldest.id);
      }
    }
  }

  return {
    async list(options?: HistoryListOptions): Promise<HistoryEntry[]> {
      let entries = Array.from(store.values());

      // Apply filters
      if (options?.method) {
        entries = entries.filter((e) => e.method === options.method);
      }
      if (options?.requestType) {
        entries = entries.filter((e) => e.requestType === options.requestType);
      }
      if (options?.rootOnly) {
        entries = entries.filter((e) => !e.parentRequestId);
      }

      // Sort by timestamp descending (newest first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options?.limit && options.limit > 0) {
        entries = entries.slice(0, options.limit);
      }

      return entries;
    },

    async get(id: string): Promise<HistoryEntry | undefined> {
      return store.get(id);
    },

    async add(
      entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'pinned'>
    ): Promise<HistoryEntry> {
      const newEntry: HistoryEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date().toISOString(),
        pinned: false,
      };
      store.set(newEntry.id, newEntry);
      enforceLimit();
      return newEntry;
    },

    async update(
      id: string,
      updates: Partial<Omit<HistoryEntry, 'id' | 'timestamp'>>
    ): Promise<HistoryEntry> {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`History entry not found: ${id}`);
      }
      const updated: HistoryEntry = {
        ...existing,
        ...updates,
      };
      store.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      store.delete(id);
    },

    async deleteAll(options?: { keepPinned?: boolean }): Promise<void> {
      if (options?.keepPinned) {
        const pinned = Array.from(store.values()).filter((e) => e.pinned);
        store.clear();
        for (const entry of pinned) {
          store.set(entry.id, entry);
        }
      } else {
        store.clear();
      }
    },

    async getChildren(parentRequestId: string): Promise<HistoryEntry[]> {
      return Array.from(store.values())
        .filter((e) => e.parentRequestId === parentRequestId)
        .sort((a, b) => (a.relativeTime || 0) - (b.relativeTime || 0));
    },
  };
}
