import { useState, useMemo } from "react";
import { DollarSign, Landmark, TrendingUp, ShieldCheck } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  complexityScore: number;
  estimatedHours: number;
}

export default function ROIDashboard({ complexityScore, estimatedHours }: Props) {
  // Configurable sliders state
  const [hourlyRate, setHourlyRate] = useState(85);
  const [legacyMonthlyCost, setLegacyMonthlyCost] = useState(3500);
  const [modernMonthlyCost, setModernMonthlyCost] = useState(150);

  // Financial calculations
  const stats = useMemo(() => {
    // LegacyLift automated translation reduces manual effort by roughly 80%
    const manualMigrationCost = estimatedHours * hourlyRate;
    const automatedMigrationCost = Math.round(estimatedHours * 0.2 * hourlyRate);
    const engineeringSavings = manualMigrationCost - automatedMigrationCost;

    const yearlyLegacyOverhead = legacyMonthlyCost * 12;
    const yearlyModernOverhead = modernMonthlyCost * 12;
    const annualHostingSavings = yearlyLegacyOverhead - yearlyModernOverhead;

    // Monthly break-even calculations
    const monthlyNetSavings = annualHostingSavings / 12;
    const breakevenMonths = monthlyNetSavings > 0 
      ? parseFloat((automatedMigrationCost / monthlyNetSavings).toFixed(2))
      : 0;

    const fiveYearSavings = Math.round(annualHostingSavings * 5 + engineeringSavings);

    return {
      manualMigrationCost,
      automatedMigrationCost,
      engineeringSavings,
      yearlyLegacyOverhead,
      yearlyModernOverhead,
      annualHostingSavings,
      breakevenMonths,
      fiveYearSavings,
    };
  }, [estimatedHours, hourlyRate, legacyMonthlyCost, modernMonthlyCost]);

  // Generate Recharts trend data
  const chartData = useMemo(() => {
    const data = [];
    let cumulativeLegacy = 0;
    let cumulativeModern = stats.automatedMigrationCost;

    for (let year = 0; year <= 5; year++) {
      if (year > 0) {
        cumulativeLegacy += stats.yearlyLegacyOverhead;
        cumulativeModern += stats.yearlyModernOverhead;
      }
      data.push({
        year: `Year ${year}`,
        "Legacy Debt": cumulativeLegacy,
        "Modern Cloud": cumulativeModern,
        "Net Savings": Math.max(0, cumulativeLegacy - cumulativeModern),
      });
    }
    return data;
  }, [stats]);

  return (
    <div className="h-full overflow-y-auto animate-fade-in p-2">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Migration Cost & ROI Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analyze the cost effectiveness and financial savings of automated legacy migration (Complexity Score: {complexityScore}/10).
          </p>
        </div>

        {/* Dynamic Parameter Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
              <span>Developer Hourly Rate</span>
              <span className="font-mono text-indigo-500">${hourlyRate}/hr</span>
            </div>
            <input
              type="range"
              min="40"
              max="200"
              step="5"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
              <span>Legacy Hosting overhead</span>
              <span className="font-mono text-indigo-500">${legacyMonthlyCost}/mo</span>
            </div>
            <input
              type="range"
              min="500"
              max="15000"
              step="250"
              value={legacyMonthlyCost}
              onChange={(e) => setLegacyMonthlyCost(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
              <span>Modern Cloud Cost</span>
              <span className="font-mono text-indigo-500">${modernMonthlyCost}/mo</span>
            </div>
            <input
              type="range"
              min="20"
              max="2000"
              step="10"
              value={modernMonthlyCost}
              onChange={(e) => setModernMonthlyCost(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Primary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Migration Cost
              </span>
              <Landmark className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              ${stats.automatedMigrationCost.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">
              Saving ${stats.engineeringSavings.toLocaleString()} vs manual
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Hosting Savings
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              ${stats.annualHostingSavings.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Per Year saved overhead</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Break-Even Month
              </span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {stats.breakevenMonths}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Month to pay off migration</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-gray-200/50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                5-Year Value
              </span>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              ${stats.fiveYearSavings.toLocaleString()}
            </p>
            <p className="text-[10px] text-indigo-500 font-semibold mt-1">Total Net Return</p>
          </div>
        </div>

        {/* 5-Year Cumulative Savings chart */}
        <div className="glass-card rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              5-Year Cumulative Cost Comparison
            </h3>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
              Projection Models
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLegacy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorModern" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="year" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(55, 65, 81, 0.4)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    color: "#ffffff",
                  }}
                  itemStyle={{ color: "#ffffff" }}
                  labelStyle={{ fontWeight: "bold", color: "#818cf8" }}
                  formatter={(val: any) => [val !== undefined && val !== null ? `$${val.toLocaleString()}` : ""]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="Legacy Debt"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLegacy)"
                />
                <Area
                  type="monotone"
                  dataKey="Modern Cloud"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorModern)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
