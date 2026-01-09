/**
 * LogsContext - Track MCP protocol event logs
 *
 * Provides protocol-level logging with localStorage persistence
 * and request correlation for filtering logs by request chain.
 *
 * Usage:
 *   import { LogsProvider, useLogs } from '@/context/LogsContext';
 *
 *   // In component
 *   const { logs, addLog, clearAll, exportLogs } = useLogs();
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
  type LogEntry,
  type LogLevel,
  createLogEntry,
  MAX_LOG_ENTRIES,
} from '@/types/logs';
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '@/lib/storage';

// State
interface LogsState {
  entries: LogEntry[];
  isLoaded: boolean;
}

// Actions
type LogsAction =
  | { type: 'LOAD_FROM_STORAGE'; entries: LogEntry[] }
  | { type: 'ADD_LOG'; entry: LogEntry }
  | { type: 'ADD_LOGS'; entries: LogEntry[] }
  | { type: 'CLEAR_ALL' };

// Initial state
const initialState: LogsState = {
  entries: [],
  isLoaded: false,
};

/**
 * Enforce max entries limit (remove oldest first).
 */
function enforceLimit(entries: LogEntry[]): LogEntry[] {
  if (entries.length <= MAX_LOG_ENTRIES) {
    return entries;
  }
  return entries.slice(0, MAX_LOG_ENTRIES);
}

// Reducer
function logsReducer(state: LogsState, action: LogsAction): LogsState {
  switch (action.type) {
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        entries: action.entries,
        isLoaded: true,
      };

    case 'ADD_LOG':
      return {
        ...state,
        entries: enforceLimit([action.entry, ...state.entries]),
      };

    case 'ADD_LOGS':
      return {
        ...state,
        entries: enforceLimit([...action.entries, ...state.entries]),
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        entries: [],
      };

    default:
      return state;
  }
}

// Context value interface
interface LogsContextValue {
  /** All log entries (newest first) */
  logs: LogEntry[];
  /** Whether logs have been loaded from storage */
  isLoaded: boolean;
  /** Add a single log entry */
  addLog: (
    level: LogLevel,
    message: string,
    logger: string,
    requestId?: string,
    parentRequestId?: string
  ) => void;
  /** Add multiple log entries at once */
  addLogs: (entries: LogEntry[]) => void;
  /** Clear all log entries */
  clearAll: () => void;
  /** Export logs in specified format */
  exportLogs: (format: 'json' | 'text') => string;
  /** Get logs for a specific request chain (request + parent + siblings) */
  getLogsForRequest: (requestId: string) => LogEntry[];
}

// Context
const LogsContext = createContext<LogsContextValue | null>(null);

// Provider props
interface LogsProviderProps {
  children: ReactNode;
}

/**
 * LogsProvider - Wrap your app with this to enable protocol logging.
 */
export function LogsProvider({ children }: LogsProviderProps) {
  const [state, dispatch] = useReducer(logsReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage<LogEntry[]>(STORAGE_KEYS.LOGS, []);
    dispatch({ type: 'LOAD_FROM_STORAGE', entries: stored });
  }, []);

  // Save to localStorage whenever entries change (after initial load)
  useEffect(() => {
    if (state.isLoaded) {
      saveToStorage(STORAGE_KEYS.LOGS, state.entries);
    }
  }, [state.entries, state.isLoaded]);

  /**
   * Add a single log entry.
   */
  const addLog = useCallback(
    (
      level: LogLevel,
      message: string,
      logger: string,
      requestId?: string,
      parentRequestId?: string
    ) => {
      const entry = createLogEntry(level, message, logger, requestId, parentRequestId);
      dispatch({ type: 'ADD_LOG', entry });
    },
    []
  );

  /**
   * Add multiple log entries at once.
   */
  const addLogs = useCallback((entries: LogEntry[]) => {
    dispatch({ type: 'ADD_LOGS', entries });
  }, []);

  /**
   * Clear all log entries.
   */
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  /**
   * Export logs in specified format.
   */
  const exportLogs = useCallback(
    (format: 'json' | 'text'): string => {
      if (format === 'json') {
        return JSON.stringify(state.entries, null, 2);
      }

      // Text format
      return state.entries
        .map((entry) => {
          const prefix = entry.requestId
            ? `[${entry.requestId}${entry.parentRequestId ? ` < ${entry.parentRequestId}` : ''}] `
            : '';
          return `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.logger}] ${prefix}${entry.message}`;
        })
        .join('\n');
    },
    [state.entries]
  );

  /**
   * Get logs for a specific request chain.
   * Returns logs for the request, its parent, and all siblings.
   */
  const getLogsForRequest = useCallback(
    (requestId: string): LogEntry[] => {
      // Find the target log to get its parent
      const targetLog = state.entries.find((e) => e.requestId === requestId);
      const parentId = targetLog?.parentRequestId;

      return state.entries.filter((entry) => {
        // Include if this is the target request
        if (entry.requestId === requestId) return true;
        // Include if this is the parent
        if (parentId && entry.requestId === parentId) return true;
        // Include if this is a sibling (same parent)
        if (parentId && entry.parentRequestId === parentId) return true;
        // Include children of the target
        if (entry.parentRequestId === requestId) return true;
        return false;
      });
    },
    [state.entries]
  );

  const value: LogsContextValue = {
    logs: state.entries,
    isLoaded: state.isLoaded,
    addLog,
    addLogs,
    clearAll,
    exportLogs,
    getLogsForRequest,
  };

  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  );
}

/**
 * Hook to access logs context.
 */
export function useLogs(): LogsContextValue {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
}

/**
 * Hook to get logs filtered by log level.
 */
export function useLogsByLevel(levels: LogLevel[]): LogEntry[] {
  const { logs } = useLogs();
  return logs.filter((entry) => levels.includes(entry.level as LogLevel));
}

/**
 * Hook to get logs for a specific logger category.
 */
export function useLogsByLogger(logger: string): LogEntry[] {
  const { logs } = useLogs();
  return logs.filter((entry) => entry.logger === logger);
}
