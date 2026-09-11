import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

const NAV = {
  customer: [
    { to: "/", key: "nav.home" },
    { to: "/matches", key: "nav.matches" },
    { to: "/account", key: "nav.account" }
  ],
  worker: [
    { to: "/jobs", key: "nav.jobs" },
    { to: "/profile", key: "nav.profile" },
    { to: "/account", key: "nav.account" }
  ],
  admin: [
    { to: "/admin/forecast", key: "nav.forecast" },
    { to: "/admin/queue", key: "nav.queue" },
    { to: "/admin/flags", key: "nav.flags" }
  ]
};

export default function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || NAV.customer;

  return (
    <div className="min-h-screen bg-page text-teal-ink">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d2c3] bg-[#eee9dd] px-4 py-3">
        <div>
          <p className="text-base font-semibold">{t("app.name")}</p>
          <p className="text-xs text-slate-muted">{t("app.tagline")}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 rounded-card bg-[#e2dcce] px-2.5 py-1 text-xs">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full object-cover border border-[#cfc8b8]" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-[11px] text-[#F3EFE6] font-semibold">
                  {(user.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-medium max-w-[120px] truncate">{user.name}</span>
              <span className="rounded bg-[#d7e3dc] px-1.5 py-0.5 text-[10px] text-forest font-semibold uppercase">
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
              className="flex min-h-9 items-center gap-1.5 rounded-card border border-[#cfc8b8] bg-[#F3EFE6] px-3 py-1.5 text-xs font-medium text-[#8b3a3a] hover:bg-[#ebdada] hover:border-[#b88c8c] transition-colors shadow-sm"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t("auth.logout")}</span>
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-4 px-4 py-4">
        <nav className="hidden w-48 shrink-0 md:block">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex min-h-11 flex-wrap items-center rounded-card px-3 py-2 text-sm ${
                      isActive ? "bg-[#d7e3dc] text-forest" : "hover:bg-[#ebe6da]"
                    }`
                  }
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#d9d2c3] bg-[#eee9dd] md:hidden">
        <ul className="mx-auto flex max-w-5xl">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex min-h-14 flex-wrap items-center justify-center px-2 py-2 text-center text-xs ${
                    isActive ? "text-forest" : "text-slate-muted"
                  }`
                }
              >
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
