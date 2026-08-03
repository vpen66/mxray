import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
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
  loadHistoricalLogs: () => Promise<void>;
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
    let pending: Array<{ level: LogEntry['level']; message: string }> = [];
    const flushTimer = window.setInterval(() => {
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      useLogStore.setState((state) => {
        const entries = batch.map(({ level, message }) => ({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
          ...parseXrayLog(message, level),
        }));
        return { logs: [...state.logs, ...entries].slice(-500) };
      });
    }, 100);
    listen<{ level: string; message: string }>('xray-log', (event) => {
      const validLevels: Array<LogEntry['level']> = ['debug', 'info', 'warning', 'error'];
      const rawLevel = event.payload.level?.toLowerCase() || 'info';
      const level: LogEntry['level'] = validLevels.includes(rawLevel as any)
        ? (rawLevel as LogEntry['level'])
        : 'info';
      pending.push({ level, message: event.payload.message });
    })
      .then((unsub) => {
        unlisten = unsub;
      })
      .catch(() => {
        // Fallback for web mode
      });

    return () => {
      window.clearInterval(flushTimer);
      if (unlisten) unlisten();
    };
  },

  // 回填后台内核的历史日志：接管保活残留内核时，GUI setup 阶段的
  // emit 可能早于前端监听注册导致历史日志丢失，需主动拉取一次。
  // 若实时事件已到达（logs 非空）则跳过，避免重复
  loadHistoricalLogs: async () => {
    try {
      const lines = await invoke<Array<{ level: string; message: string }>>(
        'get_recent_runtime_logs',
      );
      if (!lines || lines.length === 0) return;
      const validLevels: Array<LogEntry['level']> = ['debug', 'info', 'warning', 'error'];
      useLogStore.setState((state) => {
        if (state.logs.length > 0) return state;
        const entries = lines.map(({ level: rawLevel, message }) => {
          const normalized = rawLevel?.toLowerCase() || 'info';
          const level: LogEntry['level'] = validLevels.includes(normalized as LogEntry['level'])
            ? (normalized as LogEntry['level'])
            : 'info';
          return {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            level,
            message,
            ...parseXrayLog(message, level),
          };
        });
        return { logs: entries.slice(-500) };
      });
    } catch {
      // 非 Tauri 环境或后端不可用时静默忽略
    }
  },
}));
