import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { ToggleSwitch } from '../../components/ToggleSwitch';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: any;
  onSave: (val: any) => void;
}

interface LevelEntry {
  level: string;
  handshake: string;
  connIdle: string;
  uplinkOnly: string;
  downlinkOnly: string;
  statsUserUplink: boolean;
  statsUserDownlink: boolean;
  statsUserOnline: boolean;
  bufferSize: string;
}

const inputCls = 'w-full px-3 py-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-[11px] font-medium text-slate-400 mb-1';

const emptyLevel = (lv: string): LevelEntry => ({
  level: lv, handshake: '4', connIdle: '300', uplinkOnly: '2', downlinkOnly: '5',
  statsUserUplink: false, statsUserDownlink: false, statsUserOnline: false, bufferSize: '',
});

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // levels
  const [levels, setLevels] = useState<LevelEntry[]>([emptyLevel('0')]);

  // system
  const [statsInboundUplink, setStatsInboundUplink] = useState(false);
  const [statsInboundDownlink, setStatsInboundDownlink] = useState(false);
  const [statsOutboundUplink, setStatsOutboundUplink] = useState(false);
  const [statsOutboundDownlink, setStatsOutboundDownlink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const val = initialValue || {
        levels: { '0': { handshake: 4, connIdle: 300, uplinkOnly: 2, downlinkOnly: 5 } },
        system: {},
      };
      // parse levels
      const lvArr: LevelEntry[] = [];
      if (val.levels && typeof val.levels === 'object') {
        Object.entries(val.levels).forEach(([lv, obj]: [string, any]) => {
          lvArr.push({
            level: lv,
            handshake: obj.handshake != null ? String(obj.handshake) : '4',
            connIdle: obj.connIdle != null ? String(obj.connIdle) : '300',
            uplinkOnly: obj.uplinkOnly != null ? String(obj.uplinkOnly) : '2',
            downlinkOnly: obj.downlinkOnly != null ? String(obj.downlinkOnly) : '5',
            statsUserUplink: !!obj.statsUserUplink,
            statsUserDownlink: !!obj.statsUserDownlink,
            statsUserOnline: !!obj.statsUserOnline,
            bufferSize: obj.bufferSize != null ? String(obj.bufferSize) : '',
          });
        });
      }
      setLevels(lvArr.length > 0 ? lvArr : [emptyLevel('0')]);
      // parse system
      const sys = val.system || {};
      setStatsInboundUplink(!!sys.statsInboundUplink);
      setStatsInboundDownlink(!!sys.statsInboundDownlink);
      setStatsOutboundUplink(!!sys.statsOutboundUplink);
      setStatsOutboundDownlink(!!sys.statsOutboundDownlink);

      setRawJsonText(JSON.stringify(val, null, 2));
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const buildObject = (): any => {
    const levelsObj: Record<string, any> = {};
    levels.forEach((lv) => {
      const key = lv.level.trim() || '0';
      const obj: any = {};
      if (lv.handshake.trim()) obj.handshake = Number(lv.handshake);
      if (lv.connIdle.trim()) obj.connIdle = Number(lv.connIdle);
      if (lv.uplinkOnly.trim()) obj.uplinkOnly = Number(lv.uplinkOnly);
      if (lv.downlinkOnly.trim()) obj.downlinkOnly = Number(lv.downlinkOnly);
      if (lv.statsUserUplink) obj.statsUserUplink = true;
      if (lv.statsUserDownlink) obj.statsUserDownlink = true;
      if (lv.statsUserOnline) obj.statsUserOnline = true;
      if (lv.bufferSize.trim()) obj.bufferSize = Number(lv.bufferSize);
      levelsObj[key] = obj;
    });
    const system: any = {};
    if (statsInboundUplink) system.statsInboundUplink = true;
    if (statsInboundDownlink) system.statsInboundDownlink = true;
    if (statsOutboundUplink) system.statsOutboundUplink = true;
    if (statsOutboundDownlink) system.statsOutboundDownlink = true;
    return { levels: levelsObj, system };
  };

  const handleSave = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        onSave(parsed);
        onClose();
      } catch (err: any) {
        setJsonError(`JSON 语法解析错误: ${err.message}`);
      }
    } else {
      onSave(buildObject());
      onClose();
    }
  };

  const switchToJson = () => {
    if (viewMode === 'visual') {
      setRawJsonText(JSON.stringify(buildObject(), null, 2));
    }
    setViewMode('json');
  };

  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      const lvArr: LevelEntry[] = [];
      if (parsed.levels && typeof parsed.levels === 'object') {
        Object.entries(parsed.levels).forEach(([lv, obj]: [string, any]) => {
          lvArr.push({
            level: lv,
            handshake: obj.handshake != null ? String(obj.handshake) : '4',
            connIdle: obj.connIdle != null ? String(obj.connIdle) : '300',
            uplinkOnly: obj.uplinkOnly != null ? String(obj.uplinkOnly) : '2',
            downlinkOnly: obj.downlinkOnly != null ? String(obj.downlinkOnly) : '5',
            statsUserUplink: !!obj.statsUserUplink,
            statsUserDownlink: !!obj.statsUserDownlink,
            statsUserOnline: !!obj.statsUserOnline,
            bufferSize: obj.bufferSize != null ? String(obj.bufferSize) : '',
          });
        });
      }
      setLevels(lvArr.length > 0 ? lvArr : [emptyLevel('0')]);
      const sys = parsed.system || {};
      setStatsInboundUplink(!!sys.statsInboundUplink);
      setStatsInboundDownlink(!!sys.statsInboundDownlink);
      setStatsOutboundUplink(!!sys.statsOutboundUplink);
      setStatsOutboundDownlink(!!sys.statsOutboundDownlink);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`无法切换为可视化：JSON 解析错误 (${err.message})`);
      return;
    }
    setViewMode('visual');
  };

  const addLevel = () => {
    const nextLv = levels.length > 0 ? String(Math.max(...levels.map(l => Number(l.level) || 0)) + 1) : '0';
    setLevels([...levels, emptyLevel(nextLv)]);
  };
  const removeLevel = (i: number) => setLevels(levels.filter((_, idx) => idx !== i));
  const updateLevel = (i: number, field: keyof LevelEntry, val: any) => {
    const next = [...levels];
    next[i] = { ...next[i], [field]: val };
    setLevels(next);
  };

  const ToggleRow = ({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: () => void; desc?: string }) => (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-xs text-slate-200">{label}</span>
        {desc && <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} size="sm" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置本地策略</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button type="button" onClick={switchToVisual}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}>
                <Eye className="w-3.5 h-3.5" />可视化结构
              </button>
              <button type="button" onClick={switchToJson}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}>
                <Code2 className="w-3.5 h-3.5" />JSON 源码
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {jsonError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <>
              {/* ─── 用户等级策略 ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-blue-500" />用户等级策略
                  </h4>
                  <button type="button" onClick={addLevel} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium">
                    <Plus className="w-3.5 h-3.5" />添加等级
                  </button>
                </div>

                <div className="space-y-3">
                  {levels.map((lv, idx) => (
                    <div key={idx} className="bg-slate-800/30 border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <label className={labelCls}>等级</label>
                          <input type="text" value={lv.level} onChange={e => updateLevel(idx, 'level', e.target.value)}
                            placeholder="0" className={inputCls} />
                        </div>
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <label className={labelCls}>握手超时</label>
                            <input type="number" value={lv.handshake} onChange={e => updateLevel(idx, 'handshake', e.target.value)}
                              placeholder="4" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>空闲超时</label>
                            <input type="number" value={lv.connIdle} onChange={e => updateLevel(idx, 'connIdle', e.target.value)}
                              placeholder="300" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>上行等待</label>
                            <input type="number" value={lv.uplinkOnly} onChange={e => updateLevel(idx, 'uplinkOnly', e.target.value)}
                              placeholder="2" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>下行等待</label>
                            <input type="number" value={lv.downlinkOnly} onChange={e => updateLevel(idx, 'downlinkOnly', e.target.value)}
                              placeholder="5" className={inputCls} />
                          </div>
                        </div>
                        <button type="button" onClick={() => removeLevel(idx)}
                          className="p-2 mt-4 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <label className={labelCls}>缓存大小 KB</label>
                          <input type="number" value={lv.bufferSize} onChange={e => updateLevel(idx, 'bufferSize', e.target.value)}
                            placeholder="默认" className={inputCls} />
                        </div>
                        <div className="flex-1 flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={lv.statsUserUplink}
                              onChange={e => updateLevel(idx, 'statsUserUplink', e.target.checked)}
                              className="rounded border-white/20 bg-slate-900 text-blue-600" />
                            统计上行
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={lv.statsUserDownlink}
                              onChange={e => updateLevel(idx, 'statsUserDownlink', e.target.checked)}
                              className="rounded border-white/20 bg-slate-900 text-blue-600" />
                            统计下行
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={lv.statsUserOnline}
                              onChange={e => updateLevel(idx, 'statsUserOnline', e.target.checked)}
                              className="rounded border-white/20 bg-slate-900 text-blue-600" />
                            统计在线
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ─── 系统策略 ─── */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-emerald-500" />系统级策略
                </h4>
                <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-x-6 divide-x divide-white/5">
                    <div className="space-y-0.5">
                      <ToggleRow label="入站上行统计" checked={statsInboundUplink} onChange={() => setStatsInboundUplink(!statsInboundUplink)} />
                      <ToggleRow label="入站下行统计" checked={statsInboundDownlink} onChange={() => setStatsInboundDownlink(!statsInboundDownlink)} />
                    </div>
                    <div className="pl-6 space-y-0.5">
                      <ToggleRow label="出站上行统计" checked={statsOutboundUplink} onChange={() => setStatsOutboundUplink(!statsOutboundUplink)} />
                      <ToggleRow label="出站下行统计" checked={statsOutboundDownlink} onChange={() => setStatsOutboundDownlink(!statsOutboundDownlink)} />
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="h-80 border border-white/10 rounded-xl overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme="vs-dark"
                value={rawJsonText}
                onChange={(val) => setRawJsonText(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-all font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-medium"
          >
            <Save className="w-4 h-4" />
            保存本地策略
          </button>
        </div>
      </div>
    </div>
  );
};
