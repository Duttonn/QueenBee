import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, X } from 'lucide-react';

interface DictationOverlayProps {
  isVisible: boolean;
  isProcessing: boolean;
  onClose: () => void;
}

const DictationOverlay = ({ isVisible, isProcessing, onClose }: DictationOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
        >
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex justify-end mb-2">
              <button 
                onClick={onClose}
                className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Icon / Waveform area */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                {isProcessing ? (
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                ) : (
                  <Mic size={32} className="text-blue-600" />
                )}
              </div>
              
              {/* Pulsing rings when recording */}
              {!isProcessing && (
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-blue-400 -z-10"
                />
              )}
            </div>

            {/* Status text */}
            <div className="text-center">
              <h3 className="text-sm font-bold text-zinc-900 mb-1 uppercase tracking-widest">
                {isProcessing ? 'Transcribing...' : 'Listening...'}
              </h3>
              <p className="text-xs text-zinc-500">
                {isProcessing 
                  ? 'Converting your voice to text' 
                  : 'Talk clearly to describe your task'}
              </p>
            </div>

            {/* Waveform visualization (Mock) */}
            {!isProcessing && (
              <div className="flex gap-1 h-8 items-center mt-6">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 24, 12, 28, 8][i % 5] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DictationOverlay;