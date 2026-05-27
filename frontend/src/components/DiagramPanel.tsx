import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";

interface Props {
  diagram: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

export default function DiagramPanel({ diagram }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [zoomScale, setZoomScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!diagram) return;

    const render = async () => {
      try {
        setError(null);
        const isDark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
        });
        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, diagram);
        // Fix SVG sizing:
        // 1. Force width to 100% to fill container
        // 2. Remove the height attribute (let viewBox aspect ratio control height)
        // 3. Strip max-width from inline style (Mermaid adds this, it fights responsive sizing)
        const processedSvg = rendered
          .replace(/\bwidth="[^"]*"/g, 'width="100%"')
          .replace(/\s*height="[^"]*"/g, '')
          .replace(/style="([^"]*)"/g, (_, styleContent) => {
            const cleaned = styleContent
              .replace(/max-width\s*:\s*[^;]+;?\s*/g, '')
              .replace(/;\s*$/, '')
              .trim();
            return cleaned ? `style="${cleaned}"` : '';
          });
        setSvg(processedSvg);
      } catch (e) {
        console.error("Mermaid rendering error:", e);
        setError(
          `Failed to render diagram. The generated Mermaid syntax may have issues. Error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    };

    render();
  }, [diagram]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    if (fullscreen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fullscreen]);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.5, prev - 0.15));
  const handleResetZoom = () => setZoomScale(1);

  if (!diagram) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Architecture diagram will appear here after modernization.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          Architecture Diagram
        </h2>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-[10px] font-mono font-bold px-2.5 text-gray-600 dark:text-gray-400 hover:text-indigo-500 transition-colors"
              title="Reset Zoom"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Full Screen
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl overflow-y-auto">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
            {diagram}
          </pre>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur p-4 relative min-h-[350px]">
          <motion.div
            drag
            dragConstraints={{ left: -800, right: 800, top: -800, bottom: 800 }}
            dragElastic={0.15}
            animate={{ scale: zoomScale }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="cursor-grab active:cursor-grabbing select-none [&_svg]:w-full [&_svg]:h-auto [&_svg]:block origin-top-left"
            dangerouslySetInnerHTML={{ __html: svg }}
            title="Drag to pan, use controls to zoom"
          />
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-400 font-medium pointer-events-none">
            💡 Drag diagram to pan
          </div>
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold">
          View Diagram Source
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 overflow-x-auto font-mono text-[11px]">
          {diagram}
        </pre>
      </details>

      {/* Fullscreen Overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-6 shadow-2xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Architecture Diagram
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200">
                  <button
                    onClick={handleZoomOut}
                    className="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="text-xs font-mono font-bold px-3 text-gray-600 dark:text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setFullscreen(false)}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative overflow-auto flex bg-gray-50/50 dark:bg-gray-950/50 rounded-xl mt-4">
              <motion.div
                drag
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                dragElastic={0.1}
                animate={{ scale: zoomScale }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="cursor-grab active:cursor-grabbing select-none [&_svg]:w-full [&_svg]:h-auto [&_svg]:block origin-top-left p-4"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
