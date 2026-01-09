/**
 * ServerConfigContext - Manage MCP server configurations
 *
 * Provides CRUD operations for server configs with localStorage persistence.
 * This context manages configuration only - runtime connection state is in McpContext.
 *
 * Usage:
 *   import { ServerConfigProvider, useServerConfig } from '@/context/ServerConfigContext';
 *
 *   // In component
 *   const { servers, addServer, updateServer, deleteServer } = useServerConfig();
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  type ServerConfig,
  createServerConfig,
} from '@/types/servers';
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '@/lib/storage';

// State
interface ServerConfigState {
  servers: ServerConfig[];
  isLoaded: boolean;
}

// Actions
type ServerConfigAction =
  | { type: 'LOAD_FROM_STORAGE'; servers: ServerConfig[] }
  | { type: 'ADD_SERVER'; server: ServerConfig }
  | { type: 'UPDATE_SERVER'; id: string; updates: Partial<ServerConfig> }
  | { type: 'DELETE_SERVER'; id: string }
  | { type: 'CLEAR_ALL' };

// Initial state
const initialState: ServerConfigState = {
  servers: [],
  isLoaded: false,
};

// Reducer
function serverConfigReducer(state: ServerConfigState, action: ServerConfigAction): ServerConfigState {
  switch (action.type) {
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        servers: action.servers,
        isLoaded: true,
      };

    case 'ADD_SERVER':
      return {
        ...state,
        servers: [...state.servers, action.server],
      };

    case 'UPDATE_SERVER':
      return {
        ...state,
        servers: state.servers.map((server) =>
          server.id === action.id
            ? { ...server, ...action.updates, updatedAt: new Date().toISOString() }
            : server
        ),
      };

    case 'DELETE_SERVER':
      return {
        ...state,
        servers: state.servers.filter((server) => server.id !== action.id),
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        servers: [],
      };

    default:
      return state;
  }
}

// Context value interface
interface ServerConfigContextValue {
  /** All server configurations */
  servers: ServerConfig[];
  /** Whether configs have been loaded from storage */
  isLoaded: boolean;
  /** Add a new server config, returns the generated ID */
  addServer: (config: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;
  /** Update an existing server config */
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  /** Delete a server config */
  deleteServer: (id: string) => void;
  /** Get a server config by ID */
  getServer: (id: string) => ServerConfig | undefined;
  /** Clear all server configs */
  clearAll: () => void;
}

// Context
const ServerConfigContext = createContext<ServerConfigContextValue | null>(null);

// Provider props
interface ServerConfigProviderProps {
  children: ReactNode;
}

/**
 * ServerConfigProvider - Wrap your app with this to enable server config management.
 */
export function ServerConfigProvider({ children }: ServerConfigProviderProps) {
  const [state, dispatch] = useReducer(serverConfigReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage<ServerConfig[]>(STORAGE_KEYS.SERVERS, []);
    dispatch({ type: 'LOAD_FROM_STORAGE', servers: stored });
  }, []);

  // Save to localStorage whenever servers change (after initial load)
  useEffect(() => {
    if (state.isLoaded) {
      saveToStorage(STORAGE_KEYS.SERVERS, state.servers);
    }
  }, [state.servers, state.isLoaded]);

  /**
   * Add a new server configuration.
   */
  const addServer = useCallback(
    (config: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>): string => {
      const server = createServerConfig(config);
      dispatch({ type: 'ADD_SERVER', server });
      return server.id;
    },
    []
  );

  /**
   * Update an existing server configuration.
   */
  const updateServer = useCallback((id: string, updates: Partial<ServerConfig>) => {
    dispatch({ type: 'UPDATE_SERVER', id, updates });
  }, []);

  /**
   * Delete a server configuration.
   */
  const deleteServer = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SERVER', id });
  }, []);

  /**
   * Get a server configuration by ID.
   */
  const getServer = useCallback(
    (id: string): ServerConfig | undefined => {
      return state.servers.find((server) => server.id === id);
    },
    [state.servers]
  );

  /**
   * Clear all server configurations.
   */
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const value: ServerConfigContextValue = {
    servers: state.servers,
    isLoaded: state.isLoaded,
    addServer,
    updateServer,
    deleteServer,
    getServer,
    clearAll,
  };

  return (
    <ServerConfigContext.Provider value={value}>
      {children}
    </ServerConfigContext.Provider>
  );
}

/**
 * Hook to access server config context.
 */
export function useServerConfig(): ServerConfigContextValue {
  const context = useContext(ServerConfigContext);
  if (!context) {
    throw new Error('useServerConfig must be used within a ServerConfigProvider');
  }
  return context;
}

/**
 * Hook to get a specific server config by ID.
 */
export function useServerConfigById(id: string): ServerConfig | undefined {
  const { getServer } = useServerConfig();
  return getServer(id);
}
