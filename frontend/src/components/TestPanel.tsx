import { useState } from "react";
import Editor from "@monaco-editor/react";
import { CheckCircle2, XCircle, Circle, Loader2 } from "lucide-react";
import type { TestResult } from "../types";

interface Props {
  unitTests: string;
  testResults: TestResult[];
  modernizedCode?: string;
  targetLang?: string;
}

function detectLanguage(code: string): string {
  if (code.includes("import pytest") || code.includes("from main import"))
    return "python";
  if (code.includes("describe(") || code.includes("import {"))
    return "typescript";
  if (code.includes("func Test")) return "go";
  if (code.includes("@Test") || code.includes("import org.junit"))
    return "java";
  return "python";
}

export default function TestPanel({
  unitTests,
  testResults,
  modernizedCode,
  targetLang,
}: Props) {
  const [results, setResults] = useState(testResults);
  const [isRetesting, setIsRetesting] = useState(false);
  const passed = results.filter((r) => r.passed === true).length;
  const failed = results.filter((r) => r.passed === false).length;
  const manual = results.filter((r) => r.passed === null).length;
  const total = results.length;
  const allPassed = total > 0 && failed === 0 && manual === 0;

  const handleRetest = async () => {
    if (!modernizedCode || !targetLang) return;
    setIsRetesting(true);
    try {
      const formData = new FormData();
      formData.append("modernized_code", modernizedCode);
      formData.append("test_code", unitTests);
      formData.append("target_lang", targetLang);
      const res = await fetch("http://localhost:8000/api/retest", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.test_results);
      }
    } catch {
      // silently fail
    } finally {
      setIsRetesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Test code editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Generated Tests
        </h3>
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {unitTests ? (
            <Editor
              value={unitTests}
              language={detectLanguage(unitTests)}
              height="100%"
              theme="vs-dark"
              loading={
                <div className="flex items-center justify-center h-full gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading editor...</span>
                </div>
              }
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                padding: { top: 8 },
                wordWrap: "on",
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Tests will appear here after modernization.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Test results */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Test Results
          </h3>
          {modernizedCode && (
            <button
              onClick={handleRetest}
              disabled={isRetesting}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isRetesting
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-wait"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {isRetesting ? "Re-running..." : "Re-run Tests"}
            </button>
          )}
        </div>

        {testResults.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Tests will run automatically after rewriting.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Summary bar */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                allPassed
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
              }`}
            >
              {allPassed ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {passed} / {total} tests passed
              {manual > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({manual} require manual review)
                </span>
              )}
            </div>

            {/* Individual results */}
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  {result.passed === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  )}
                  {result.passed === false && (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  {result.passed === null && (
                    <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 font-mono truncate">
                      {result.name}
                    </p>
                    {result.error && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
