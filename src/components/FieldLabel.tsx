import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface FieldLabelProps {
  label: string;
  tip: string;
  className?: string;
}

/**
 * 带提示图标的表单标签组件。
 * 点击 Info 图标弹出说明浮层，点击外部或再次点击关闭。
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({ label, tip, className = '' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={wrapRef} className={`inline-flex items-center gap-1 relative ${className}`}>
      <span className="text-inherit">{label}</span>
      {/* 使用 span 而非 button，避免被外层 <label> 的点击转发机制误触发 */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors shrink-0 cursor-pointer select-none"
        title="字段说明"
      >
        <Info className="w-3 h-3" />
      </span>
      {open && (
        <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-50 max-w-[260px] px-2.5 py-2 rounded-lg text-[11px] leading-relaxed text-slate-200 bg-slate-800/98 border border-white/10 shadow-xl backdrop-blur-sm whitespace-normal opacity-100 scale-100 transition-all duration-150">
          {tip}
        </span>
      )}
    </span>
  );
};
