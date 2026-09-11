import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gigsApi } from "../api/client.js";

export default function WorkerJobs() {
  const { t } = useTranslation();
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    gigsApi.mine().then((r) => setGigs(r.data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t("nav.jobs")}</h1>
      {gigs.map((g) => (
        <Link key={g._id} to={`/gigs/${g._id}`} className="block rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
          <p className="font-medium">{g.title}</p>
          <p className="text-sm text-slate-muted">{g.status} · ₹{g.amount}</p>
        </Link>
      ))}
    </div>
  );
}
