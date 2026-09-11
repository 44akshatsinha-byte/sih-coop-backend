import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

const STATS = [
  { icon: "👷", label: "Verified Workers", value: "12,400+" },
  { icon: "✅", label: "Jobs Done", value: "85,000+" },
  { icon: "⭐", label: "Avg Rating", value: "4.8 / 5" },
  { icon: "🏛️", label: "Districts Covered", value: "340+" }
];

export default function LoginPage() {
  const { t } = useTranslation();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      loginWithToken(res.token, res.user);
      const role = res.user?.role;
      navigate(role === "worker" ? "/jobs" : role === "admin" ? "/admin/forecast" : "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Left hero panel ── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden hero-gradient p-10">
        {/* Decorative orbs */}
        <div className="orb h-64 w-64 bg-white top-[-40px] left-[-40px]" />
        <div className="orb h-48 w-48 bg-emerald-300 bottom-[60px] right-[-20px]" style={{ animationDelay: "3s" }} />
        <div className="orb h-32 w-32 bg-teal-400 top-[40%] left-[40%]" style={{ animationDelay: "1.5s" }} />

        {/* Top */}
        <div className="relative z-10 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg animate-float">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{t("app.name")}</p>
              <p className="text-[11px] text-white/60">Government Cooperative Platform</p>
            </div>
          </div>
        </div>

        {/* Center text */}
        <div className="relative z-10 space-y-4 animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs text-white/80 border border-white/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            SIH 2024 · CSR-2026 Compliant
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Fair Work.<br />
            Fair Pay.<br />
            <span className="text-emerald-300">For Everyone.</span>
          </h1>
          <p className="text-white/70 leading-relaxed text-sm max-w-xs">
            Empowering India's blue-collar workforce through AI-powered cooperative matching and transparent government-rate pricing.
          </p>

          {/* Algorithm badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["TOPSIS AI", "Equity Engine", "NLP Pricing", "Auto-Dispatch"].map((badge) => (
              <span key={badge} className="badge-pulse rounded-full bg-white/15 border border-white/25 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                ✦ {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-2 gap-3 animate-fade-in-slow">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`card-hover glass rounded-card p-3 stagger-${i + 1}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-extrabold text-white">{s.value}</div>
              <div className="text-[10px] text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex flex-1 flex-col justify-center bg-page px-6 py-10 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-start justify-between gap-3 md:hidden animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl hero-gradient shadow-md animate-float">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-teal-ink">{t("app.name")}</p>
                <p className="text-[10px] text-slate-muted">{t("app.tagline")}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="animate-slide-up space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-teal-ink">
                Welcome back 👋
              </h2>
              <p className="mt-1 text-sm text-slate-muted">Sign in to access the cooperative platform</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <label className="block text-sm font-medium text-teal-ink">
                {t("auth.email")}
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg className="h-4 w-4 text-slate-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    className="glow-border min-h-11 w-full rounded-card border border-[#cfc8b8] bg-white pl-10 pr-3 transition-all focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="worker@coop.com"
                    required
                  />
                </div>
              </label>

              {/* Password */}
              <label className="block text-sm font-medium text-teal-ink">
                {t("auth.password")}
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg className="h-4 w-4 text-slate-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    className="glow-border min-h-11 w-full rounded-card border border-[#cfc8b8] bg-white pl-10 pr-10 transition-all focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-muted hover:text-forest transition-colors"
                  >
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="animate-bounce-in flex items-center gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                className="btn-press relative min-h-12 w-full overflow-hidden rounded-card font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-70"
                style={{
                  background: loading
                    ? "#5a9e82"
                    : "linear-gradient(135deg, #2C5F4A 0%, #3a7a5f 100%)"
                }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="ml-1">Signing in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🔐</span>
                    <span>{t("auth.submitLogin")}</span>
                  </span>
                )}
              </button>
            </form>

            {/* Quick demo accounts */}
            <div className="rounded-card border border-[#d9d2c3] bg-[#eee9dd] p-3 text-xs space-y-2">
              <p className="font-semibold text-forest">⚡ Quick Demo Accounts</p>
              <div className="space-y-1 text-slate-muted">
                <p>👷 <strong>Worker:</strong> ramesh.kumar@coop.com / Password1234</p>
                <p>🏠 <strong>Customer:</strong> Register a new account at sign-up</p>
              </div>
            </div>

            <p className="text-center text-sm text-slate-muted">
              {t("auth.needAccount")}{" "}
              <Link className="font-semibold text-forest underline hover:no-underline" to="/register">
                {t("auth.register")}
              </Link>
            </p>
          </div>

          {/* Hidden on desktop since it's in the left panel */}
          <div className="mt-8 hidden md:flex items-center justify-end">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
