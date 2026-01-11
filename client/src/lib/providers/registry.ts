/**
 * Sampling Provider Registry
 *
 * Simple in-memory registry for sampling providers.
 * External plugins register their providers here.
 */

import type {
  SamplingProvider,
  SamplingProviderRegistry,
  ProviderRegistration,
} from '../../types/providers';

class ProviderRegistry implements SamplingProviderRegistry {
  private providers = new Map<string, ProviderRegistration>();

  register(provider: SamplingProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(
        `Provider "${provider.id}" is already registered. Replacing.`
      );
    }
    this.providers.set(provider.id, {
      provider,
      active: true,
      source: 'plugin',
    });
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): SamplingProvider | undefined {
    return this.providers.get(providerId)?.provider;
  }

  getAll(): ProviderRegistration[] {
    return Array.from(this.providers.values());
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}

// Singleton registry instance
export const providerRegistry = new ProviderRegistry();

/**
 * Register a sampling provider.
 * Call this from your plugin's entry point.
 *
 * @example
 * ```typescript
 * import { registerProvider } from '@anthropic/mcp-inspector-client';
 * import { aiSdkProvider } from './aiSdkProvider';
 *
 * registerProvider(aiSdkProvider);
 * ```
 */
export function registerProvider(provider: SamplingProvider): void {
  providerRegistry.register(provider);
}

/**
 * Get a registered provider by ID.
 */
export function getProvider(providerId: string): SamplingProvider | undefined {
  return providerRegistry.get(providerId);
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): ProviderRegistration[] {
  return providerRegistry.getAll();
}
