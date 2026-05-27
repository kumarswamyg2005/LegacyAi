import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onLogin: (token: string, user: any) => void;
  onSkip: () => void;
}

const API_BASE = "http://localhost:8000";

export default function AuthPage({ onLogin, onSkip }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }

      const data = await res.json();
      localStorage.setItem("ll_token", data.access_token);
      localStorage.setItem("ll_user", JSON.stringify(data.user));
      onLogin(data.access_token, data.user);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients and textures */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] top-1/4 left-1/4 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/3 blur-[80px] bottom-1/4 right-1/4 pointer-events-none" />
      <div className="grid-pattern text-gray-500 absolute inset-0 -z-10" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <motion.h1
            layout="position"
            className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent"
          >
            LegacyLift
          </motion.h1>
          <motion.p
            layout="position"
            className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold"
          >
            Automated Code Modernization
          </motion.p>
        </div>

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-lg backdrop-blur-md bg-opacity-95 dark:bg-opacity-90"
        >
          <div className="flex gap-1 mb-6 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1 relative z-10">
            {(["login", "signup"] as const).map((tab) => {
              const isActive = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMode(tab);
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg relative transition-colors ${
                    isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="authTabIndicator"
                      className="absolute inset-0 bg-white dark:bg-gray-700 shadow-sm rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab === "login" ? "Login" : "Sign Up"}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all dark:text-white"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all dark:text-white"
                    placeholder="Min 6 characters"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all mt-4 ${
                loading
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-wait shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
              }`}
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </motion.button>
          </form>

          {/* Pricing plans */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 text-center uppercase tracking-wider">
              Usage Tiers
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Free</p>
                  <p className="text-[10px] text-gray-500">5 conversions / day</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">$0</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Pro</p>
                  <p className="text-[10px] text-gray-500">100 conversions / day</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">$9.99/mo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Enterprise</p>
                  <p className="text-[10px] text-gray-500">10,000 conversions / day</p>
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">Custom</span>
              </div>
            </div>
          </div>
        </motion.div>

        <button
          onClick={onSkip}
          className="block mx-auto mt-6 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-medium"
        >
          Continue without account (limited to 5/day)
        </button>
      </div>
    </div>
  );
}
