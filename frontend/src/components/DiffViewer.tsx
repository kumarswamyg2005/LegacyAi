import { useState, useCallback } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Copy, Check, Download, Loader2, Sparkles } from "lucide-react";
import JSZip from "jszip";

interface Props {
  original: string;
  modernized: string;
  sourceLang: string;
  targetLang: string;
  documentation?: string;
  unitTests?: string;
  onExplainLine?: (lineNumber: number, lineContent: string) => void;
}

const MONACO_LANG_MAP: Record<string, string> = {
  php: "php",
  cobol: "plaintext",
  vb6: "vb",
  python: "python",
  typescript: "typescript",
  go: "go",
  java: "java",
};

const FILE_EXT_MAP: Record<string, string> = {
  python: "py",
  typescript: "ts",
  go: "go",
  java: "java",
};

export default function DiffViewer({
  original,
  modernized,
  sourceLang,
  targetLang,
  documentation = "",
  unitTests = "",
  onExplainLine,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [selectedLine, setSelectedLine] = useState<{ number: number; content: string } | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(modernized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [modernized]);

  const handleDownload = useCallback(async () => {
    const zip = new JSZip();
    const ext = FILE_EXT_MAP[targetLang] || "txt";
    zip.file(`modernized.${ext}`, modernized);
    if (unitTests) zip.file(`tests.${ext}`, unitTests);
    if (documentation) zip.file("documentation.md", documentation);
    zip.file(`original.${sourceLang === "vb6" ? "bas" : sourceLang}`, original);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legacylift_output.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [modernized, unitTests, documentation, original, sourceLang, targetLang]);

  const handleEditorDidMount = useCallback((editor: any) => {
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      const model = modifiedEditor.getModel();
      if (model) {
        const content = model.getLineContent(position.lineNumber);
        setSelectedLine({ number: position.lineNumber, content });
      }
    });
  }, []);

  const sourceMonacoLang = MONACO_LANG_MAP[sourceLang] || "plaintext";
  const targetMonacoLang = MONACO_LANG_MAP[targetLang] || "plaintext";

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Original ({sourceLang.toUpperCase()})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Modernized ({targetLang.toUpperCase()})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedLine && onExplainLine && (
            <button
              onClick={() => onExplainLine(selectedLine.number, selectedLine.content)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explain Line {selectedLine.number}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-300 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-300 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download .zip
          </button>
        </div>
      </div>

      {/* Monaco Diff Editor */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <DiffEditor
          original={original}
          modified={modernized}
          language={targetMonacoLang}
          originalLanguage={sourceMonacoLang}
          height="100%"
          theme="vs-dark"
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading editor...</span>
            </div>
          }
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            folding: true,
            wordWrap: "on",
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
