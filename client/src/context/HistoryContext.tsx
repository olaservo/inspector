/**
 * HistoryContext - Track MCP request history
 *
 * Provides request history tracking with localStorage persistence
 * and support for hierarchical request traces (parent-child relationships).
 *
 * Usage:
 *   import { HistoryProvider, useHistory } from '@/context/HistoryContext';
 *
 *   // In component
 *   const { history, addRequest, togglePin, clearAll } = useHistory();
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
  type HistoryEntry,
  createHistoryEntry,
  MAX_HISTORY_ENTRIES,
} from '@/types/history';
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '@/lib/storage';

// State
interface HistoryState {
  entries: HistoryEntry[];
  isLoaded: boolean;
}

// Actions
type HistoryAction =
  | { type: 'LOAD_FROM_STORAGE'; entries: HistoryEntry[] }
  | { type: 'ADD_REQUEST'; entry: HistoryEntry }
  | { type: 'UPDATE_REQUEST'; id: string; updates: Partial<HistoryEntry> }
  | { type: 'ADD_CHILD_REQUEST'; parentId: string; childEntry: HistoryEntry }
  | { type: 'TOGGLE_PIN'; id: string }
  | { type: 'SET_LABEL'; id: string; label: string }
  | { type: 'CLEAR_ALL' };

// Initial state
const initialState: HistoryState = {
  entries: [],
  isLoaded: false,
};

/**
 * Enforce max entries limit, preserving pinned entries.
 */
function enforceLimit(entries: HistoryEntry[]): HistoryEntry[] {
  if (entries.length <= MAX_HISTORY_ENTRIES) {
    return entries;
  }

  const pinned = entries.filter((e) => e.pinned);
  const unpinned = entries.filter((e) => !e.pinned);

  // Keep pinned + most recent unpinned up to limit
  const unpinnedLimit = MAX_HISTORY_ENTRIES - pinned.length;
  const trimmedUnpinned = unpinned.slice(0, Math.max(0, unpinnedLimit));

  return [...pinned, ...trimmedUnpinned];
}

// Reducer
function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        entries: action.entries,
        isLoaded: true,
      };

    case 'ADD_REQUEST':
      return {
        ...state,
        entries: enforceLimit([action.entry, ...state.entries]),
      };

    case 'UPDATE_REQUEST':
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id ? { ...entry, ...action.updates } : entry
        ),
      };

    case 'ADD_CHILD_REQUEST': {
      // Add child entry and update parent's childRequestIds
      const childEntry = action.childEntry;
      const updatedEntries = state.entries.map((entry) => {
        if (entry.id === action.parentId) {
          const childIds = entry.childRequestIds || [];
          return {
            ...entry,
            childRequestIds: [...childIds, childEntry.id],
          };
        }
        return entry;
      });
      return {
        ...state,
        entries: enforceLimit([childEntry, ...updatedEntries]),
      };
    }

    case 'TOGGLE_PIN':
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id ? { ...entry, pinned: !entry.pinned } : entry
        ),
      };

    case 'SET_LABEL':
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id ? { ...entry, label: action.label } : entry
        ),
      };

    case 'CLEAR_ALL':
      // Keep pinned entries
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.pinned),
      };

    default:
      return state;
  }
}

// Context value interface
interface HistoryContextValue {
  /** All history entries (newest first) */
  history: HistoryEntry[];
  /** Whether history has been loaded from storage */
  isLoaded: boolean;
  /** Add a new request to history, returns the entry ID */
  addRequest: (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'pinned'>) => string;
  /** Update an existing request entry */
  updateRequest: (id: string, updates: Partial<HistoryEntry>) => void;
  /** Add a child request (sampling/elicitation) linked to a parent */
  addChildRequest: (parentId: string, entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'pinned'>) => string;
  /** Toggle pin status of an entry */
  togglePin: (id: string) => void;
  /** Set a label on an entry */
  setLabel: (id: string, label: string) => void;
  /** Clear all non-pinned entries */
  clearAll: () => void;
  /** Export history as JSON string */
  exportHistory: () => string;
  /** Get an entry by ID */
  getEntry: (id: string) => HistoryEntry | undefined;
}

// Context
const HistoryContext = createContext<HistoryContextValue | null>(null);

// Provider props
interface HistoryProviderProps {
  children: ReactNode;
}

/**
 * HistoryProvider - Wrap your app with this to enable history tracking.
 */
export function HistoryProvider({ children }: HistoryProviderProps) {
  const [state, dispatch] = useReducer(historyReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    dispatch({ type: 'LOAD_FROM_STORAGE', entries: stored });
  }, []);

  // Save to localStorage whenever entries change (after initial load)
  useEffect(() => {
    if (state.isLoaded) {
      saveToStorage(STORAGE_KEYS.HISTORY, state.entries);
    }
  }, [state.entries, state.isLoaded]);

  /**
   * Add a new request to history.
   */
  const addRequest = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'pinned'>): string => {
      const fullEntry = createHistoryEntry(entry);
      dispatch({ type: 'ADD_REQUEST', entry: fullEntry });
      return fullEntry.id;
    },
    []
  );

  /**
   * Update an existing request entry.
   */
  const updateRequest = useCallback((id: string, updates: Partial<HistoryEntry>) => {
    dispatch({ type: 'UPDATE_REQUEST', id, updates });
  }, []);

  /**
   * Add a child request linked to a parent.
   */
  const addChildRequest = useCallback(
    (parentId: string, entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'pinned'>): string => {
      // Find parent to calculate relative time
      const parent = state.entries.find((e) => e.id === parentId);
      const parentTime = parent ? new Date(parent.timestamp).getTime() : Date.now();
      const relativeTime = Date.now() - parentTime;

      const childEntry = createHistoryEntry({
        ...entry,
        requestType: 'client',
        parentRequestId: parentId,
        relativeTime,
      });

      dispatch({ type: 'ADD_CHILD_REQUEST', parentId, childEntry });
      return childEntry.id;
    },
    [state.entries]
  );

  /**
   * Toggle pin status of an entry.
   */
  const togglePin = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_PIN', id });
  }, []);

  /**
   * Set a label on an entry.
   */
  const setLabel = useCallback((id: string, label: string) => {
    dispatch({ type: 'SET_LABEL', id, label });
  }, []);

  /**
   * Clear all non-pinned entries.
   */
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  /**
   * Export history as JSON string.
   */
  const exportHistory = useCallback((): string => {
    return JSON.stringify(state.entries, null, 2);
  }, [state.entries]);

  /**
   * Get an entry by ID.
   */
  const getEntry = useCallback(
    (id: string): HistoryEntry | undefined => {
      return state.entries.find((entry) => entry.id === id);
    },
    [state.entries]
  );

  const value: HistoryContextValue = {
    history: state.entries,
    isLoaded: state.isLoaded,
    addRequest,
    updateRequest,
    addChildRequest,
    togglePin,
    setLabel,
    clearAll,
    exportHistory,
    getEntry,
  };

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}

/**
 * Hook to access history context.
 */
export function useHistory(): HistoryContextValue {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}

/**
 * Hook to get root (non-child) history entries.
 */
export function useRootHistory(): HistoryEntry[] {
  const { history } = useHistory();
  return history.filter((entry) => !entry.parentRequestId);
}

/**
 * Hook to get children of a specific parent entry.
 */
export function useChildHistory(parentId: string): HistoryEntry[] {
  const { history } = useHistory();
  return history.filter((entry) => entry.parentRequestId === parentId);
}
