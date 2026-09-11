import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
      <h1 className="text-xl font-semibold">{t("nav.account")}</h1>
      <p>{user?.name}</p>
      <p className="text-sm text-slate-muted">{user?.email} · {user?.role}</p>
      <button onClick={logout} className="min-h-11 rounded-card border border-[#cfc8b8] px-4">
        {t("auth.logout")}
      </button>
    </div>
  );
}
