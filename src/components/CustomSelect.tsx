import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  accentColor?: 'cyan' | 'blue' | 'emerald' | 'purple' | 'amber';
  className?: string;
  fullWidth?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  disabled = false,
  size = 'md',
  accentColor = 'cyan',
  className = '',
  fullWidth = true,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropPosition, setDropPosition] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Close on click outside
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

  // Calculate dropdown position synchronously before paint to avoid flicker
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(spaceBelow < 260 && spaceAbove > spaceBelow);
      setDropPosition({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: string) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs min-h-[32px]'
      : size === 'lg'
      ? 'px-4 py-2.5 text-sm min-h-[44px]'
      : 'px-3 py-2 text-xs min-h-[38px]';

  // Dynamic accent color mappings for focus and selection
  const accentStyles = {
    cyan: {
      activeBorder: 'border-cyan-500/70 ring-2 ring-cyan-500/20 text-cyan-400',
      selectedBg: 'bg-cyan-600/20 text-cyan-300 font-bold border border-cyan-500/30',
      checkColor: 'text-cyan-400',
    },
    blue: {
      activeBorder: 'border-blue-500/70 ring-2 ring-blue-500/20 text-blue-400',
      selectedBg: 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30',
      checkColor: 'text-blue-400',
    },
    emerald: {
      activeBorder: 'border-emerald-500/70 ring-2 ring-emerald-500/20 text-emerald-400',
      selectedBg: 'bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30',
      checkColor: 'text-emerald-400',
    },
    purple: {
      activeBorder: 'border-purple-500/70 ring-2 ring-purple-500/20 text-purple-400',
      selectedBg: 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30',
      checkColor: 'text-purple-400',
    },
    amber: {
      activeBorder: 'border-amber-500/70 ring-2 ring-amber-500/20 text-amber-400',
      selectedBg: 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30',
      checkColor: 'text-amber-400',
    },
  }[accentColor];

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : 'z-0'} ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-950 ${
          disabled ? 'opacity-50 cursor-not-allowed border-white/5' : 'hover:bg-slate-900 cursor-pointer'
        } border ${
          isOpen
            ? accentStyles.activeBorder
            : 'border-white/10 hover:border-white/20 text-slate-200'
        } rounded-xl ${sizeClasses} transition-all duration-150 text-left focus:outline-none`}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {selectedOption?.icon && (
            <selectedOption.icon className={`w-3.5 h-3.5 shrink-0 ${selectedOption.color || 'text-slate-400'}`} />
          )}
          <span className="truncate font-mono">
            {selectedOption ? selectedOption.label : value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? `rotate-180 ${accentStyles.checkColor}` : ''
          }`}
        />
      </button>

      {/* Popover Dropdown List - rendered via Portal to avoid overflow clipping */}
      {isOpen && !disabled && dropPosition.bottom > 0 && createPortal(
        <div
          className={`fixed w-max max-w-[380px] bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-xl shadow-2xl shadow-black/90 z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150`}
          style={{
            left: dropPosition.left,
            ...(dropUp
              ? { bottom: `${window.innerHeight - dropPosition.top + 6}px` }
              : { top: dropPosition.bottom + 6 }),
            minWidth: dropPosition.width,
          }}
        >
          <div className="p-1.5 overflow-y-auto overscroll-contain space-y-0.5 text-xs custom-scrollbar max-h-[50vh]">
            {options.length === 0 ? (
              <div className="py-3 text-center text-slate-500 text-xs">无可用选项</div>
            ) : (
              options.map((opt) => {
                const isSelected = value === opt.value;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                      opt.disabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      isSelected
                        ? accentStyles.selectedBg
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {IconComp && (
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${opt.color || (isSelected ? accentStyles.checkColor : 'text-slate-400')}`} />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-mono font-medium">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[10px] text-slate-400 font-sans truncate">{opt.description}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className={`w-3.5 h-3.5 shrink-0 ml-2 ${accentStyles.checkColor}`} />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
