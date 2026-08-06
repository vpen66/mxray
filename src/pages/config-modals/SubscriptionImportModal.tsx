import React, { useState } from 'react';
import { X, Download, CheckCircle2, AlertCircle, Loader2, Globe } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ParsedNode {
  id: string;
  name: string;
  protocol: string;
  server: string;
  port: number;
  raw_outbound: any;
}

interface SubscriptionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (nodes: any[]) => void;
}

const PROTOCOL_LABELS: Record<string, string> = {
  vless: 'VLESS',
  vmess: 'VMess',
  trojan: 'Trojan',
  shadowsocks: 'Shadowsocks',
  hysteria: 'Hysteria2',
  hysteria2: 'Hysteria2',
  socks: 'SOCKS',
  http: 'HTTP',
};

const PROTOCOL_COLORS: Record<string, string> = {
  vless: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  vmess: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  trojan: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  shadowsocks: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  hysteria: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  hysteria2: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  socks: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  http: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
};

export const SubscriptionImportModal: React.FC<SubscriptionImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [inputText, setInputText] = useState('');
  const [parsedNodes, setParsedNodes] = useState<ParsedNode[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSubscriptionUrl = (text: string) => /^https?:\/\//i.test(text.trim());

  const handleParse = async () => {
    const text = inputText.trim();
    if (!text) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let contentToParse = text;
      // If it looks like a subscription URL, fetch remote content first
      if (isSubscriptionUrl(text)) {
        contentToParse = await invoke<string>('fetch_subscription', { url: text });
      }
      const nodesJson = await invoke<string>('parse_subscription_content', { content: contentToParse });
      const nodes: ParsedNode[] = JSON.parse(nodesJson);
      setParsedNodes(nodes);
      setSelectedIndices(new Set(nodes.map((_, i) => i)));
      setSuccessMsg(`成功解析 ${nodes.length} 个节点`);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : (err?.message || '解析失败'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedNodes.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedNodes.map((_, i) => i)));
    }
  };

  const resetState = () => {
    setInputText('');
    setParsedNodes([]);
    setSelectedIndices(new Set());
    setError(null);
    setSuccessMsg(null);
  };

  const handleImport = () => {
    const selectedNodes = parsedNodes
      .filter((_, i) => selectedIndices.has(i))
      .map(node => ({
        ...node.raw_outbound,
        tag: node.name || node.raw_outbound.tag || 'proxy',
      }));
    onImport(selectedNodes);
    resetState();
    onClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">导入订阅节点</h3>
              <p className="text-[11px] text-slate-400">支持 VLESS / VMess / Trojan / Shadowsocks / Hysteria2 协议</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error / Success Messages */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Unified Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              订阅链接或分享链接
              <span className="text-slate-500 font-normal ml-1.5">粘贴 URL 自动获取，或直接粘贴协议链接</span>
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={"https://example.com/sub/xxxxx\n\nvless://uuid@host:port?type=tcp&security=reality&...#节点名\nvmess://base64encoded...\ntrojan://password@host:port?security=tls&...#节点名\nss://base64(method:pass)@host:port#节点名\nhysteria2://password@host:port?sni=...#节点名"}
              rows={6}
              className="w-full px-3 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 font-mono resize-none"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleParse();
                }
              }}
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all font-medium"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isSubscriptionUrl(inputText) ? '获取并解析' : '解析链接'}
            </button>
          </div>

          {/* Parsed Nodes List */}
          {parsedNodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  解析结果 ({selectedIndices.size}/{parsedNodes.length} 已选择)
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {selectedIndices.size === parsedNodes.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {parsedNodes.map((node, i) => {
                  const isSelected = selectedIndices.has(i);
                  const protocolLabel = PROTOCOL_LABELS[node.protocol] || node.protocol;
                  const protocolColor = PROTOCOL_COLORS[node.protocol] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
                  return (
                    <div
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/40'
                          : 'bg-slate-950/40 border-white/5 hover:border-white/10 opacity-60'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-blue-600 border-blue-500' : 'border-white/20'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-100 truncate">{node.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono font-medium shrink-0 ${protocolColor}`}>
                            {protocolLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {node.server}:{node.port}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-between items-center">
          <p className="text-[11px] text-slate-500">
            {parsedNodes.length > 0
              ? `将导入 ${selectedIndices.size} 个节点到出站列表`
              : '支持 VLESS / VMess / Trojan / Shadowsocks / Hysteria2'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedIndices.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl shadow-lg shadow-cyan-600/20 transition-all font-medium"
            >
              <Download className="w-4 h-4" />
              导入 {selectedIndices.size > 0 ? `(${selectedIndices.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
