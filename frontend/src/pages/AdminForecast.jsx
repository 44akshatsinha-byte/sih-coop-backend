import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi } from "../api/client.js";
import ForecastChart from "../components/ForecastChart.jsx";

export default function AdminForecast() {
  const { t } = useTranslation();
  const [days, setDays] = useState(7);
  const [data, setData] = useState({ series: [], alerts: [] });

  useEffect(() => {
    adminApi.forecast(days).then(setData).catch(() => {});
  }, [days]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("admin.forecastTitle")}</h1>
      <div className="flex flex-wrap gap-2">
        <button className={`min-h-10 rounded-card px-3 ${days === 7 ? "bg-forest text-[#F3EFE6]" : "border border-[#cfc8b8]"}`} onClick={() => setDays(7)}>{t("admin.days7")}</button>
        <button className={`min-h-10 rounded-card px-3 ${days === 30 ? "bg-forest text-[#F3EFE6]" : "border border-[#cfc8b8]"}`} onClick={() => setDays(30)}>{t("admin.days30")}</button>
      </div>
      {data.alerts?.map((a, i) => (
        <div key={i} className="rounded-card border border-[#cfc8b8] bg-[#e7eee8] px-3 py-2 text-sm">
          <strong>{t("admin.shortage")}</strong> {a.message}
        </div>
      ))}
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-3">
        <ForecastChart series={data.series || []} />
      </div>
    </div>
  );
}
