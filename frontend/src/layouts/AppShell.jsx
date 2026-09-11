import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

const NAV = {
  customer: [
    { to: "/", key: "nav.home", icon: "🏠" },
    { to: "/matches", key: "nav.matches", icon: "🔍" },
    { to: "/account", key: "nav.account", icon: "👤" }
  ],
  worker: [
    { to: "/jobs", key: "nav.jobs", icon: "💼" },
    { to: "/profile", key: "nav.profile", icon: "🪪" },
    { to: "/account", key: "nav.account", icon: "👤" }
  ],
  admin: [
    { to: "/admin/forecast", key: "nav.forecast", icon: "📊" },
    { to: "/admin/queue", key: "nav.queue", icon: "📋" },
    { to: "/admin/flags", key: "nav.flags", icon: "🚩" }
  ]
};

const ROLE_COLORS = {
  customer: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  worker:   { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  admin:    { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" }
};

export default function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || NAV.customer;
  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.customer;

  return (
    <div className="min-h-screen bg-page text-teal-ink">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 animate-slide-down">
        <div className="hero-gradient px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            {/* Logo & App name */}
            <div className="flex items-center gap-3">
              <div className="animate-float relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-inner backdrop-blur-sm">
                {/* Cooperative icon */}
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-white tracking-wide leading-none">
                  {t("app.name")}
                </p>
                <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                  {t("app.tagline")}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                Live
              </div>

              {/* User badge */}
              {user && (
                <div className="animate-fade-in hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold uppercase">
                    {(user.name || "?").slice(0, 1)}
                  </div>
                  <span className="font-medium max-w-[100px] truncate">{user.name}</span>
                  <span className={`rounded-full ${roleStyle.bg} ${roleStyle.text} px-1.5 py-0.5 text-[9px] font-bold uppercase`}>
                    {user.role}
                  </span>
                </div>
              )}

              <LanguageSwitcher />

              {user && (
                <button
                  type="button"
                  onClick={logout}
                  title={t("auth.logout")}
                  aria-label={t("auth.logout")}
                  className="btn-press flex min-h-9 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500/30 hover:border-red-300/40 transition-all duration-200"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">{t("auth.logout")}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-header strip with government branding */}
        <div className="border-b border-[#d9d2c3] bg-[#eee9dd]/90 backdrop-blur-sm px-4 py-1.5">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-muted">
              <span className="font-semibold text-forest">🏛️ Govt. Cooperative Platform</span>
              <span>·</span>
              <span>SIH 2024</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">CSR-2026 Compliant</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TOPSIS · Equity · AI Matching</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="mx-auto flex max-w-5xl gap-4 px-4 py-4">
        {/* Side nav */}
        <nav className="hidden w-48 shrink-0 md:block">
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={item.to} className={`animate-slide-up stagger-${i + 1}`}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `card-hover flex min-h-11 flex-wrap items-center gap-2.5 rounded-card px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#2C5F4A] to-[#3a7a5f] text-white shadow-md"
                        : "hover:bg-[#e0ddd4] hover:text-forest"
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Side panel stats */}
          <div className="mt-4 animate-fade-in-slow rounded-card border border-[#d9d2c3] bg-[#eee9dd] p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-muted">Platform Stats</p>
            {[
              { label: "Workers Active", val: "1,240+", icon: "👷" },
              { label: "Jobs Completed", val: "8,500+", icon: "✅" },
              { label: "Avg Rating", val: "4.8 ★", icon: "⭐" }
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-slate-muted">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </span>
                <span className="text-[11px] font-bold text-forest">{s.val}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-4 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom mobile nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#d9d2c3] bg-[#eee9dd]/95 backdrop-blur-md md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <ul className="mx-auto flex max-w-5xl">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center text-[10px] font-medium transition-all duration-200 ${
                    isActive ? "text-forest" : "text-slate-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`text-xl transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                      {item.icon}
                    </span>
                    <span>{t(item.key)}</span>
                    {isActive && (
                      <span className="absolute bottom-1 h-0.5 w-8 rounded-full bg-forest animate-scale-in" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
