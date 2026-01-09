/**
 * localStorage utilities for MCP Inspector
 *
 * Provides typed access to localStorage with JSON serialization
 * and a consistent key prefix to avoid collisions.
 */

const STORAGE_PREFIX = 'mcp-inspector:';

/**
 * Load data from localStorage with JSON parsing.
 * Returns defaultValue if key doesn't exist or parsing fails.
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(prefixedKey);
    if (stored === null) {
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  } catch (error) {
    console.warn(`[Storage] Failed to load '${key}':`, error);
    return defaultValue;
  }
}

/**
 * Save data to localStorage with JSON serialization.
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.setItem(prefixedKey, JSON.stringify(value));
  } catch (error) {
    console.error(`[Storage] Failed to save '${key}':`, error);
  }
}

/**
 * Remove a specific key from localStorage.
 */
export function clearStorage(key: string): void {
  try {
    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
  } catch (error) {
    console.error(`[Storage] Failed to clear '${key}':`, error);
  }
}

/**
 * Remove all MCP Inspector keys from localStorage.
 */
export function clearAllInspectorStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('[Storage] Failed to clear all inspector storage:', error);
  }
}

/**
 * Generate a unique ID for new entries.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Storage keys used by the application.
 */
export const STORAGE_KEYS = {
  SERVERS: 'servers',
  HISTORY: 'history',
  LOGS: 'logs',
  PROFILES: 'profiles',
} as const;
