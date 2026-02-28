import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <div className="fixed bottom-8 right-8 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-black px-6 py-3 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 font-medium">
      {message}
    </div>
  );
}
