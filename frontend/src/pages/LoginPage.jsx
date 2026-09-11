import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function LoginPage() {
  const { t } = useTranslation();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await authApi.login({ email, password });
      loginWithToken(res.token, res.user);
      const role = res.user?.role;
      navigate(role === "worker" ? "/jobs" : role === "admin" ? "/admin/forecast" : "/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("auth.login")}</h1>
          <p className="text-sm text-slate-muted">{t("app.tagline")}</p>
        </div>
        <LanguageSwitcher />
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
        <label className="block text-sm">
          {t("auth.email")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label className="block text-sm">
          {t("auth.password")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <button className="min-h-11 w-full rounded-card bg-forest text-[#F3EFE6]">{t("auth.submitLogin")}</button>
      </form>
      <p className="mt-4 text-sm">
        {t("auth.needAccount")}{" "}
        <Link className="underline" to="/register">{t("auth.register")}</Link>
      </p>
    </div>
  );
}
