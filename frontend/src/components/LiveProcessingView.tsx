import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";

interface LiveData {
  currentStep: string;
  message: string;
  functions?: string[];
  classes?: string[];
  summary?: string;
  docsPreview?: string;
  codePreview?: string;
  testPreview?: string;
  confidence?: number;
  passed?: number;
  total?: number;
}

interface Props {
  liveData: LiveData;
}

const STEP_INFO: Record<string, { label: string; icon: string; color: string }> = {
  parsing:     { label: "Parsing",      icon: "🔍", color: "text-blue-400" },
  documenting: { label: "Documenting",  icon: "📝", color: "text-amber-400" },
  rewriting:   { label: "Rewriting",    icon: "⚡", color: "text-emerald-400" },
  testing:     { label: "Test Gen",     icon: "🧪", color: "text-purple-400" },
  validating:  { label: "Validating",   icon: "✓",  color: "text-cyan-400" },
};

export default function LiveProcessingView({ liveData }: Props) {
  const [typedCode, setTypedCode] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef("");

  // Typing animation for code preview
  useEffect(() => {
    if (!liveData.codePreview || codeRef.current === liveData.codePreview) return;
    codeRef.current = liveData.codePreview;

    setTypedCode("");
    setTypingDone(false);
    let i = 0;
    const code = liveData.codePreview;
    const chunkSize = Math.max(3, Math.floor(code.length / 120));

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      i += chunkSize;
      if (i >= code.length) {
        setTypedCode(code);
        setTypingDone(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTypedCode(code.slice(0, i));
      }
    }, 20);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveData.codePreview]);

  const stepInfo = STEP_INFO[liveData.currentStep] || { label: liveData.currentStep, icon: "⏳", color: "text-gray-400" };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in overflow-y-auto">
      {/* Current step header */}
      <motion.div
        key={liveData.currentStep}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg">
            {stepInfo.icon}
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${stepInfo.color}`}>
            {stepInfo.label}
          </p>
          <p className="text-xs text-gray-500">{liveData.message}</p>
        </div>
      </motion.div>

      {/* Parsing results — found functions/classes */}
      <AnimatePresence>
        {liveData.functions && liveData.functions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/80 rounded-xl p-3 border border-gray-800"
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
              Discovered Structure
            </p>
            <div className="flex flex-wrap gap-1.5">
              {liveData.functions.map((fn, i) => (
                <motion.span
                  key={fn}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded text-[10px] font-mono border border-blue-800/50"
                >
                  fn: {fn}()
                </motion.span>
              ))}
              {(liveData.classes || []).map((cls, i) => (
                <motion.span
                  key={cls}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (liveData.functions?.length || 0) * 0.08 + i * 0.08 }}
                  className="px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded text-[10px] font-mono border border-amber-800/50"
                >
                  class: {cls}
                </motion.span>
              ))}
            </div>
            {liveData.summary && (
              <p className="text-[11px] text-gray-400 mt-2">{liveData.summary}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docs preview */}
      <AnimatePresence>
        {liveData.docsPreview && !liveData.codePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-gray-900/80 rounded-xl p-3 border border-gray-800 flex-shrink-0"
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
              Documentation Preview
            </p>
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line line-clamp-6">
              {liveData.docsPreview}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live code typing animation */}
      <AnimatePresence>
        {liveData.codePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                {typingDone ? "Modernized Code" : "Synthesizing modernized code..."}
              </p>
              {liveData.confidence !== undefined && (
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold font-mono">
                  Confidence: {Math.round(liveData.confidence * 100)}%
                </span>
              )}
            </div>
            
            <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex flex-col relative shadow-2xl">
              {/* IDE Header Bar mockup */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[10px] text-gray-500 font-mono ml-2">modernized_output.py</span>
                </div>
                {!typingDone ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono font-bold uppercase tracking-wider animate-pulse">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                    Compiling AST
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Output Ready
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 relative">
                <Editor
                  value={typedCode}
                  language="python"
                  height="100%"
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    padding: { top: 12 },
                    wordWrap: "on",
                    renderLineHighlight: "none",
                  }}
                />
                
                <AnimatePresence>
                  {!typingDone && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute bottom-4 right-4 flex items-center gap-2 bg-indigo-950/90 border border-indigo-850 backdrop-blur px-3 py-1.5 rounded-lg shadow-lg"
                    >
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                      <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider font-mono">
                        Writing AST...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test preview */}
      <AnimatePresence>
        {liveData.testPreview && !liveData.codePreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-gray-900/80 rounded-xl p-3 border border-gray-800 flex-shrink-0"
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
              Generated Tests Preview
            </p>
            <pre className="text-[11px] text-purple-300 font-mono whitespace-pre-wrap line-clamp-6">
              {liveData.testPreview}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation results live */}
      <AnimatePresence>
        {liveData.passed !== undefined && liveData.total !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/80 rounded-xl p-3 border border-gray-800 flex items-center gap-3"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              liveData.passed === liveData.total
                ? "bg-emerald-900/50 text-emerald-400"
                : "bg-amber-900/50 text-amber-400"
            }`}>
              {liveData.passed}/{liveData.total}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300">Tests Passed</p>
              <p className="text-[10px] text-gray-500">
                {liveData.passed === liveData.total ? "All tests passing!" : "Some tests need attention"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No code preview yet — show minimal spinner */}
      {!liveData.codePreview && !liveData.functions?.length && !liveData.docsPreview && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 animate-spin" />
            </div>
            <p className="text-xs text-gray-500">{liveData.message || "Processing..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
