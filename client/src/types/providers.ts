/**
 * Sampling Provider Interface
 *
 * This interface defines the contract for external sampling providers.
 * Plugins (like the AI SDK provider) implement this interface to provide
 * real LLM responses for MCP sampling requests.
 */

import type { SamplingRequest } from './clientRequests';
import type { SamplingResponse } from './responses';
import type { AiSdkProviderConfig } from './testingProfiles';

/**
 * Runtime context passed to providers when generating responses.
 * Contains ephemeral data like API keys that are NOT persisted.
 */
export interface SamplingProviderRuntime {
  /** API key for the LLM provider (ephemeral, not stored) */
  apiKey: string;
  /** Provider configuration from the testing profile */
  config: AiSdkProviderConfig;
}

/**
 * Result of a provider response generation.
 * Includes the response plus metadata about the generation.
 */
export interface SamplingProviderResult {
  response: SamplingResponse;
  /** Token usage information (if available) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Time taken to generate the response in milliseconds */
  durationMs?: number;
  /** Any warnings from the provider */
  warnings?: string[];
}

/**
 * Interface for sampling providers.
 * External plugins implement this to provide LLM-based responses.
 */
export interface SamplingProvider {
  /** Unique identifier for the provider */
  readonly id: string;

  /** Human-readable name for display in UI */
  readonly name: string;

  /** Optional description of the provider */
  readonly description?: string;

  /**
   * Generate a response for a sampling request.
   *
   * @param request - The MCP sampling request from the server
   * @param runtime - Runtime context including API key and config
   * @returns Promise resolving to the response with metadata
   * @throws Error if generation fails (invalid key, rate limit, etc.)
   */
  generateResponse(
    request: SamplingRequest,
    runtime: SamplingProviderRuntime
  ): Promise<SamplingProviderResult>;

  /**
   * Validate the provider configuration and API key.
   * Called before generating responses to provide early feedback.
   *
   * @param runtime - Runtime context to validate
   * @returns Promise resolving to validation result
   */
  validateConfig?(
    runtime: SamplingProviderRuntime
  ): Promise<{ valid: boolean; error?: string }>;

  /**
   * Get suggested models for this provider.
   * Used to populate model selection UI.
   */
  getSuggestedModels?(): { id: string; name: string; description?: string }[];
}

/**
 * Provider registration entry.
 * Used by the plugin registry to track available providers.
 */
export interface ProviderRegistration {
  provider: SamplingProvider;
  /** Whether this provider is currently active */
  active: boolean;
  /** Source of the provider (built-in, plugin URL, etc.) */
  source: 'built-in' | 'plugin';
}

/**
 * Provider registry interface.
 * Manages registration and lookup of sampling providers.
 */
export interface SamplingProviderRegistry {
  /** Register a new provider */
  register(provider: SamplingProvider): void;

  /** Unregister a provider by ID */
  unregister(providerId: string): void;

  /** Get a provider by ID */
  get(providerId: string): SamplingProvider | undefined;

  /** Get all registered providers */
  getAll(): ProviderRegistration[];

  /** Check if a provider is registered */
  has(providerId: string): boolean;
}
