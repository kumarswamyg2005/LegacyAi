import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, FileText } from "lucide-react";

interface Props {
  documentation: string;
}

export default function DocPanel({ documentation }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(documentation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [documentation]);

  if (!documentation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Documentation will appear here after modernization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full animate-fade-in">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
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
            Copy docs
          </>
        )}
      </button>

      {/* Markdown content */}
      <div className="overflow-y-auto h-full pr-2">
        <div className="prose-custom">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mt-6 mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-medium mt-4 mb-1.5 text-gray-800 dark:text-gray-200">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-2 text-gray-700 dark:text-gray-300">
                  {children}
                </p>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">
                      <code>{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <>{children}</>,
              ul: ({ children }) => (
                <ul className="list-disc ml-4 text-sm space-y-1 mb-2 text-gray-700 dark:text-gray-300">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal ml-4 text-sm space-y-1 mb-2 text-gray-700 dark:text-gray-300">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-white">
                  {children}
                </strong>
              ),
            }}
          >
            {documentation}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
