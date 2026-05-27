import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { PipelineStep } from "../types";

interface Props {
  steps: PipelineStep[];
}

export default function StepProgress({ steps }: Props) {
  const completedCount = steps.filter((s) => s.status === "complete").length;
  // Progress ratio from 0 to 1
  const progressRatio = steps.length > 1 ? completedCount / (steps.length - 1) : 0;

  return (
    <div className="relative py-2 w-full">
      <div className="flex items-center justify-between gap-1 relative w-full">
        
        {/* Dynamic connecting progress line background */}
        <div className="absolute top-[15px] left-6 right-6 h-[2px] bg-gray-200 dark:bg-gray-800 -z-10" />
        
        {/* Glowing animated progress line fill */}
        <motion.div
          className="absolute top-[15px] left-6 h-[2px] bg-gradient-to-r from-indigo-500 to-emerald-500 -z-10 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
          initial={{ width: "0%" }}
          animate={{ width: `calc(${progressRatio * 100}% - 48px)` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {steps.map((step) => {
          const isCompleted = step.status === "complete";
          const isActive = step.status === "active";
          const isError = step.status === "error";
          const isPending = step.status === "pending";

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 min-w-[54px] relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isActive ? [1, 1.08, 1] : 1,
                  opacity: 1,
                }}
                transition={{
                  scale: isActive ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : { duration: 0.2 },
                }}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isPending
                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400"
                    : isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                    : isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-500"
                    : "bg-red-50 dark:bg-red-950/20 border-red-500 text-red-500"
                  }
                `}
              >
                {isPending && (
                  <Circle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 stroke-[1.5]" />
                )}
                {isActive && (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                )}
                {isCompleted && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                {isError && (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
              </motion.div>
              
              <span
                className={`
                  text-[10px] mt-1.5 font-semibold text-center leading-tight
                  ${isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isError
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-400 dark:text-gray-500"
                  }
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
