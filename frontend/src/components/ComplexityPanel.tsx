import { motion } from "framer-motion";
import type { ComplexityInfo } from "../types";

interface Props {
  complexity: ComplexityInfo;
}

export default function ComplexityPanel({ complexity }: Props) {
  const cScore = complexity.complexity_score;
  const normalizedScoreRatio = Math.max(0, Math.min(10, cScore)) / 10;
  
  // Dynamic color coding for severity
  const scoreColor =
    cScore <= 3
      ? "text-emerald-500"
      : cScore <= 6
      ? "text-amber-500"
      : "text-rose-500";

  const strokeColor =
    cScore <= 3
      ? "#10b981"
      : cScore <= 6
      ? "#f59e0b"
      : "#f43f5e";

  const difficultyBg =
    complexity.difficulty === "Low"
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
      : complexity.difficulty === "Medium"
      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";

  // SVG circle calculations
  const radius = 46;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="h-full overflow-y-auto animate-fade-in p-2">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Migration Complexity Report
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyBg}`}>
            {complexity.difficulty} Difficulty
          </span>
        </div>

        {/* Visual score gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="relative w-28 h-28 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="transparent"
                  stroke="var(--color-border, #e5e7eb)"
                  strokeWidth={strokeWidth}
                  className="stroke-gray-200 dark:stroke-gray-800"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference * (1 - normalizedScoreRatio) }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute text-center">
                <span className={`text-3xl font-extrabold ${scoreColor}`}>{cScore}</span>
                <span className="text-gray-400 text-xs block -mt-1">/10</span>
              </div>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Complexity Index</p>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-indigo-500 tracking-tight mb-4">
              {complexity.estimated_effort_hours}h
            </span>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Est. Effort</p>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-emerald-500 tracking-tight mb-4 animate-pulse">
              {complexity.size_category}
            </span>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Project Size</p>
          </div>
        </div>

        {/* Detailed Metrics List */}
        <div className="glass-card rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Codebase Statistics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
            <div className="divide-y divide-gray-200/50 dark:divide-gray-800/50">
              <MetricItem label="Total File Lines" val={complexity.total_lines} />
              <MetricItem label="Lines of Code" val={complexity.code_lines} />
              <MetricItem label="Comment Lines" val={complexity.comment_lines} />
              <MetricItem label="Blank Lines" val={complexity.blank_lines} />
            </div>
            <div className="divide-y divide-gray-200/50 dark:divide-gray-800/50">
              <MetricItem label="Functions" val={complexity.num_functions} />
              <MetricItem label="Classes" val={complexity.num_classes} />
              <MetricItem label="Avg Function Length" val={`${complexity.avg_function_length} lines`} />
              <MetricItem label="Max Nesting Depth" val={complexity.max_nesting_depth} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-gray-50/20 dark:bg-gray-900/20 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-4 justify-between w-full">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cyclomatic Complexity</span>
              <span className="text-sm font-bold font-mono text-indigo-500">{complexity.cyclomatic_complexity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, val }: { label: string; val: any }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-200">{val}</span>
    </div>
  );
}
