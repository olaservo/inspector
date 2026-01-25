/**
 * In-memory implementation of TestingProfileRepository
 *
 * Provides a simple Map-based storage for development and testing.
 * Includes default profiles as specified in v2_storage.md.
 */

import type { TestingProfileRepository } from '../repositories.js';
import type { TestingProfile } from '../../types/testingProfiles.js';

/**
 * Generate a unique ID for a testing profile
 */
function generateId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default testing profiles per v2_storage.md spec
 */
const DEFAULT_PROFILES: TestingProfile[] = [
  {
    id: 'manual',
    name: 'Manual',
    description: 'Respond to requests manually (no auto-approve)',
    samplingProvider: 'manual',
    autoRespond: false,
  },
  {
    id: 'auto-approve',
    name: 'Auto-Approve',
    description: 'Automatically approve with default response',
    samplingProvider: 'mock',
    autoRespond: true,
    defaultResponse: 'This is an automated test response.',
    defaultModel: 'mock-model',
    defaultStopReason: 'endTurn',
    elicitationAutoRespond: true,
    elicitationDefaults: {},
  },
];

/**
 * Create an in-memory testing profile repository
 *
 * @param includeDefaults - Whether to include default profiles (default: true)
 */
export function createMemoryTestingProfileRepository(
  includeDefaults = true
): TestingProfileRepository {
  const store = new Map<string, TestingProfile>();

  // Initialize with default profiles
  if (includeDefaults) {
    for (const profile of DEFAULT_PROFILES) {
      store.set(profile.id, { ...profile });
    }
  }

  return {
    async list(): Promise<TestingProfile[]> {
      return Array.from(store.values());
    },

    async get(id: string): Promise<TestingProfile | undefined> {
      return store.get(id);
    },

    async create(profile: Omit<TestingProfile, 'id'>): Promise<TestingProfile> {
      const newProfile: TestingProfile = {
        ...profile,
        id: generateId(),
      };
      store.set(newProfile.id, newProfile);
      return newProfile;
    },

    async update(
      id: string,
      updates: Partial<Omit<TestingProfile, 'id'>>
    ): Promise<TestingProfile> {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`Testing profile not found: ${id}`);
      }
      const updated: TestingProfile = {
        ...existing,
        ...updates,
      };
      store.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      store.delete(id);
    },
  };
}

/**
 * Get the default testing profiles
 */
export function getDefaultTestingProfiles(): TestingProfile[] {
  return DEFAULT_PROFILES.map((p) => ({ ...p }));
}
