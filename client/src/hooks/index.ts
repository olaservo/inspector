// MCP hooks exports
export { useMcpTools, type UseMcpToolsResult } from './useMcpTools';
export { useMcpResources, type UseMcpResourcesResult, type Subscription } from './useMcpResources';
export { useMcpPrompts, type UseMcpPromptsResult } from './useMcpPrompts';
export { useSamplingHandler, type UseSamplingHandlerResult } from './useSamplingHandler';
export { useElicitationHandler, type UseElicitationHandlerResult } from './useElicitationHandler';

// Tracked MCP hooks (with history/logging)
export { useTrackedMcpTools, type UseTrackedMcpToolsResult } from './useTrackedMcpTools';
export { useTrackedMcpResources, type UseTrackedMcpResourcesResult } from './useTrackedMcpResources';
export { useTrackedMcpPrompts, type UseTrackedMcpPromptsResult } from './useTrackedMcpPrompts';
