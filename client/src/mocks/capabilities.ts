/**
 * Default experimental capabilities configuration
 * Types are re-exported from @/types for backwards compatibility
 */

// Re-export types from proper types directory
export type { ExperimentalCapability } from '@/types/capabilities';

import type { ExperimentalCapability } from '@/types/capabilities';

// Default experimental capabilities
export const initialCapabilities: ExperimentalCapability[] = [
  {
    id: 'batch_requests',
    name: 'Batch Requests',
    description: 'Send multiple requests in a single batch for improved performance',
    enabled: false,
    warning: 'May not be supported by all servers',
  },
  {
    id: 'binary_content',
    name: 'Binary Content Support',
    description: 'Enable handling of binary content in resources and tool outputs',
    enabled: false,
  },
  {
    id: 'streaming_responses',
    name: 'Streaming Responses',
    description: 'Support for streaming responses from long-running operations',
    enabled: true,
  },
  {
    id: 'custom_metadata',
    name: 'Custom Metadata',
    description: 'Allow custom metadata in request/response headers',
    enabled: false,
  },
];
