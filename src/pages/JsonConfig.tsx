import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode2, Save, Sparkles, Check, AlertCircle, Layers } from 'lucide-react';
import { useConfigStore } from '../stores/useConfigStore';

export const JsonConfigPage: React.FC = () => {
  const { customJson, jsonPatch, setCustomJson, setJsonPatch } = useConfigStore();

  const [activeMode, setActiveMode] = useState<'custom' | 'patch'>('custom');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const currentText = activeMode === 'custom' ? customJson : jsonPatch;

  const handleEditorChange = (value?: string) => {
    if (value === undefined) return;
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }

    if (activeMode === 'custom') {
      setCustomJson(value);
    } else {
      setJsonPatch(value);
    }
  };

  const handleApply = () => {
    if (jsonError) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">高级 JSON 扩展与 Patch</h2>
          <p className="text-xs text-slate-400">高度自定义 Xray 原生 `config.json` 覆盖、注入 RFC 6902 JSON Patch</p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold animate-pulse">
              <Check className="w-4 h-4" /> JSON 已应用并保存
            </span>
          )}

          <button
            onClick={handleApply}
            disabled={!!jsonError}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>保存并重载 Xray 内核</span>
          </button>
        </div>
      </div>

      {/* Editor Tabs & Error Banner */}
      <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode('custom')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeMode === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-4 h-4" /> 自定义 Xray JSON 基础模板
          </button>
          <button
            onClick={() => setActiveMode('patch')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeMode === 'patch' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> RFC 6902 JSON Patch 注入
          </button>
        </div>

        {jsonError ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold px-3 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-4 h-4" /> JSON 语法错误: {jsonError}
          </div>
        ) : (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 语法校验正确
          </span>
        )}
      </div>

      {/* Monaco Editor Component */}
      <div className="glass-card flex-1 min-h-[480px] rounded-2xl overflow-hidden border border-white/10 p-2 bg-slate-950">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={currentText}
          onChange={handleEditorChange}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
};
