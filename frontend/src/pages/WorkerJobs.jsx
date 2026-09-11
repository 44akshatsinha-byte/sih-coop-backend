import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gigsApi } from "../api/client.js";

export default function WorkerJobs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("all");
  const [myGigs, setMyGigs] = useState([]);
  const [openGigs, setOpenGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [mineRes, openRes] = await Promise.all([
        gigsApi.mine(),
        gigsApi.list("?status=pending")
      ]);
      setMyGigs(mineRes.data || []);
      setOpenGigs(openRes.data || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const rawGigs = tab === "mine" ? myGigs : tab === "open" ? openGigs : [...openGigs, ...myGigs.filter(m => !openGigs.some(o => o._id === m._id))];

  // Pin Emergency jobs to the very top in all tabs, then sort by newest
  const displayedGigs = [...rawGigs].sort((a, b) => {
    const aEmergency = a.urgency === "emergency" ? 1 : 0;
    const bEmergency = b.urgency === "emergency" ? 1 : 0;
    if (aEmergency !== bEmergency) {
      return bEmergency - aEmergency;
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("nav.jobs")}</h1>
        <div className="flex rounded-card border border-[#cfc8b8] bg-[#e7e1d3] p-1 text-xs font-medium">
          <button
            onClick={() => setTab("all")}
            className={`rounded px-3 py-1 transition-colors ${tab === "all" ? "bg-forest text-white shadow-sm" : "hover:text-forest"}`}
          >
            All Jobs
          </button>
          <button
            onClick={() => setTab("open")}
            className={`rounded px-3 py-1 transition-colors ${tab === "open" ? "bg-forest text-white shadow-sm" : "hover:text-forest"}`}
          >
            Available ({openGigs.length})
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`rounded px-3 py-1 transition-colors ${tab === "mine" ? "bg-forest text-white shadow-sm" : "hover:text-forest"}`}
          >
            My Jobs ({myGigs.length})
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-muted">{t("common.loading")}</p>}

      {!loading && !displayedGigs.length && (
        <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-6 text-center text-sm text-slate-muted">
          No jobs found in this tab.
        </div>
      )}

      <div className="space-y-3">
        {displayedGigs.map((g) => {
          const isEmergency = g.urgency === "emergency";
          const matCost = g.materialCost || 0;
          const eqCost = g.equipmentCost || 0;
          const directReimbursement = matCost + eqCost;
          const serviceAmt = Math.max(0, g.amount - directReimbursement);
          const workerTakeHome = Math.round(serviceAmt * 0.85 + directReimbursement);
          const emergencySurge = g.emergencyFee || (isEmergency ? Math.round(serviceAmt * 0.25) : 0);
          const proposalsCount = (g.proposals || []).length;

          return (
            <Link
              key={g._id}
              to={`/gigs/${g._id}`}
              className={`block rounded-panel border p-4 transition-all ${
                isEmergency
                  ? "border-red-400 bg-red-50/90 hover:bg-red-100/80 shadow-sm ring-1 ring-red-300"
                  : "border-[#d9d2c3] bg-[#eee9dd] hover:bg-[#e6e0d2]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base text-teal-ink">{g.title}</span>
                    {isEmergency && (
                      <span className="rounded-card bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs animate-pulse">
                        🚨 EMERGENCY PRIORITY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-muted line-clamp-2">{g.description}</p>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-forest">
                    ₹{workerTakeHome}{" "}
                    <span className="text-xs font-normal text-slate-muted">payout</span>
                  </div>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      g.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : g.status === "accepted" || g.status === "in-progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
              </div>

              {/* Highlights & Breakdown */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#d9d2c3]/60 pt-2.5 text-xs">
                <span className="capitalize font-medium text-teal-ink bg-[#d7e3dc] px-2 py-0.5 rounded">
                  {g.category}
                </span>

                {isEmergency && emergencySurge > 0 && (
                  <span className="rounded bg-red-200 text-red-950 font-bold px-2 py-0.5 text-[11px]">
                    ⚡ Includes +₹{Math.round(emergencySurge * 0.85)} Emergency Bonus
                  </span>
                )}

                {matCost > 0 && (
                  <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 font-medium">
                    📦 Materials: ₹{matCost} (100% reimbursed)
                  </span>
                )}

                {eqCost > 0 && (
                  <span className="rounded bg-blue-100 text-blue-900 px-2 py-0.5 font-medium">
                    🛠️ Tools: ₹{eqCost} (100% reimbursed)
                  </span>
                )}

                {proposalsCount > 0 && (
                  <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 font-medium">
                    💼 {proposalsCount} Worker {proposalsCount === 1 ? "Proposal" : "Proposals"}
                  </span>
                )}

                {g.location && (
                  <span className="text-slate-muted ml-auto truncate max-w-xs">
                    📍 {g.location}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
