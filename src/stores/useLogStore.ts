import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import type { LogEntry } from '../types';
import { parseXrayLog } from '../utils/logParser';

interface LogStore {
  logs: LogEntry[];
  logLevel: string;
  categoryFilter: string;
  viewMode: 'parsed' | 'raw';
  searchQuery: string;
  autoScroll: boolean;
  aggregateDuplicates: boolean;
  addLog: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;
  setLogLevel: (level: string) => void;
  setCategoryFilter: (category: string) => void;
  setViewMode: (mode: 'parsed' | 'raw') => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setAggregateDuplicates: (aggregateDuplicates: boolean) => void;
  initLogListener: () => () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  logLevel: 'all',
  categoryFilter: 'all',
  viewMode: 'parsed',
  searchQuery: '',
  autoScroll: true,
  aggregateDuplicates: true,

  addLog: (level, message) =>
    set((state) => {
      const parsedInfo = parseXrayLog(message, level);
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        ...parsedInfo,
      };

      return {
        logs: [...state.logs.slice(-500), newEntry],
      };
    }),

  clearLogs: () => set({ logs: [] }),
  setLogLevel: (level) => set({ logLevel: level }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  setAggregateDuplicates: (aggregateDuplicates) => set({ aggregateDuplicates }),

  initLogListener: () => {
    let unlisten: (() => void) | undefined;
    listen<{ level: string; message: string }>('xray-log', (event) => {
      const validLevels: Array<LogEntry['level']> = ['debug', 'info', 'warning', 'error'];
      const rawLevel = event.payload.level?.toLowerCase() || 'info';
      const level: LogEntry['level'] = validLevels.includes(rawLevel as any)
        ? (rawLevel as LogEntry['level'])
        : 'info';
      useLogStore.getState().addLog(level, event.payload.message);
    })
      .then((unsub) => {
        unlisten = unsub;
      })
      .catch(() => {
        // Fallback for web mode
      });

    return () => {
      if (unlisten) unlisten();
    };
  },
}));
