import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import type { LogEntry } from '../types';

interface LogStore {
  logs: LogEntry[];
  logLevel: string;
  searchQuery: string;
  autoScroll: boolean;
  addLog: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;
  setLogLevel: (level: string) => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  initLogListener: () => () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  logLevel: 'all',
  searchQuery: '',
  autoScroll: true,

  addLog: (level, message) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-500),
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),
  setLogLevel: (level) => set({ logLevel: level }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),

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
        // Fallback for non-tauri or web dev mode
      });

    return () => {
      if (unlisten) unlisten();
    };
  },
}));
