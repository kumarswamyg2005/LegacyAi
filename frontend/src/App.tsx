import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, FolderOpen } from "lucide-react";

import type {
  PipelineStep,
  ModernizeResponse,
  SourceLang,
  TargetLang,
  ChatMessage,
} from "./types";
import { modernizeCode } from "./api/client";
import StepProgress from "./components/StepProgress";
import UploadPanel from "./components/UploadPanel";
import DiffViewer from "./components/DiffViewer";
import DocPanel from "./components/DocPanel";
import TestPanel from "./components/TestPanel";
import ConfidenceBar from "./components/ConfidenceBar";
import ComplexityPanel from "./components/ComplexityPanel";
import DiagramPanel from "./components/DiagramPanel";
import SandboxPanel from "./components/SandboxPanel";
import PDFExport from "./components/PDFExport";
import AuthPage from "./components/AuthPage";
import LiveProcessingView from "./components/LiveProcessingView";
import RoadmapPanel from "./components/RoadmapPanel";
import ChatPanel from "./components/ChatPanel";

const INITIAL_STEPS: PipelineStep[] = [
  { id: "parsing", label: "Parsing", status: "pending" },
  { id: "documenting", label: "Documenting", status: "pending" },
  { id: "rewriting", label: "Rewriting", status: "pending" },
  { id: "testing", label: "Test Gen", status: "pending" },
  { id: "validating", label: "Validating", status: "pending" },
];

type TabId =
  | "diff"
  | "docs"
  | "tests"
  | "sandbox"
  | "complexity"
  | "diagram"
  | "roadmap"
  | "chat";

export default function App() {
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [response, setResponse] = useState<ModernizeResponse | null>(null);
  const [multiResponses, setMultiResponses] = useState<Record<string, ModernizeResponse>>({});
  const [filesStatus, setFilesStatus] = useState<Record<string, { index: number; status: string }>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("diff");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("legacylift-dark") === "true" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  });
  const [sourceLang, setSourceLang] = useState<SourceLang>("php");
  const [targetLang, setTargetLang] = useState<TargetLang>("python");
  const [liveData, setLiveData] = useState<{
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
  }>({ currentStep: "", message: "" });
  const [authed, setAuthed] = useState(() => {
    return (
      !!localStorage.getItem("ll_token") || !!localStorage.getItem("ll_skipped")
    );
  });
  const [user, setUser] = useState<any>(() => {
    const stored = localStorage.getItem("ll_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [chatAutoQuery, setChatAutoQuery] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string>("main");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("legacylift-dark", String(darkMode));
  }, [darkMode]);

  // Update step status helper
  const updateStep = useCallback(
    (stepId: string, status: PipelineStep["status"]) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status } : s)),
      );
    },
    [],
  );

  const handleExplainLine = useCallback((lineNumber: number, lineContent: string) => {
    setActiveTab("chat");
    setChatAutoQuery(`Explain how line ${lineNumber} of the modernized code maps to the legacy code:\n\`\`\`${targetLang}\n${lineContent}\n\`\`\``);
  }, [targetLang]);

  // Main modernization handler
  const handleModernize = useCallback(
    async (input: File | string, sLang: SourceLang, tLang: TargetLang) => {
      // Reset state
      setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));
      setResponse(null);
      setMultiResponses({});
      setFilesStatus({});
      setSelectedFile(null);
      setError(null);
      setIsLoading(true);
      setSourceLang(sLang);
      setTargetLang(tLang);
      setUploadedFilename(typeof input === "string" ? "main" : input.name);
      setLiveData({ currentStep: "parsing", message: "Starting pipeline..." });
      setChatMessages([]); // Reset chat for new modernization

      try {
        let currentStepIdx = 0;

        for await (const event of modernizeCode(input, sLang, tLang)) {
          if (event.step === "error") {
            setError(event.error || "An unknown error occurred");
            setSteps((prev) =>
              prev.map((s) =>
                s.status === "active" ? { ...s, status: "error" } : s,
              ),
            );
            break;
          }

          if (event.step === "multi_progress") {
            const data = event.data as any;
            setFilesStatus((prev) => ({
              ...prev,
              [data.file]: {
                index: data.index,
                status: "pending",
              },
            }));
            setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));
            continue;
          }

          if (event.step === "done") {
            const fileData = event.data as any;
            const isMulti = fileData && fileData._file !== undefined;

            if (isMulti) {
              setMultiResponses((prev) => ({
                ...prev,
                [fileData._file]: fileData as unknown as ModernizeResponse,
              }));
              setFilesStatus((prev) => ({
                ...prev,
                [fileData._file]: {
                  ...prev[fileData._file],
                  status: "complete",
                },
              }));
              setSelectedFile((prev) => prev || fileData._file);
              
              if (fileData._index === fileData._total - 1) {
                setResponse(fileData as unknown as ModernizeResponse);
                setSteps((prev) => prev.map((s) => ({ ...s, status: "complete" })));
              }
            } else {
              setResponse(event.data as unknown as ModernizeResponse);
              setSteps((prev) => prev.map((s) => ({ ...s, status: "complete" })));
              break;
            }
            continue;
          }

          // Find the step index
          const stepIdx = INITIAL_STEPS.findIndex((s) => s.id === event.step);
          if (stepIdx === -1) continue;

          // Capture live data for the processing view
          const fileData = event.data as any;
          const isMulti = fileData && fileData._file !== undefined;

          if (isMulti) {
            setFilesStatus((prev) => ({
              ...prev,
              [fileData._file]: {
                ...prev[fileData._file],
                status: event.step,
              },
            }));
          }

          setLiveData((prev) => ({
            ...prev,
            currentStep: event.step,
            message: (event.data.message as string) || prev.message,
            functions: (event.data.functions as string[]) || prev.functions,
            classes: (event.data.classes as string[]) || prev.classes,
            summary: (event.data.summary as string) || prev.summary,
            docsPreview: (event.data.preview as string) || prev.docsPreview,
            codePreview:
              (event.data.code_preview as string) || prev.codePreview,
            testPreview:
              (event.data.test_preview as string) || prev.testPreview,
            confidence: (event.data.confidence as number) ?? prev.confidence,
            passed: (event.data.passed as number) ?? prev.passed,
            total: (event.data.total as number) ?? prev.total,
            _file: fileData._file,
            _index: fileData._index,
            _total: fileData._total,
          }));

          if (event.data.complete) {
            updateStep(event.step, "complete");
            currentStepIdx = stepIdx + 1;
            if (currentStepIdx < INITIAL_STEPS.length) {
              updateStep(INITIAL_STEPS[currentStepIdx].id, "active");
            }
          } else {
            updateStep(event.step, "active");
            currentStepIdx = stepIdx;
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [updateStep],
  );

  const modernizedFiles = useMemo(() => {
    if (Object.keys(multiResponses).length > 0) {
      const files: Record<string, string> = {};
      Object.entries(multiResponses).forEach(([fname, resp]) => {
        files[fname] = resp.modernized_code;
      });
      return files;
    }
    if (response) {
      return { [uploadedFilename]: response.modernized_code };
    }
    return {};
  }, [response, multiResponses, uploadedFilename]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "diff", label: "Diff View" },
    { id: "docs", label: "Documentation" },
    { id: "tests", label: "Tests" },
    { id: "sandbox", label: "Sandbox" },
    { id: "complexity", label: "Complexity" },
    { id: "diagram", label: "Architecture" },
    { id: "roadmap", label: "Roadmap" },
    { id: "chat", label: "AI Chat" },
  ];

  if (!authed) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <AuthPage
          onLogin={(_token, userData) => {
            setAuthed(true);
            setUser(userData);
          }}
          onSkip={() => {
            localStorage.setItem("ll_skipped", "true");
            setAuthed(true);
          }}
        />
      </div>
    );
  }

  const currentResponse = selectedFile ? multiResponses[selectedFile] : response;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 relative overflow-hidden">
      <div className="ambient-bg">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <div className="grid-pattern text-gray-300 dark:text-gray-800" />
      </div>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              LegacyLift
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 -mt-0.5">
              Code modernization tool
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentResponse && (
            <PDFExport
              response={currentResponse}
              sourceLang={sourceLang}
              targetLang={targetLang}
            />
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                {user.tier}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("ll_token");
                  localStorage.removeItem("ll_user");
                  localStorage.removeItem("ll_skipped");
                  setAuthed(false);
                  setUser(null);
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left sidebar */}
        <aside className="w-[380px] border-r border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <UploadPanel onSubmit={handleModernize} isLoading={isLoading} />

            {/* Step progress */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <StepProgress steps={steps} />
            </div>

            {/* Project File Tree Explorer */}
            {Object.keys(filesStatus).length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <h3 className="text-[10px] font-bold uppercase tracking-wider">
                    Project Workspace
                  </h3>
                </div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                  {Object.entries(filesStatus).map(([filename, details]) => {
                    const isSelected = selectedFile === filename;
                    const isComp = details.status === "complete";
                    const isAct = details.status !== "complete" && details.status !== "pending";
                    return (
                      <button
                        key={filename}
                        onClick={() => setSelectedFile(filename)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono text-left border transition-all ${
                          isSelected
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                            : "bg-white dark:bg-gray-900 border-gray-200/50 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{filename}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wider ${
                          isComp
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            : isAct
                            ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 animate-pulse"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                        }`}>
                          {details.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confidence bar */}
            <AnimatePresence>
              {currentResponse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 border-t border-gray-200 dark:border-gray-800"
                >
                  <ConfidenceBar score={currentResponse.confidence_score} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Change summary */}
            <AnimatePresence>
              {currentResponse?.change_summary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 border-t border-gray-200 dark:border-gray-800"
                >
                  <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Change Summary
                  </h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {currentResponse.change_summary}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-4 mt-3 mb-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    Error: {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar footer */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
              LegacyLift v2.0
            </p>
          </div>
        </aside>

        {/* Right main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-4 flex gap-1 pt-1 relative overflow-hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors relative z-10
                    ${
                      isActive
                        ? "text-gray-900 dark:text-white bg-transparent"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="dashboardActiveTab"
                      className="absolute inset-0 bg-gray-50 dark:bg-gray-950 rounded-t-lg border-t border-x border-gray-200 dark:border-gray-800 -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col">
            <AnimatePresence mode="wait">
              {/* Empty state  */}
              {!currentResponse && !isLoading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <div className="text-center max-w-md">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Upload legacy code to get started
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Upload legacy code (PHP, COBOL, VB6, Perl, Fortran,
                      Pascal, Java) or a ZIP project archive, and modernize it into Python,
                      TypeScript, Go, or Java with full docs, tests, and analysis.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Loading state — live processing view */}
              {isLoading && !currentResponse && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <LiveProcessingView liveData={liveData} />
                </motion.div>
              )}

              {/* Results */}
              {/* Results */}
              {currentResponse && (
                <div className="h-full flex flex-col min-h-0">
                  {activeTab === "diff" && (
                    <DiffViewer
                      original={currentResponse.original_code}
                      modernized={currentResponse.modernized_code}
                      sourceLang={sourceLang}
                      targetLang={targetLang}
                      documentation={currentResponse.documentation}
                      unitTests={currentResponse.unit_tests}
                      onExplainLine={handleExplainLine}
                    />
                  )}
                  {activeTab === "docs" && (
                    <div className="h-full overflow-y-auto">
                      <DocPanel documentation={currentResponse.documentation} />
                    </div>
                  )}
                  {activeTab === "tests" && (
                    <TestPanel
                      unitTests={currentResponse.unit_tests}
                      testResults={currentResponse.test_results}
                      modernizedCode={currentResponse.modernized_code}
                      targetLang={targetLang}
                    />
                  )}
                  {activeTab === "sandbox" && (
                    <SandboxPanel
                      code={currentResponse.modernized_code}
                      language={targetLang}
                    />
                  )}
                  {activeTab === "complexity" && (
                    <div className="h-full overflow-y-auto">
                      <ComplexityPanel complexity={currentResponse.complexity} />
                    </div>
                  )}
                  {activeTab === "diagram" && (
                    <div className="h-full">
                      <DiagramPanel diagram={currentResponse.architecture_diagram} />
                    </div>
                  )}
                  {activeTab === "roadmap" && (
                    <RoadmapPanel
                      targetLang={targetLang}
                      modernizedFiles={modernizedFiles}
                    />
                  )}
                  {activeTab === "chat" && (
                    <ChatPanel
                      originalCode={currentResponse.original_code}
                      modernizedCode={currentResponse.modernized_code}
                      sourceLang={sourceLang}
                      targetLang={targetLang}
                      autoQuery={chatAutoQuery}
                      onAutoQueryProcessed={() => setChatAutoQuery(null)}
                      messages={chatMessages}
                      setMessages={setChatMessages}
                    />
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
