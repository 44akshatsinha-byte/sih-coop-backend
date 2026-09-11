import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi } from "../api/client.js";

export default function AdminQueue() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);

  async function load() {
    const r = await adminApi.queue();
    setRows(r.data || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t("admin.queueTitle")}</h1>
      {!rows.length && <p className="text-sm text-slate-muted">{t("admin.emptyQueue")}</p>}
      {rows.map((w) => (
        <article key={w._id} className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
          <div className="flex items-start gap-3">
            {w.avatar ? (
              <img src={w.avatar} alt={w.name} className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#cfc8b8]" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d7e3dc] text-forest font-semibold">
                {(w.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{w.name}</p>
              <p className="text-xs text-slate-muted">{w.email} · {w.phone || "No phone"} · {(w.skills || []).join(", ") || "No skills listed"}</p>
              {w.verificationNote && <p className="text-xs text-teal-ink mt-0.5">{w.verificationNote}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="min-h-10 rounded-card bg-forest px-4 text-xs font-medium text-[#F3EFE6]" onClick={() => adminApi.verify(w._id, { status: "verified" }).then(load)}>
              {t("admin.verify")}
            </button>
            <button className="min-h-10 rounded-card border border-[#cfc8b8] px-4 text-xs font-medium" onClick={() => adminApi.verify(w._id, { status: "rejected" }).then(load)}>
              {t("admin.reject")}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
