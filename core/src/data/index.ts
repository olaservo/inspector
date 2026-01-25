/**
 * Data Layer Interfaces and Implementations
 *
 * Repository interfaces define CRUD contracts for data storage.
 * Memory implementations provided for development and testing.
 * Production implementations (proxy API, file-based) to be added
 * when proxy server is built.
 *
 * Note: Connection/execution state management is handled by UI-specific
 * patterns (React Context, Zustand stores) per v2_storage.md spec.
 */

// Repository interfaces
export type {
  ServerConfigRepository,
  HistoryRepository,
  HistoryListOptions,
  LogsRepository,
  LogsListOptions,
  TestingProfileRepository,
} from './repositories.js';

// In-memory implementations for development and testing
export {
  createMemoryServerConfigRepository,
  createMemoryHistoryRepository,
  createMemoryLogsRepository,
  createMemoryTestingProfileRepository,
  getDefaultTestingProfiles,
} from './memory/index.js';
