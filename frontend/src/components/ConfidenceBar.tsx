import { motion } from "framer-motion";

interface Props {
  score: number;
}

export default function ConfidenceBar({ score }: Props) {
  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (score >= 0.8)
      return {
        bar: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
      };
    if (score >= 0.5)
      return {
        bar: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
      };
    return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  };

  const getLabel = () => {
    if (score >= 0.8) return "High confidence";
    if (score >= 0.5) return "Moderate confidence";
    return "Low confidence";
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Confidence
        </span>
        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {percentage}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      <span className={`text-xs font-medium ${colors.text}`}>{getLabel()}</span>
    </div>
  );
}
