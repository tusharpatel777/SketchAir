import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceControllerProps {
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setIsEraser: (isEraser: boolean) => void;
  onClear: () => void;
  onUndo: () => void;
}

const COLOR_MAP: Record<string, string> = {
  'red': '#ef4444',
  'blue': '#3b82f6',
  'green': '#22c55e',
  'yellow': '#eab308',
  'black': '#000000',
  'white': '#ffffff',
  'orange': '#f97316',
  'purple': '#a855f7',
  'pink': '#ec4899',
  'brown': '#78350f',
  'gray': '#71717a',
  'grey': '#71717a',
};

const VoiceController: React.FC<VoiceControllerProps> = ({
  setColor,
  setBrushSize,
  setIsEraser,
  onClear,
  onUndo,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const processCommand = useCallback((transcript: string) => {
    const command = transcript.toLowerCase().trim();
    setLastCommand(transcript);

    // Color commands — match any color name in the transcript, no trigger word required.
    // Speech recognition often mishears "use" as "you"/"new", so we don't rely on trigger words.
    for (const [name, hex] of Object.entries(COLOR_MAP)) {
      if (command.includes(name)) {
        setColor(hex);
        setIsEraser(false);
        return; // exit early so nothing else interferes
      }
    }

    if (command.includes('brush size to') || command.includes('set size to') || command.includes('size to')) {
      const match = command.match(/\d+/);
      if (match) {
        const size = parseInt(match[0], 10);
        if (size > 0 && size <= 100) {
          setBrushSize(size);
        }
      }
    }

    if (command.includes('clear screen') || command.includes('clear canvas') || command.includes('clear board')) {
      onClear();
    }

    if (command.includes('undo')) {
      onUndo();
    }

    if (command.includes('eraser') || command.includes('erase')) {
      setIsEraser(true);
    }
    if (command.includes('pencil') || command.includes('draw') || command.includes('brush')) {
      setIsEraser(false);
    }
  }, [setColor, setBrushSize, setIsEraser, onClear, onUndo]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      processCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please check your browser permissions.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'network') {
        setError('Network error occurred.');
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [processCommand]);

  useEffect(() => {
    isListeningRef.current = isListening;
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        console.error('Recognition start error:', e);
        if (e.name === 'InvalidStateError') {
          // Already started, ignore
        } else {
          setError('Failed to start voice recognition.');
          setIsListening(false);
          isListeningRef.current = false;
        }
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [isListening]);

  const toggleListening = () => {
    setIsListening(!isListening);
    setError(null);
  };

  return (
    <div className="fixed bottom-8 left-8 z-50 flex flex-col items-start gap-4">
      <AnimatePresence>
        {lastCommand && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-zinc-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            <MessageSquare className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-zinc-300">"{lastCommand}"</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleListening}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl ${
            isListening
              ? 'bg-orange-500 text-white scale-110 shadow-orange-500/40'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          {isListening ? (
            <div className="relative">
              <Mic className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
            </div>
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Voice Control</p>
          <p className="text-xs font-bold text-zinc-300">
            {isListening ? 'Listening for commands...' : 'Voice commands off'}
          </p>
          {error && <p className="text-[10px] text-red-500 mt-1 font-bold">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default VoiceController;
