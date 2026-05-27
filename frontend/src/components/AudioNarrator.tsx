import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  text: string;
}

export default function AudioNarrator({ text }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop narration on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const getCleanText = (rawText: string) => {
    // Strip markdown formatting characters to make it read cleaner
    return rawText
      .replace(/[\#\*\_`\[\]]/g, "")
      .replace(/-\s+/g, "")
      .replace(/[\n\r]+/g, " ")
      .trim();
  };

  const handleSpeak = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = getCleanText(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRate(val);
    if (isPlaying) {
      // Re-trigger speech with new speed settings in mid-run
      handleSpeak();
    }
  };

  return (
    <div className="bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-3.5 border border-gray-200/50 dark:border-gray-800/50 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Audio Briefing
          </span>
        </div>
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-0.5 h-3"
            >
              {[1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  animate={{ height: ["4px", "12px", "4px"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                  className="w-0.5 bg-indigo-500 rounded-full"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={handleSpeak}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
            title="Read summary"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/30 text-red-600 hover:bg-red-200 transition-all border border-red-200/50 dark:border-red-900/50"
            title="Stop narration"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {/* Speed Adjustment slider */}
        <div className="flex-1 flex items-center gap-2 ml-1 bg-white/60 dark:bg-gray-900/30 px-2.5 py-1 rounded-lg border border-gray-200/30 dark:border-gray-800/30">
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
            {rate.toFixed(1)}x speed
          </span>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.1"
            value={rate}
            onChange={handleRateChange}
            className="flex-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
