import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  Activity,
  Code2,
  Sliders,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useConfigStore } from '../stores/useConfigStore';
import { useAppStore } from '../stores/useAppStore';
import { CustomSelect, type SelectOption } from './CustomSelect';
import { ToggleSwitch } from './ToggleSwitch';

const AUTO_OUTBOUNDS_INTERFACE_OPTIONS: SelectOption[] = [
  {
    value: 'auto',
    label: 'auto (自动识别 - 推荐)',
    description: '自动寻找匹配操作系统主出口网络物理网卡',
  },
  {
    value: 'direct',
    label: 'direct (由内核自主寻址)',
    description: '由 Xray 内核网络协议栈自行寻找直连出站网卡',
  },
];

const DEST_OVERRIDE_OPTIONS = [
  { id: 'http', label: 'HTTP 流量' },
  { id: 'tls', label: 'TLS / HTTPS 协议' },
  { id: 'quic', label: 'QUIC / HTTP3 协议' },
  { id: 'fakedns', label: 'FakeDNS 域名解析' },
];

export const TunSettingsModal: React.FC = () => {
  const { isTunModalOpen, closeTunModal, coreState } = useAppStore();
  const { profiles, activeProfileId, updateProfile, startActiveKernel } = useConfigStore();

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Official Xray TUN Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('MXray TUN Adapter');
  const [mtu, setMtu] = useState<number | string>(1500);
  const [gatewayStr, setGatewayStr] = useState('10.0.0.1/16, fc00::1/64');
  const [dnsStr, setDnsStr] = useState('1.1.1.1, 8.8.8.8');
  const [userLevel, setUserLevel] = useState<number | string>(0);
  const [autoSystemRoutingTableStr, setAutoSystemRoutingTableStr] = useState('0.0.0.0/0, ::/0');
  const [autoOutboundsInterface, setAutoOutboundsInterface] = useState('auto');

  // Sniffing
  const [sniffingEnabled, setSniffingEnabled] = useState(true);
  const [destOverride, setDestOverride] = useState<string[]>([
    'http',
    'tls',
    'quic',
    'fakedns',
  ]);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPod|iPad/.test(navigator.userAgent || navigator.platform);
  const isWin =
    typeof navigator !== 'undefined' &&
    /Win/.test(navigator.userAgent || navigator.platform);
  const defaultTunName = isMac ? 'utun20' : isWin ? 'wintun' : 'tun0';

  useEffect(() => {
    if (!isTunModalOpen || !activeProfile?.content) return;

    try {
      const parsed = JSON.parse(activeProfile.content);
      const existingTun = (parsed.inbounds || []).find(
        (ib: any) => ib.tag === 'tun-in' || ib.protocol === 'tun'
      );

      if (existingTun) {
        setName(existingTun.settings?.name || defaultTunName);
        setDesc(existingTun.settings?.desc || 'MXray TUN Adapter');
        setMtu(existingTun.settings?.mtu ?? 1500);
        setGatewayStr(
          Array.isArray(existingTun.settings?.gateway)
            ? existingTun.settings.gateway.join(', ')
            : '10.0.0.1/16, fc00::1/64'
        );
        setDnsStr(
          Array.isArray(existingTun.settings?.dns)
            ? existingTun.settings.dns.join(', ')
            : '1.1.1.1, 8.8.8.8'
        );
        setUserLevel(existingTun.settings?.userLevel ?? 0);
        setAutoSystemRoutingTableStr(
          Array.isArray(existingTun.settings?.autoSystemRoutingTable)
            ? existingTun.settings.autoSystemRoutingTable.join(', ')
            : '0.0.0.0/0, ::/0'
        );
        setAutoOutboundsInterface(existingTun.settings?.autoOutboundsInterface || 'auto');

        setSniffingEnabled(existingTun.sniffing?.enabled ?? true);
        setDestOverride(
          existingTun.sniffing?.destOverride || ['http', 'tls', 'quic', 'fakedns']
        );
        setJsonText(JSON.stringify(existingTun, null, 2));
      } else {
        setName(defaultTunName);
        setDesc('MXray TUN Adapter');
        setMtu(1500);
        setGatewayStr('10.0.0.1/16, fc00::1/64');
        setDnsStr('1.1.1.1, 8.8.8.8');
        setUserLevel(0);
        setAutoSystemRoutingTableStr('0.0.0.0/0, ::/0');
        setAutoOutboundsInterface('auto');
        setSniffingEnabled(true);
        setDestOverride(['http', 'tls', 'quic', 'fakedns']);

        const defaultTunObj = {
          tag: 'tun-in',
          protocol: 'tun',
          settings: {
            name: defaultTunName,
            desc: 'MXray TUN Adapter',
            mtu: 1500,
            gateway: ['10.0.0.1/16', 'fc00::1/64'],
            dns: ['1.1.1.1', '8.8.8.8'],
            userLevel: 0,
            autoSystemRoutingTable: ['0.0.0.0/0', '::/0'],
            autoOutboundsInterface: 'auto',
          },
          sniffing: {
            enabled: true,
            destOverride: ['http', 'tls', 'quic', 'fakedns'],
            routeOnly: false,
          },
        };
        setJsonText(JSON.stringify(defaultTunObj, null, 2));
      }
      setJsonError(null);
    } catch {
      // Fallback
    }
  }, [isTunModalOpen, activeProfile, defaultTunName]);

  if (!isTunModalOpen) return null;

  const buildTunInboundObject = () => {
    let nameVal = name.trim();
    if (!nameVal || (isMac && !/^utun\d+$/i.test(nameVal))) {
      nameVal = defaultTunName;
    }

    const gatewayList = gatewayStr
      .split(/[,,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const dnsList = dnsStr
      .split(/[,,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const autoRoutingList = autoSystemRoutingTableStr
      .split(/[,,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      tag: 'tun-in',
      protocol: 'tun',
      settings: {
        name: nameVal,
        desc: desc.trim() || 'Wintun',
        mtu: Number(mtu) || 1500,
        gateway: gatewayList.length > 0 ? gatewayList : ['10.0.0.1/16', 'fc00::1/64'],
        dns: dnsList.length > 0 ? dnsList : ['1.1.1.1', '8.8.8.8'],
        userLevel: Number(userLevel) || 0,
        autoSystemRoutingTable: autoRoutingList.length > 0 ? autoRoutingList : ['0.0.0.0/0', '::/0'],
        autoOutboundsInterface: autoOutboundsInterface || 'auto',
      },
      sniffing: {
        enabled: sniffingEnabled,
        destOverride,
        routeOnly: false,
      },
    };
  };

  const handleSwitchMode = (targetMode: 'visual' | 'json') => {
    if (targetMode === mode) return;

    if (targetMode === 'json') {
      const obj = buildTunInboundObject();
      setJsonText(JSON.stringify(obj, null, 2));
      setJsonError(null);
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed.settings?.name) setName(parsed.settings.name);
        if (parsed.settings?.desc) setDesc(parsed.settings.desc);
        if (parsed.settings?.mtu) setMtu(parsed.settings.mtu);
        if (Array.isArray(parsed.settings?.gateway)) setGatewayStr(parsed.settings.gateway.join(', '));
        if (Array.isArray(parsed.settings?.dns)) setDnsStr(parsed.settings.dns.join(', '));
        if (typeof parsed.settings?.userLevel === 'number') setUserLevel(parsed.settings.userLevel);
        if (Array.isArray(parsed.settings?.autoSystemRoutingTable)) {
          setAutoSystemRoutingTableStr(parsed.settings.autoSystemRoutingTable.join(', '));
        }
        if (parsed.settings?.autoOutboundsInterface) setAutoOutboundsInterface(parsed.settings.autoOutboundsInterface);
        if (typeof parsed.sniffing?.enabled === 'boolean') setSniffingEnabled(parsed.sniffing.enabled);
        if (Array.isArray(parsed.sniffing?.destOverride)) setDestOverride(parsed.sniffing.destOverride);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`JSON 格式无效: ${err?.message}`);
        return;
      }
    }
    setMode(targetMode);
  };

  const handleToggleDestOverride = (id: string) => {
    setDestOverride((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      let finalTunObj: any;

      if (mode === 'json') {
        finalTunObj = JSON.parse(jsonText);
      } else {
        finalTunObj = buildTunInboundObject();
      }

      if (!activeProfile?.content) return;

      const profileConfig = JSON.parse(activeProfile.content);
      if (!Array.isArray(profileConfig.inbounds)) {
        profileConfig.inbounds = [];
      }

      const existingIdx = profileConfig.inbounds.findIndex(
        (ib: any) => ib.tag === 'tun-in' || ib.protocol === 'tun'
      );

      if (existingIdx >= 0) {
        profileConfig.inbounds[existingIdx] = finalTunObj;
      } else {
        profileConfig.inbounds.push(finalTunObj);
      }

      const updatedContent = JSON.stringify(profileConfig, null, 2);
      updateProfile(activeProfile.id, { content: updatedContent });

      if (coreState.tunMode) {
        await startActiveKernel();
      }

      closeTunModal();
    } catch (err: any) {
      setJsonError(`保存失败: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                TUN 模式高级配置
              </h3>
              <p className="text-xs text-slate-400">
                遵循 Xray 官方原生规范（xtls.github.io/config/inbounds/tun.html）
              </p>
            </div>
          </div>
          <button
            onClick={closeTunModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/5">
            <button
              onClick={() => handleSwitchMode('visual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'visual'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>可视化模式</span>
            </button>
            <button
              onClick={() => handleSwitchMode('json')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'json'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON 模式</span>
            </button>
          </div>

          <a
            href="https://xtls.github.io/config/inbounds/tun.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>官方文档</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {jsonError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {mode === 'visual' ? (
            <div className="space-y-4">
              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. 网卡名称 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    网卡名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={defaultTunName}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    macOS 为 utunN（如 utun20），Windows 为 wintun
                  </p>
                </div>

                {/* 2. 网卡描述 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    网卡描述
                  </label>
                  <input
                    type="text"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="MXray TUN Adapter"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Windows Wintun 适配器描述信息
                  </p>
                </div>

                {/* 3. MTU 大小 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    MTU 大小
                  </label>
                  <input
                    type="number"
                    value={mtu}
                    onChange={(e) => setMtu(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    最大传输单元，官方推荐 1500
                  </p>
                </div>

                {/* 4. 用户等级 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    用户等级
                  </label>
                  <input
                    type="number"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    连接超时与缓存策略等级，默认 0
                  </p>
                </div>
              </div>

              {/* 5. 网关地址池 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  网关地址池
                </label>
                <input
                  type="text"
                  value={gatewayStr}
                  onChange={(e) => setGatewayStr(e.target.value)}
                  placeholder="10.0.0.1/16, fc00::1/64"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  IPv4 / IPv6 虚拟网关地址，逗号分隔，例如 10.0.0.1/16, fc00::1/64
                </p>
              </div>

              {/* 6. DNS 服务器 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  TUN 接口 DNS 服务器
                </label>
                <input
                  type="text"
                  value={dnsStr}
                  onChange={(e) => setDnsStr(e.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  网卡绑定的 DNS 解析服务器，例如 1.1.1.1, 8.8.8.8
                </p>
              </div>

              {/* 7. 自动系统路由表 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  自动系统路由表 CIDR
                </label>
                <input
                  type="text"
                  value={autoSystemRoutingTableStr}
                  onChange={(e) => setAutoSystemRoutingTableStr(e.target.value)}
                  placeholder="0.0.0.0/0, ::/0"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  自动添加到系统路由表的网段，默认 0.0.0.0/0, ::/0（接管全局）
                </p>
              </div>

              {/* 8. 自动出口网卡 CustomSelect Dropdown (Rule 5 Compliance) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  自动出站网卡选择
                </label>
                <CustomSelect
                  value={autoOutboundsInterface}
                  onChange={(val) => setAutoOutboundsInterface(val)}
                  options={AUTO_OUTBOUNDS_INTERFACE_OPTIONS}
                  accentColor="purple"
                  size="md"
                />
              </div>

              {/* 9. 流量嗅探开关与设置 */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-white/5 rounded-xl">
                  <div>
                    <div className="text-xs font-semibold text-white">开启流量嗅探</div>
                    <div className="text-[11px] text-slate-400">
                      提取 TUN 流量中的应用层协议与目标域名进行精确分流路由与目标覆盖
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={sniffingEnabled}
                    onChange={() => setSniffingEnabled(!sniffingEnabled)}
                    activeColor="indigo"
                    size="sm"
                    ariaLabel="开启流量嗅探开关"
                  />
                </div>
              </div>

              {/* 10. DestOverride Checkbox Group */}
              {sniffingEnabled && (
                <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-indigo-300">
                    嗅探目标重定向协议
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DEST_OVERRIDE_OPTIONS.map((item) => (
                      <label
                        key={item.id}
                        onClick={() => handleToggleDestOverride(item.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          destOverride.includes(item.id)
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                            : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            destOverride.includes(item.id)
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {destOverride.includes(item.id) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Xray 官方 TUN 入站 JSON 配置对象
              </label>
              <div className="h-[360px] w-full rounded-xl overflow-hidden border border-white/10 bg-slate-950/90 pt-2">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={jsonText}
                  onChange={(val) => {
                    setJsonText(val || '');
                    setJsonError(null);
                  }}
                  options={{
                    fontSize: 12,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                    mouseWheelZoom: true,
                    lineNumbers: 'on',
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-slate-900/80">
          <button
            onClick={closeTunModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>保存并应用</span>
          </button>
        </div>
      </div>
    </div>
  );
};
