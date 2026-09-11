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
          <p className="font-medium">{w.name}</p>
          <p className="text-xs text-slate-muted">{w.email} · {(w.skills || []).join(", ")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="min-h-10 rounded-card bg-forest px-3 text-[#F3EFE6]" onClick={() => adminApi.verify(w._id, { status: "verified" }).then(load)}>
              {t("admin.verify")}
            </button>
            <button className="min-h-10 rounded-card border border-[#cfc8b8] px-3" onClick={() => adminApi.verify(w._id, { status: "rejected" }).then(load)}>
              {t("admin.reject")}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
