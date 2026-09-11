import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gigsApi } from "../api/client.js";

const CATEGORIES = [
  { id: "all", label: "All Trades", icon: "🌐" },
  { id: "cleaning", label: "Cleaning", icon: "🧹" },
  { id: "electrician", label: "Electrician", icon: "⚡" },
  { id: "plumbing", label: "Plumbing", icon: "🔧" },
  { id: "carpentry", label: "Carpentry", icon: "🔨" },
  { id: "painting", label: "Painting", icon: "🎨" },
  { id: "delivery", label: "Delivery", icon: "🚚" },
  { id: "appliance", label: "Appliances", icon: "🔌" },
  { id: "masonry", label: "Masonry", icon: "🧱" },
  { id: "gardening", label: "Gardening", icon: "🌱" },
  { id: "other", label: "Other", icon: "✨" }
];

export default function WorkerJobs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  // Filter by category
  const filteredGigs = selectedCategory === "all"
    ? rawGigs
    : rawGigs.filter((g) => (g.category || "").toLowerCase() === selectedCategory.toLowerCase());

  // Pin Emergency jobs to the very top in all tabs, then sort by newest
  const displayedGigs = [...filteredGigs].sort((a, b) => {
    const aEmergency = a.urgency === "emergency" ? 1 : 0;
    const bEmergency = b.urgency === "emergency" ? 1 : 0;
    if (aEmergency !== bEmergency) {
      return bEmergency - aEmergency;
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Calculate live statistics
  const emergencyCount = rawGigs.filter((g) => g.urgency === "emergency").length;
  const avgPayout = rawGigs.length > 0
    ? Math.round(rawGigs.reduce((acc, g) => acc + (g.amount || 0) * 0.85, 0) / rawGigs.length)
    : 0;
  const totalValue = rawGigs.reduce((acc, g) => acc + (g.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Top Worker Banner & Live Stats ── */}
      <div className="relative overflow-hidden rounded-panel hero-gradient p-5 md:p-6 text-white shadow-md">
        <div className="orb h-40 w-40 bg-white/10 top-[-20px] right-[-20px]" />
        <div className="orb h-24 w-24 bg-emerald-300/10 bottom-[-10px] left-10" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👷</span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">{t("nav.jobs")}</h1>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-xs">
                  Live Market
                </span>
              </div>
              <p className="text-xs md:text-sm text-white/80 mt-1">
                Browse fair-wage cooperative tasks with guaranteed 85% take-home pay and 100% material & equipment reimbursement.
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex rounded-card border border-white/25 bg-black/15 p-1 text-xs font-semibold backdrop-blur-sm">
              <button
                onClick={() => setTab("all")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  tab === "all" ? "bg-white text-forest shadow-md font-bold" : "text-white/80 hover:text-white"
                }`}
              >
                All Jobs ({rawGigs.length})
              </button>
              <button
                onClick={() => setTab("open")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  tab === "open" ? "bg-white text-forest shadow-md font-bold" : "text-white/80 hover:text-white"
                }`}
              >
                Available ({openGigs.length})
              </button>
              <button
                onClick={() => setTab("mine")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  tab === "mine" ? "bg-white text-forest shadow-md font-bold" : "text-white/80 hover:text-white"
                }`}
              >
                My Gigs ({myGigs.length})
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="rounded-card bg-white/10 backdrop-blur-xs border border-white/15 p-2.5 text-center">
              <div className="text-xs text-white/70">Available Tasks</div>
              <div className="text-lg font-black text-white">{openGigs.length}</div>
            </div>
            <div className="rounded-card bg-red-500/20 backdrop-blur-xs border border-red-300/30 p-2.5 text-center">
              <div className="text-xs text-red-200">Emergency Alerts</div>
              <div className="text-lg font-black text-red-100 flex items-center justify-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                {emergencyCount}
              </div>
            </div>
            <div className="rounded-card bg-white/10 backdrop-blur-xs border border-white/15 p-2.5 text-center">
              <div className="text-xs text-white/70">Avg Take-Home</div>
              <div className="text-lg font-black text-emerald-200">₹{avgPayout}</div>
            </div>
            <div className="rounded-card bg-white/10 backdrop-blur-xs border border-white/15 p-2.5 text-center">
              <div className="text-xs text-white/70">Co-op Welfare Pool</div>
              <div className="text-lg font-black text-amber-200">₹{Math.round(totalValue * 0.15)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? "border-forest bg-forest text-white shadow-xs"
                  : "border-[#cfc8b8] bg-[#e7e1d3] text-teal-ink hover:bg-[#ded6c4]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Loading and Empty States ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-5 h-28" />
          ))}
        </div>
      )}

      {!loading && !displayedGigs.length && (
        <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-8 text-center space-y-2">
          <div className="text-3xl">🔍</div>
          <p className="font-semibold text-teal-ink">No jobs found in this category</p>
          <p className="text-xs text-slate-muted">
            Try switching trade categories or check back shortly for newly posted customer tasks.
          </p>
          {selectedCategory !== "all" && (
            <button
              onClick={() => setSelectedCategory("all")}
              className="mt-2 rounded-card bg-forest px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            >
              Reset Category Filter
            </button>
          )}
        </div>
      )}

      {/* ── Job Cards List ── */}
      <div className="space-y-3.5">
        {displayedGigs.map((g, idx) => {
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
              className={`block rounded-panel border p-4 transition-all duration-200 card-hover ${
                isEmergency
                  ? "border-red-400 bg-red-50/95 hover:bg-red-100/90 shadow-sm ring-1 ring-red-300"
                  : "border-[#d9d2c3] bg-[#eee9dd] hover:bg-[#e6e0d2]"
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-teal-ink">{g.title}</span>
                    {isEmergency && (
                      <span className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-xs animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        🚨 EMERGENCY PRIORITY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-muted line-clamp-2 leading-relaxed">{g.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-forest">
                    ₹{workerTakeHome}
                    <span className="block text-[10px] font-semibold text-slate-muted uppercase tracking-wider">
                      Take-Home Payout
                    </span>
                  </div>
                  <span
                    className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      g.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : g.status === "accepted" || g.status === "in-progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    ● {g.status}
                  </span>
                </div>
              </div>

              {/* Cooperative Payout Visual Meter */}
              <div className="mt-3 rounded-card bg-white/60 p-2.5 border border-black/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-teal-ink">
                  <span>Cooperative Split (85% Labor + 100% Tools/Parts)</span>
                  <span className="text-forest font-bold">₹{workerTakeHome} / ₹{g.amount} total budget</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                    style={{ width: `${Math.min(100, Math.round((workerTakeHome / (g.amount || 1)) * 100))}%` }}
                    title="Worker Payout Share"
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.min(100, Math.round(((g.amount * 0.15) / (g.amount || 1)) * 100))}%` }}
                    title="Community Welfare Fund (15%)"
                  />
                </div>
              </div>

              {/* Highlights & Breakdown Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#d9d2c3]/60 pt-2.5 text-xs">
                <span className="capitalize font-semibold text-teal-ink bg-[#d7e3dc] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  🏷️ {g.category}
                </span>

                {isEmergency && emergencySurge > 0 && (
                  <span className="rounded-full bg-red-200 text-red-950 font-bold px-2.5 py-0.5 text-[11px] flex items-center gap-1">
                    ⚡ +₹{Math.round(emergencySurge * 0.85)} Rush Premium
                  </span>
                )}

                {matCost > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 font-medium flex items-center gap-1">
                    📦 Materials: ₹{matCost} (100% Reimbursed)
                  </span>
                )}

                {eqCost > 0 && (
                  <span className="rounded-full bg-blue-100 text-blue-900 px-2.5 py-0.5 font-medium flex items-center gap-1">
                    🛠️ Tools: ₹{eqCost} (100% Reimbursed)
                  </span>
                )}

                {proposalsCount > 0 && (
                  <span className="rounded-full bg-purple-100 text-purple-900 px-2.5 py-0.5 font-medium flex items-center gap-1">
                    💼 {proposalsCount} Custom {proposalsCount === 1 ? "Proposal" : "Proposals"}
                  </span>
                )}

                {g.location && (
                  <span className="text-slate-muted ml-auto truncate max-w-xs text-[11px] font-medium flex items-center gap-1">
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

