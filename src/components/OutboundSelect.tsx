import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Zap, Ban, Layers, Server, Search } from 'lucide-react';

export interface ProxyGroupOption {
  id: string;
  name: string;
  type: string;
}

export interface NodeOption {
  id: string;
  name: string;
}

interface OutboundSelectProps {
  value: string;
  onChange: (value: string) => void;
  proxyGroups: ProxyGroupOption[];
  allNodes: NodeOption[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const OutboundSelect: React.FC<OutboundSelectProps> = ({
  value,
  onChange,
  proxyGroups,
  allNodes,
  size = 'sm',
  className = '',
  fullWidth = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent of open state change
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Helper to render current value label & icon
  const renderCurrentValue = () => {
    if (value === 'direct' || value === '直连') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>直连 (direct)</span>
        </span>
      );
    }
    if (value === 'proxy' || value === '代理') {
      if (allNodes.length > 0) {
        return (
          <span className="flex items-center gap-1.5 text-purple-300 font-semibold truncate">
            <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>节点: {allNodes[0].name}</span>
          </span>
        );
      }
      if (proxyGroups.length > 0) {
        return (
          <span className="flex items-center gap-1.5 text-blue-300 font-semibold truncate">
            <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{proxyGroups[0].name}</span>
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>直连 (direct)</span>
        </span>
      );
    }
    if (value === 'block' || value === 'reject' || value === '拒绝') {
      return (
        <span className="flex items-center gap-1.5 text-rose-400 font-semibold truncate">
          <Ban className="w-3.5 h-3.5 shrink-0" />
          <span>拒绝 (block)</span>
        </span>
      );
    }

    const matchedGroup = proxyGroups.find(
      (g) => g.name === value || g.id === value || (value && (value.startsWith(g.name) || value.includes(g.id)))
    );
    if (matchedGroup) {
      return (
        <span className="flex items-center gap-1.5 text-blue-300 font-semibold truncate">
          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{matchedGroup.name}</span>
          <span className="text-[10px] text-blue-400/70 font-mono bg-blue-500/10 px-1 rounded border border-blue-500/20">
            {matchedGroup.type}
          </span>
        </span>
      );
    }

    const matchedNode = allNodes.find(
      (n) => n.name === value || n.id === value || (value && (value.startsWith(n.name) || value.includes(n.id)))
    );
    if (matchedNode) {
      return (
        <span className="flex items-center gap-1.5 text-purple-300 font-semibold truncate">
          <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>节点: {matchedNode.name}</span>
        </span>
      );
    }

    return (
      <span className="text-slate-200 font-semibold truncate">
        {value || '选择出站目标'}
      </span>
    );
  };

  const actionOptions = [
    { value: 'direct', label: '直连 (direct)', color: 'text-emerald-400', icon: Zap },
    { value: 'block', label: '拒绝 (block)', color: 'text-rose-400', icon: Ban },
  ];

  const filteredActions = actionOptions.filter((a) =>
    a.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredGroups = proxyGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredNodes = allNodes.filter((n) =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalResults = filteredActions.length + filteredGroups.length + filteredNodes.length;

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs min-h-[32px]'
      : size === 'md'
      ? 'px-3.5 py-2 text-xs sm:text-sm min-h-[38px]'
      : 'px-4 py-2.5 text-sm min-h-[44px]';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-950 hover:bg-slate-900 border ${
          isOpen
            ? 'border-blue-500/70 ring-2 ring-blue-500/20 bg-slate-900'
            : 'border-white/10 hover:border-white/20'
        } rounded-xl ${sizeClasses} transition-all duration-150 text-left cursor-pointer focus:outline-none`}
      >
        <div className="flex items-center min-w-0 overflow-hidden">
          {renderCurrentValue()}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            fullWidth ? 'left-0 right-0 w-full' : 'right-0 min-w-[220px]'
          } top-[calc(100%+6px)] max-h-72 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 z-[100] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Optional Search inside dropdown if there are many options */}
          {(proxyGroups.length + allNodes.length > 5) && (
            <div className="p-2 border-b border-white/5 bg-slate-950/50">
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="搜索目标/节点..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options Scroll List */}
          <div className="p-1.5 overflow-y-auto overscroll-contain space-y-2 text-xs custom-scrollbar">
            {totalResults === 0 && (
              <div className="py-4 text-center text-slate-500 text-xs">
                未找到匹配的出站目标
              </div>
            )}

            {/* Group 1: 基础动作 */}
            {filteredActions.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  基础动作 (Actions)
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredActions.map((act) => {
                    const isSelected = value === act.value;
                    const IconComp = act.icon;
                    return (
                      <button
                        key={act.value}
                        type="button"
                        onClick={() => handleSelect(act.value)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComp className={`w-3.5 h-3.5 ${act.color}`} />
                          <span>{act.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 2: 代理策略组 */}
            {filteredGroups.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-blue-400" />
                  代理策略组 (Proxy Groups)
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredGroups.map((g) => {
                    const isSelected = value === g.name || value === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelect(g.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate">{g.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-white/5 shrink-0">
                            {g.type}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 3: 指定单个节点 */}
            {filteredNodes.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Server className="w-3 h-3 text-purple-400" />
                  指定单个节点 (Nodes)
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredNodes.map((n) => {
                    const isSelected = value === n.name || value === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleSelect(n.name)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">节点: {n.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
