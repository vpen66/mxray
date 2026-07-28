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

const MOCK_INITIAL_LOGS: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 60000 * 5).toLocaleTimeString(),
    level: 'info',
    message: '[MXray Core] Starting Xray-core v26.3.27 (Xray, Penetrates Everything.)',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 60000 * 4.9).toLocaleTimeString(),
    level: 'info',
    message: '[Inbound] socks-in listening on 127.0.0.1:7890 (UDP enabled)',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 60000 * 4.8).toLocaleTimeString(),
    level: 'info',
    message: '[Inbound] http-in listening on 127.0.0.1:7891',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 60000 * 4.7).toLocaleTimeString(),
    level: 'info',
    message: '[TUN] FakeDNS initialized with pool 198.18.0.0/15',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60000 * 3).toLocaleTimeString(),
    level: 'info',
    message: '[Routing] [node-vless-reality-2] matched rule: domain [geosite:google] -> proxy',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 60000 * 1.5).toLocaleTimeString(),
    level: 'warning',
    message: '[Outbound] TCP handshake to api.github.com took 148ms via REALITY-Vision',
  },
];

export const useLogStore = create<LogStore>((set) => ({
  logs: MOCK_INITIAL_LOGS,
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
