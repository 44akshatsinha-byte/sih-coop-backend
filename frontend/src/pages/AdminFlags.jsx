import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi } from "../api/client.js";

export default function AdminFlags() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);

  async function load() {
    const r = await adminApi.flags();
    setRows(r.data || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t("admin.flagsTitle")}</h1>
      {!rows.length && <p className="text-sm text-slate-muted">{t("admin.emptyFlags")}</p>}
      {rows.map((g) => (
        <article key={g._id} className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
          <p className="font-medium">{g.title}</p>
          <p className="text-sm">{g.review?.rating}★ — {g.review?.text}</p>
          <p className="text-xs text-slate-muted">{(g.reviewFlag?.reasons || []).join(", ")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="min-h-10 rounded-card border border-[#cfc8b8] px-3" onClick={() => adminApi.flagAction(g._id, "dismiss").then(load)}>
              {t("admin.dismiss")}
            </button>
            <button className="min-h-10 rounded-card bg-forest px-3 text-[#F3EFE6]" onClick={() => adminApi.flagAction(g._id, "escalate").then(load)}>
              {t("admin.escalate")}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
