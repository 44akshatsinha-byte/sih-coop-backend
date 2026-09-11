import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await authApi.register(form);
      loginWithToken(res.token, res.user);
      const role = res.user?.role;
      navigate(role === "worker" ? "/profile" : role === "admin" ? "/admin/forecast" : "/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("auth.register")}</h1>
        <LanguageSwitcher />
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
        <label className="block text-sm">
          {t("auth.name")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block text-sm">
          {t("auth.email")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required />
        </label>
        <label className="block text-sm">
          {t("auth.password")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required minLength={6} />
        </label>
        <fieldset className="text-sm">
          <legend>{t("auth.role")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {["customer", "worker", "admin"].map((role) => (
              <label key={role} className="flex min-h-10 items-center gap-2 rounded-card border border-[#cfc8b8] bg-page px-3">
                <input type="radio" name="role" checked={form.role === role} onChange={() => setForm({ ...form, role })} />
                {t(`auth.${role}`)}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <button className="min-h-11 w-full rounded-card bg-forest text-[#F3EFE6]">{t("auth.submitRegister")}</button>
      </form>
      <p className="mt-4 text-sm">
        {t("auth.haveAccount")}{" "}
        <Link className="underline" to="/login">{t("auth.login")}</Link>
      </p>
    </div>
  );
}
