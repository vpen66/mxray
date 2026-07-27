import React from 'react';
import { Trash2, Search, Play, Pause } from 'lucide-react';
import { useLogStore } from '../stores/useLogStore';

export const LogsPage: React.FC = () => {
  const { logs, logLevel, searchQuery, autoScroll, clearLogs, setLogLevel, setSearchQuery, setAutoScroll } = useLogStore();

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 font-bold';
      case 'warning':
        return 'text-amber-400 font-semibold';
      case 'debug':
        return 'text-cyan-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">实时运行日志 (Logs)</h2>
          <p className="text-xs text-slate-400">对接 Xray LoggerService gRPC 实时日志管道与控制台输出</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoScroll ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' : 'bg-slate-900 text-slate-400 border-white/10'
            }`}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoScroll ? '暂停滚屏' : '自动滚屏'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Level Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/10 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索日志关键字..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          {['all', 'info', 'warning', 'error', 'debug'].map((level) => (
            <button
              key={level}
              onClick={() => setLogLevel(level)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                logLevel === level
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Log Console Container */}
      <div className="glass-card flex-1 min-h-[420px] rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-1.5 border border-white/10 bg-slate-950/90 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">暂无符合条件的日志</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors">
              <span className="text-slate-500 select-none">{log.timestamp}</span>
              <span className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 ${getLevelBadge(log.level)}`}>
                {log.level}
              </span>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
