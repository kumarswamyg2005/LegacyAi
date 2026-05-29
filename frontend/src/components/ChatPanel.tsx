import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "../types";



interface Props {
  originalCode: string;
  modernizedCode: string;
  sourceLang: string;
  targetLang: string;
  autoQuery?: string | null;
  onAutoQueryProcessed?: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const STARTER_PROMPTS = [
  "Explain the key architectural changes made here.",
  "Are there any security concerns with the new code?",
  "How can we optimize the loop structure for performance?",
];

export default function ChatPanel({
  originalCode,
  modernizedCode,
  sourceLang,
  targetLang,
  autoQuery = null,
  onAutoQueryProcessed,
  messages,
  setMessages,
}: Props) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_code: originalCode,
          modernized_code: modernizedCode,
          source_lang: sourceLang,
          target_lang: targetLang,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive a reply from the server.");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply || "No response received.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "An unexpected error occurred."}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [originalCode, modernizedCode, sourceLang, targetLang, messages, isSending]);

  // Handle incoming line highlight/explanation requests from DiffViewer
  useEffect(() => {
    if (autoQuery && onAutoQueryProcessed) {
      handleSend(autoQuery);
      onAutoQueryProcessed();
    }
  }, [autoQuery, onAutoQueryProcessed, handleSend]);

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          Refactoring & Migration Assistant
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Ask questions, explain code translations, or request performance enhancements from the virtual engineer.
        </p>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4"
              >
                <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="max-w-sm space-y-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Ask a refactoring question
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Get inline logic explanations or performance assessments for your modernized target.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm pt-2">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-[11px] text-gray-600 dark:text-gray-400 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg, i) => {
              const isAssistant = msg.role === "assistant";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${
                    isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isAssistant 
                      ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isAssistant
                      ? "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-800"
                      : "bg-indigo-600 text-white shadow-sm"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}

            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mr-auto max-w-[85%]"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend(input);
            }}
            placeholder="Ask about code refactoring..."
            disabled={isSending}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all disabled:opacity-60"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isSending}
            className={`px-4 py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center transition-all ${
              input.trim() && !isSending
                ? "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97]"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-transparent"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
