import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, X } from 'lucide-react';

interface DictationOverlayProps {
  isVisible: boolean;
  isProcessing: boolean;
  onClose: () => void;
}

const DictationOverlay = ({ isVisible, isProcessing, onClose }: DictationOverlayProps) => {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isVisible) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/20 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white border border-zinc-200 rounded-3xl shadow-2xl p-8 flex flex-col items-center max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-6">
              {!isProcessing && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-blue-500/20 rounded-full"
                />
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isProcessing ? 'bg-zinc-100' : 'bg-blue-600 shadow-xl shadow-blue-500/40'}`}>
                {isProcessing ? (
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-zinc-900 mb-2">
              {isProcessing ? 'Processing Audio...' : 'Listening...'}
            </h3>
            <p className="text-sm text-zinc-500 text-center mb-8">
              {isProcessing
                ? 'Converting your voice to text using Whisper AI'
                : 'Speak clearly into your microphone. Press Esc or click outside to cancel.'}
            </p>

            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DictationOverlay;
