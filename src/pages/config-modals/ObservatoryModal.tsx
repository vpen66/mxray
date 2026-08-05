import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code2, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CustomSelect } from '../../components/CustomSelect';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { FieldLabel } from '../../components/FieldLabel';

interface ObservatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: { observatory?: any; burstObservatory?: any };
  onSave: (val: { observatory?: any; burstObservatory?: any }) => void;
}

const TYPE_OPTIONS = [
  { value: 'observatory', label: '后台连接观测' },
  { value: 'burstObservatory', label: '突发连接观测' },
  { value: 'disabled', label: '禁用连接观测' },
];

const HTTP_METHOD_OPTIONS = [
  { value: 'HEAD', label: 'HEAD' },
  { value: 'GET', label: 'GET' },
];

const inputCls = 'w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 font-mono';
const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

export const ObservatoryModal: React.FC<ObservatoryModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [type, setType] = useState<'observatory' | 'burstObservatory' | 'disabled'>('observatory');
  const [subjectSelector, setSubjectSelector] = useState('proxy');
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // observatory fields
  const [probeUrl, setProbeUrl] = useState('https://www.google.com/generate_204');
  const [probeInterval, setProbeInterval] = useState('10m');
  const [enableConcurrency, setEnableConcurrency] = useState(false);

  // burstObservatory pingConfig fields
  const [destination, setDestination] = useState('https://connectivitycheck.gstatic.com/generate_204');
  const [connectivity, setConnectivity] = useState('');
  const [interval, setInterval] = useState('1m');
  const [sampling, setSampling] = useState('10');
  const [timeout, setTimeout_] = useState('5s');
  const [httpMethod, setHttpMethod] = useState('HEAD');

  useEffect(() => {
    if (isOpen) {
      if (initialValue?.burstObservatory) {
        setType('burstObservatory');
        const b = initialValue.burstObservatory;
        setSubjectSelector(Array.isArray(b.subjectSelector) ? b.subjectSelector.join(',') : 'proxy');
        const pc = b.pingConfig || {};
        setDestination(pc.destination || 'https://connectivitycheck.gstatic.com/generate_204');
        setConnectivity(pc.connectivity || '');
        setInterval(pc.interval || '1m');
        setSampling(pc.sampling != null ? String(pc.sampling) : '10');
        setTimeout_(pc.timeout || '5s');
        setHttpMethod(pc.httpMethod || 'HEAD');
        setRawJsonText(JSON.stringify(b, null, 2));
      } else if (initialValue?.observatory) {
        setType('observatory');
        const o = initialValue.observatory;
        setSubjectSelector(Array.isArray(o.subjectSelector) ? o.subjectSelector.join(',') : 'proxy');
        setProbeUrl(o.probeUrl || 'https://www.google.com/generate_204');
        setProbeInterval(o.probeInterval || '10m');
        setEnableConcurrency(!!o.enableConcurrency);
        setRawJsonText(JSON.stringify(o, null, 2));
      } else {
        setType('observatory');
        setSubjectSelector('proxy');
        setProbeUrl('https://www.google.com/generate_204');
        setProbeInterval('10m');
        setEnableConcurrency(false);
        setDestination('https://connectivitycheck.gstatic.com/generate_204');
        setConnectivity('');
        setInterval('1m');
        setSampling('10');
        setTimeout_('5s');
        setHttpMethod('HEAD');
        setRawJsonText(JSON.stringify({ subjectSelector: ['proxy'], probeUrl: 'https://www.google.com/generate_204', probeInterval: '10m', enableConcurrency: false }, null, 2));
      }
      setJsonError(null);
      setViewMode('visual');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const buildObject = (): any => {
    const selectors = subjectSelector.split(',').map((s) => s.trim()).filter(Boolean);
    if (type === 'burstObservatory') {
      const pingConfig: any = {};
      if (destination.trim()) pingConfig.destination = destination.trim();
      if (connectivity.trim()) pingConfig.connectivity = connectivity.trim();
      if (interval.trim()) pingConfig.interval = interval.trim();
      if (sampling.trim()) pingConfig.sampling = Number(sampling) || 10;
      if (timeout.trim()) pingConfig.timeout = timeout.trim();
      if (httpMethod) pingConfig.httpMethod = httpMethod;
      return {
        burstObservatory: {
          subjectSelector: selectors.length > 0 ? selectors : ['proxy'],
          pingConfig,
        },
        observatory: undefined,
      };
    } else {
      return {
        observatory: {
          subjectSelector: selectors.length > 0 ? selectors : ['proxy'],
          probeUrl: probeUrl.trim() || 'https://www.google.com/generate_204',
          probeInterval: probeInterval.trim() || '10m',
          enableConcurrency,
        },
        burstObservatory: undefined,
      };
    }
  };

  const handleSave = () => {
    if (type === 'disabled') {
      onSave({ observatory: undefined, burstObservatory: undefined });
      onClose();
      return;
    }

    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        if (type === 'burstObservatory') {
          onSave({ burstObservatory: parsed, observatory: undefined });
        } else {
          onSave({ observatory: parsed, burstObservatory: undefined });
        }
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
    if (viewMode === 'visual' && type !== 'disabled') {
      const obj = buildObject();
      const content = type === 'burstObservatory' ? obj.burstObservatory : obj.observatory;
      setRawJsonText(JSON.stringify(content, null, 2));
    }
    setViewMode('json');
  };

  const switchToVisual = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      if (type === 'burstObservatory') {
        setSubjectSelector(Array.isArray(parsed.subjectSelector) ? parsed.subjectSelector.join(',') : 'proxy');
        const pc = parsed.pingConfig || {};
        setDestination(pc.destination || 'https://connectivitycheck.gstatic.com/generate_204');
        setConnectivity(pc.connectivity || '');
        setInterval(pc.interval || '1m');
        setSampling(pc.sampling != null ? String(pc.sampling) : '10');
        setTimeout_(pc.timeout || '5s');
        setHttpMethod(pc.httpMethod || 'HEAD');
      } else {
        setSubjectSelector(Array.isArray(parsed.subjectSelector) ? parsed.subjectSelector.join(',') : 'proxy');
        setProbeUrl(parsed.probeUrl || 'https://www.google.com/generate_204');
        setProbeInterval(parsed.probeInterval || '10m');
        setEnableConcurrency(!!parsed.enableConcurrency);
      }
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`无法切换为可视化：JSON 解析错误 (${err.message})`);
      return;
    }
    setViewMode('visual');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/98 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <h3 className="font-semibold text-lg text-white">配置连接观测</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={switchToVisual}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'visual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />可视化结构
              </button>
              <button
                type="button"
                onClick={switchToJson}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'json' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />JSON 源码
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {jsonError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {viewMode === 'visual' ? (
            <div className="space-y-4">
              <div>
                <label className={labelCls}><FieldLabel label="观测器模式" tip="选择观测器类型。observatory 为常规观测器，定时探测出站延迟；burstObservatory 为突发观测器，批量并发探测。" /></label>
                <CustomSelect
                  options={TYPE_OPTIONS}
                  value={type}
                  onChange={(val) => setType(val as any)}
                />
              </div>

              {type !== 'disabled' && (
                <>
                  <div>
                    <label className={labelCls}><FieldLabel label="目标出站选择器" tip="指定需要探测延迟的出站标识，多个用逗号分隔。支持前缀匹配。" /></label>
                    <input
                      type="text"
                      value={subjectSelector}
                      onChange={(e) => setSubjectSelector(e.target.value)}
                      placeholder="proxy, node-1, node-2"
                      className={inputCls}
                    />
                  </div>

                  {type === 'observatory' && (
                    <>
                      <div>
                        <label className={labelCls}><FieldLabel label="探测网址" tip="用于探测出站延迟的 URL，应返回 HTTP 204 状态码。" /></label>
                        <input
                          type="text"
                          value={probeUrl}
                          onChange={(e) => setProbeUrl(e.target.value)}
                          placeholder="https://www.google.com/generate_204"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className={labelCls}><FieldLabel label="探测间隔" tip="两次探测之间的时间间隔，格式为数字+单位，如 10s、2h45m。" /></label>
                        <input
                          type="text"
                          value={probeInterval}
                          onChange={(e) => setProbeInterval(e.target.value)}
                          placeholder="10m"
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-slate-500">格式: 数字+单位，如 10s, 2h45m</p>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                        <div>
                          <span className="text-sm font-medium text-slate-200">并发探测</span>
                          <p className="text-xs text-slate-400">并发探测全部出站，完成后暂停设定时间</p>
                        </div>
                        <ToggleSwitch
                          checked={enableConcurrency}
                          onChange={() => setEnableConcurrency((prev) => !prev)}
                          activeColor="blue"
                          size="sm"
                          ariaLabel="并发探测"
                        />
                      </div>
                    </>
                  )}

                  {type === 'burstObservatory' && (
                    <div className="p-4 bg-slate-800/30 border border-white/5 rounded-xl space-y-3">
                      <span className="text-xs font-semibold text-blue-300">探测配置</span>

                      <div>
                        <label className={labelCls}><FieldLabel label="探测目标网址" tip="突发观测器的探测目标 URL，应返回 HTTP 204 状态码。" /></label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="https://connectivitycheck.gstatic.com/generate_204"
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-slate-500">应返回 HTTP 204 状态码</p>
                      </div>

                      <div>
                        <label className={labelCls}><FieldLabel label="本地连通性检测网址" tip="用于检测本地网络是否连通的 URL，仅在目标网址探测失败时执行。" /></label>
                        <input
                          type="text"
                          value={connectivity}
                          onChange={(e) => setConnectivity(e.target.value)}
                          placeholder="留空则不检测本地网络连通性"
                          className={inputCls}
                        />
                        <p className="mt-1 text-[10px] text-slate-500">仅在 destination 探测失败时执行</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}><FieldLabel label="探测间隔" tip="突发观测器的探测间隔，最小 10s。" /></label>
                          <input
                            type="text"
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            placeholder="1m"
                            className={inputCls}
                          />
                          <p className="mt-1 text-[10px] text-slate-500">最小 10s</p>
                        </div>
                        <div>
                          <label className={labelCls}><FieldLabel label="采样数量" tip="保留最近的探测结果数量，用于计算平均延迟。" /></label>
                          <input
                            type="number"
                            value={sampling}
                            onChange={(e) => setSampling(e.target.value)}
                            placeholder="10"
                            className={inputCls}
                          />
                          <p className="mt-1 text-[10px] text-slate-500">保留最近探测结果数</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}><FieldLabel label="超时时间" tip="单次探测的超时时间，超时视为失败。" /></label>
                          <input
                            type="text"
                            value={timeout}
                            onChange={(e) => setTimeout_(e.target.value)}
                            placeholder="5s"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}><FieldLabel label="HTTP 方法" tip="探测请求使用的 HTTP 方法，GET 或 HEAD。" /></label>
                          <CustomSelect
                            options={HTTP_METHOD_OPTIONS}
                            value={httpMethod}
                            onChange={setHttpMethod}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="h-72 border border-white/10 rounded-xl overflow-hidden">
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
            保存观测配置
          </button>
        </div>
      </div>
    </div>
  );
};
