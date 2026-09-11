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
  const { user } = useAuth();
  const items = NAV[user?.role] || NAV.customer;

  return (
    <div className="min-h-screen bg-page text-teal-ink">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d2c3] bg-[#eee9dd] px-4 py-3">
        <div>
          <p className="text-base font-semibold">{t("app.name")}</p>
          <p className="text-xs text-slate-muted">{t("app.tagline")}</p>
        </div>
        <LanguageSwitcher />
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
