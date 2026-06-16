import React, { useEffect, useState } from 'react';
import { XCircle, AlertTriangle, Info, Edit3 } from 'lucide-react';
import clsx from 'clsx';

interface DialogProps {
  isOpen: boolean;
  type?: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const Dialog: React.FC<DialogProps> = ({ 
  isOpen, 
  type = 'alert', 
  title, 
  message, 
  confirmText = 'OK', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel 
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue(''); // Reset on open
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(type === 'prompt' ? inputValue : undefined);
        if (type === 'alert') onCancel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel, type, inputValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            {type === 'confirm' ? (
              <AlertTriangle className="w-5 h-5 text-gold-500" />
            ) : type === 'prompt' ? (
              <Edit3 className="w-5 h-5 text-blue-400" />
            ) : (
              <Info className="w-5 h-5 text-blue-400" />
            )}
            {title}
          </h3>
          <button 
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{message}</p>
          {type === 'prompt' && (
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 transition-colors"
              placeholder="Type here..."
            />
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex gap-3 justify-end">
          {(type === 'confirm' || type === 'prompt') && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm(type === 'prompt' ? inputValue : undefined);
              if (type === 'alert') onCancel(); // Auto-close alerts on OK
            }}
            className={clsx(
              "px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg",
              type === 'confirm' 
                ? "text-slate-950 bg-red-500 hover:bg-red-400" 
                : "text-slate-950 bg-gold-500 hover:bg-gold-400"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
