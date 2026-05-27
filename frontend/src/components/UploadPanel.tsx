import { useState, useRef, useCallback } from "react";
import { Upload, FileCode2, ClipboardPaste, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SourceLang, TargetLang } from "../types";

interface Props {
  onSubmit: (
    input: File | string,
    sourceLang: SourceLang,
    targetLang: TargetLang,
  ) => void;
  isLoading: boolean;
}

const SOURCE_LANGS: { value: SourceLang; label: string }[] = [
  { value: "php", label: "PHP" },
  { value: "cobol", label: "COBOL" },
  { value: "vb6", label: "VB6" },
  { value: "perl", label: "Perl" },
  { value: "fortran", label: "Fortran" },
  { value: "pascal", label: "Pascal" },
  { value: "java", label: "Java (Legacy)" },
];

const TARGET_LANGS: { value: TargetLang; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
];

const SAMPLE_PHP = `<?php
function calculateInvoiceTotal($items, $taxRate) {
    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += $item['price'] * $item['qty'];
    }
    $tax = $subtotal * ($taxRate / 100);
    return $subtotal + $tax;
}
?>`;

export default function UploadPanel({ onSubmit, isLoading }: Props) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [sourceLang, setSourceLang] = useState<SourceLang>("php");
  const [targetLang, setTargetLang] = useState<TargetLang>("python");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 1024 * 1024 * 1024; // 1GB

  const handleFile = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_SIZE) {
      setFileError(
        `File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max 1GB.`,
      );
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSubmit = () => {
    if (tab === "upload" && file) {
      onSubmit(file, sourceLang, targetLang);
    } else if (tab === "paste" && code.trim()) {
      onSubmit(code, sourceLang, targetLang);
    }
  };

  const hasInput = tab === "upload" ? !!file : code.trim().length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg relative z-10">
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold relative transition-colors ${
            tab === "upload"
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab === "upload" && (
            <motion.div
              layoutId="uploadPanelTabIndicator"
              className="absolute inset-0 bg-white dark:bg-gray-700 shadow-sm rounded-md -z-10"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Upload className="w-3.5 h-3.5" />
          Upload File
        </button>
        <button
          onClick={() => setTab("paste")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold relative transition-colors ${
            tab === "paste"
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab === "paste" && (
            <motion.div
              layoutId="uploadPanelTabIndicator"
              className="absolute inset-0 bg-white dark:bg-gray-700 shadow-sm rounded-md -z-10"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <ClipboardPaste className="w-3.5 h-3.5" />
          Paste Code
        </button>
      </div>

      {/* Upload area */}
      <AnimatePresence mode="wait">
        {tab === "upload" ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              animate={{
                borderColor: dragOver
                  ? "var(--color-chart, #4c6ef5)"
                  : file
                  ? "rgba(16, 185, 129, 0.5)"
                  : "rgba(229, 231, 235, 0.45)",
                backgroundColor: dragOver ? "rgba(76, 110, 245, 0.04)" : "rgba(0,0,0,0)",
                scale: dragOver ? 1.02 : 1,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".php,.cob,.bas,.vb,.txt,.zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-active"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <div className="relative inline-block">
                      <FileCode2 className="w-10 h-10 mx-auto text-emerald-500" />
                      <motion.div
                        layoutId="glow-dot"
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <Upload className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-600 stroke-[1.5]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Drag source code here
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supports ZIP or individual source files
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {fileError && (
              <p className="mt-2 text-xs text-red-500 font-medium">
                {fileError}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={SAMPLE_PHP}
              rows={10}
              className="
                w-full rounded-xl border border-gray-300 dark:border-gray-700
                bg-gray-50 dark:bg-gray-800/50 p-3 text-xs font-mono
                text-gray-800 dark:text-gray-200
                placeholder:text-gray-400 dark:placeholder:text-gray-600
                focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400
                resize-none transition-all
              "
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Source
          </label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value as SourceLang)}
            className="
              w-full rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 px-3 py-2 text-sm
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-gray-400/50
              cursor-pointer
            "
          >
            {SOURCE_LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Target
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as TargetLang)}
            className="
              w-full rounded-lg border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800 px-3 py-2 text-sm
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-gray-400/50
              cursor-pointer
            "
          >
            {TARGET_LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!hasInput || isLoading}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-2.5
          rounded-xl text-sm font-semibold transition-all duration-200
          ${
            hasInput && !isLoading
              ? "bg-brand-600 hover:bg-brand-500 text-white active:scale-[0.98]"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Modernize"
        )}
      </button>
    </div>
  );
}
