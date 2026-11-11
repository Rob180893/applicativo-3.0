import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 bottom-8 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl border border-white/10 text-sm font-medium backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {message}
    </div>
  );
};
