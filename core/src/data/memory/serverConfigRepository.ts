/**
 * In-memory implementation of ServerConfigRepository
 *
 * Provides a simple Map-based storage for development and testing.
 * Data is lost when the process exits.
 */

import type { ServerConfigRepository } from '../repositories.js';
import type { ServerConfig } from '../../types/servers.js';

/**
 * Generate a unique ID for a server config
 */
function generateId(): string {
  return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an in-memory server config repository
 */
export function createMemoryServerConfigRepository(): ServerConfigRepository {
  const store = new Map<string, ServerConfig>();

  return {
    async list(): Promise<ServerConfig[]> {
      return Array.from(store.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id: string): Promise<ServerConfig | undefined> {
      return store.get(id);
    },

    async create(
      config: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<ServerConfig> {
      const now = new Date().toISOString();
      const newConfig: ServerConfig = {
        ...config,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      store.set(newConfig.id, newConfig);
      return newConfig;
    },

    async update(
      id: string,
      updates: Partial<Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<ServerConfig> {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`Server config not found: ${id}`);
      }
      const updated: ServerConfig = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      store.delete(id);
    },

    async deleteAll(): Promise<void> {
      store.clear();
    },
  };
}
