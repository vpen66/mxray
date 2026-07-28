import React from 'react';
import { Loader2 } from 'lucide-react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: 'emerald' | 'indigo' | 'blue' | 'purple';
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  activeColor = 'emerald',
  ariaLabel,
}) => {
  const isInteractive = !disabled && !loading;

  // Size configurations
  const sizeConfig = {
    sm: {
      track: 'w-[32px] h-[18px] p-[2px]',
      thumb: 'w-[14px] h-[14px]',
      translate: 'translate-x-[14px]',
      icon: 'w-2.5 h-2.5',
    },
    md: {
      track: 'w-[44px] h-[24px] p-[2px]',
      thumb: 'w-[20px] h-[20px]',
      translate: 'translate-x-[20px]',
      icon: 'w-3.5 h-3.5',
    },
    lg: {
      track: 'w-[52px] h-[28px] p-[3px]',
      thumb: 'w-[22px] h-[22px]',
      translate: 'translate-x-[24px]',
      icon: 'w-4 h-4',
    },
  }[size];

  // Active color themes
  const activeTheme = {
    emerald: 'bg-emerald-500 shadow-lg shadow-emerald-500/30 border-emerald-400/50',
    indigo: 'bg-indigo-500 shadow-lg shadow-indigo-500/30 border-indigo-400/50',
    blue: 'bg-blue-500 shadow-lg shadow-blue-500/30 border-blue-400/50',
    purple: 'bg-purple-600 shadow-lg shadow-purple-500/30 border-purple-400/50',
  }[activeColor];

  // Inactive state theme
  const inactiveTheme = 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={!isInteractive}
      onClick={(e) => {
        e.stopPropagation();
        if (isInteractive) {
          onChange();
        }
      }}
      className={`relative inline-flex flex-shrink-0 items-center rounded-full border transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
        sizeConfig.track
      } ${
        checked ? activeTheme : inactiveTheme
      } ${
        loading ? 'opacity-80 cursor-wait' : disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]'
      }`}
    >
      {/* Moving Thumb / Knob */}
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white shadow-md transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          sizeConfig.thumb
        } ${
          checked ? sizeConfig.translate : 'translate-x-0'
        }`}
      >
        {loading ? (
          <Loader2
            className={`${sizeConfig.icon} animate-spin ${
              checked
                ? activeColor === 'emerald'
                  ? 'text-emerald-600'
                  : activeColor === 'indigo'
                  ? 'text-indigo-600'
                  : activeColor === 'purple'
                  ? 'text-purple-600'
                  : 'text-blue-600'
                : 'text-slate-600'
            }`}
          />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              checked
                ? activeColor === 'emerald'
                  ? 'bg-emerald-500'
                  : activeColor === 'indigo'
                  ? 'bg-indigo-500'
                  : activeColor === 'purple'
                  ? 'bg-purple-600'
                  : 'bg-blue-500'
                : 'bg-slate-400'
            }`}
          />
        )}
      </span>
    </button>
  );
};
