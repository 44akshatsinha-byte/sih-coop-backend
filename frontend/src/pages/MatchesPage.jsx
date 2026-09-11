import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gigsApi, matchApi } from "../api/client.js";

function whyLine(breakdown) {
  if (!breakdown) return "";
  const notes = [
    breakdown.skill?.note,
    breakdown.distance?.note,
    breakdown.rating?.note,
    breakdown.availability?.note,
    breakdown.urgencyBonus?.note
  ].filter(Boolean);
  return notes.slice(0, 2).join(" · ");
}

export default function MatchesPage() {
  const { t } = useTranslation();
  const loc = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [gig, setGig] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [acceptingProposalId, setAcceptingProposalId] = useState(null);
  const [algorithm, setAlgorithm] = useState("hybrid");
  const [autoDispatching, setAutoDispatching] = useState(false);

  const gigId = loc.state?.gigId || sessionStorage.getItem("lastGigId");

  async function loadData(algo = algorithm) {
    if (!gigId) return;
    setError("");
    try {
      const gigRes = await gigsApi.get(gigId);
      setGig(gigRes.data);
      setProposals(gigRes.data?.proposals || []);

      const body = {
        gigId,
        latitude: loc.state?.latitude,
        longitude: loc.state?.longitude,
        category: loc.state?.category,
        urgency: loc.state?.urgency,
        limit: 5,
        mode: algo
      };
      const matchRes = await matchApi.rank(body);
      setRows(matchRes.data || []);
      if (matchRes.proposals && matchRes.proposals.length > 0) {
        setProposals(matchRes.proposals);
      }
    } catch (e) {
      setError(e.message || "Failed to load matches");
    }
  }

  function handleAlgorithmChange(newAlgo) {
    setAlgorithm(newAlgo);
    loadData(newAlgo);
  }

  async function handleAutoDispatch() {
    if (!gigId) return;
    setAutoDispatching(true);
    setError("");
    try {
      await gigsApi.autoDispatch(gigId, algorithm);
      navigate(`/gigs/${gigId}`);
    } catch (e) {
      setError(e.message || "Auto-dispatch failed");
    } finally {
      setAutoDispatching(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [gigId, loc.state]);

  async function book(workerId) {
    setBooking(true);
    setError("");
    try {
      await gigsApi.assign(gigId, workerId);
      navigate(`/gigs/${gigId}`);
    } catch (e) {
      setError(e.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function handleAcceptProposal(proposalId) {
    setAcceptingProposalId(proposalId);
    setError("");
    try {
      await gigsApi.acceptProposal(gigId, proposalId);
      navigate(`/gigs/${gigId}`);
    } catch (e) {
      setError(e.message || "Failed to accept proposal");
    } finally {
      setAcceptingProposalId(null);
    }
  }

  if (!gigId) {
    return (
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-8 text-center space-y-3">
        <div className="text-3xl">🔍</div>
        <p className="font-semibold text-teal-ink">{t("gig.noMatches")}</p>
        <p className="text-xs text-slate-muted">Please create a job request first to view AI-ranked candidates.</p>
        <button onClick={() => navigate("/")} className="rounded-card bg-forest px-4 py-2 text-xs font-bold text-white shadow-sm">
          Return to Home
        </button>
      </div>
    );
  }

  const isEmergency = gig?.urgency === "emergency";
  const pendingProposals = proposals.filter((p) => p.status === "pending" || !p.status);

  return (
    <div className="space-y-6">
      {/* ── Gig Header Summary with Graphics ── */}
      {gig && (
        <div
          className={`relative overflow-hidden rounded-panel border p-5 md:p-6 transition-all shadow-md ${
            isEmergency
              ? "border-red-400 bg-gradient-to-br from-red-50 via-rose-50 to-amber-50 ring-1 ring-red-300"
              : "hero-gradient text-white"
          }`}
        >
          {/* Floating subtle orbs */}
          <div className="orb h-36 w-36 bg-white/10 top-[-20px] right-[-10px]" />
          <div className="orb h-24 w-24 bg-emerald-300/10 bottom-[-10px] left-12" />

          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={`text-xl md:text-2xl font-black ${isEmergency ? "text-red-950" : "text-white"}`}>
                    {gig.title}
                  </h1>
                  {isEmergency && (
                    <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-0.5 text-xs font-black text-white shadow-sm animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                      🚨 EMERGENCY RUSH
                    </span>
                  )}
                </div>
                <p className={`text-xs md:text-sm line-clamp-2 ${isEmergency ? "text-red-900/80" : "text-white/80"}`}>
                  {gig.description}
                </p>
              </div>

              <div className={`text-right shrink-0 ${isEmergency ? "text-red-950" : "text-white"}`}>
                <div className="text-xl font-black">₹{gig.amount}</div>
                <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isEmergency ? "text-red-800" : "text-emerald-200"}`}>
                  Total Budget
                </span>
                <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  isEmergency ? "bg-red-200 text-red-900" : "bg-white/20 text-white backdrop-blur-xs"
                }`}>
                  ● {gig.status}
                </span>
              </div>
            </div>

            {/* Quick Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10 text-xs">
              <span className={`rounded-full px-2.5 py-0.5 font-semibold capitalize flex items-center gap-1 ${
                isEmergency ? "bg-red-100 text-red-900" : "bg-white/15 text-white"
              }`}>
                🏷️ Trade: {gig.category}
              </span>
              {gig.location && (
                <span className={`rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 truncate max-w-sm ${
                  isEmergency ? "bg-red-100 text-red-900" : "bg-white/15 text-white/90"
                }`}>
                  📍 {gig.location}
                </span>
              )}
              {isEmergency && (
                <span className="rounded-full bg-red-600 text-white px-2.5 py-0.5 font-bold text-[11px]">
                  ⚡ Priority Dispatch Active
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="animate-bounce-in flex items-center gap-2 rounded-card border border-red-300 bg-red-50 p-3.5 text-sm text-red-900 font-semibold shadow-xs">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── SECTION 1: WORKER PROPOSALS & CUSTOM PAY REQUESTS ── */}
      {pendingProposals.length > 0 && (
        <div className="space-y-3 rounded-panel border-2 border-purple-400 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-purple-50/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs font-bold text-lg animate-float">
                💼
              </div>
              <div>
                <h2 className="text-sm font-black text-purple-950 uppercase tracking-wide">
                  Custom Pay Requests & Proposals ({pendingProposals.length})
                </h2>
                <p className="text-xs text-purple-900/80">
                  Master artisans and certified technicians have submitted tailored pricing & equipment plans.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {pendingProposals.map((p) => {
              const worker = p.worker || {};
              const eqCost = p.equipmentCost || 0;
              const baseReq = p.requestedAmount || 0;
              const emFee = gig?.emergencyFee || 0;
              const matCost = gig?.materialCost || 0;
              const totalProposed = baseReq + emFee + matCost + eqCost;

              return (
                <article
                  key={p._id}
                  className="card-hover glow-border-purple rounded-card border border-purple-200 bg-white p-4 shadow-sm space-y-3 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {worker.avatar ? (
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="h-14 w-14 shrink-0 rounded-full object-cover border-2 border-purple-400 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-900 font-black text-lg">
                          {(worker.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-teal-ink">{worker.name}</h3>
                          {worker.isVerified && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                              ✓ Verified Specialist
                            </span>
                          )}
                        </div>

                        {/* Experience and Rating */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-forest bg-[#d7e3dc] px-2.5 py-0.5 rounded-full">
                            🏆 {worker.completedJobs || 0} Gigs Done
                          </span>
                          <span className="font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            ⭐ {worker.rating || 0}/5 ({worker.ratingCount || 0} reviews)
                          </span>
                        </div>

                        {worker.skills && worker.skills.length > 0 && (
                          <p className="text-xs text-slate-muted">
                            🛠️ {worker.skills.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Proposed Pricing Card */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-purple-900/70 uppercase tracking-wider block">
                        Proposed Total
                      </span>
                      <div className="text-xl font-black text-purple-950">
                        ₹{totalProposed}
                      </div>
                      <span className="text-[11px] text-slate-muted block">
                        Base: ₹{baseReq} {eqCost > 0 ? `+ Tools: ₹${eqCost}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Worker Note & Rationale */}
                  {p.note && (
                    <div className="rounded-card bg-purple-50/90 p-3 text-xs text-purple-950 border border-purple-100/80 leading-relaxed">
                      <span className="font-bold">💬 Worker's Note: </span>
                      <span className="italic">"{p.note}"</span>
                    </div>
                  )}

                  {/* Equipment requirement */}
                  {eqCost > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-950 bg-blue-50 border border-blue-200 p-2.5 rounded-card">
                      <span>🛠️ <strong>Equipment / Tool Rental:</strong> {p.equipmentDetails || "Specialized Tools"}</span>
                      <span className="ml-auto font-black text-blue-900">+₹{eqCost}</span>
                    </div>
                  )}

                  {/* Accept Proposal Button */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-100">
                    <button
                      disabled={acceptingProposalId === p._id || booking}
                      onClick={() => handleAcceptProposal(p._id)}
                      className="btn-press min-h-10 rounded-card bg-gradient-to-r from-purple-700 to-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-purple-800 hover:to-indigo-800 transition-all"
                    >
                      {acceptingProposalId === p._id ? "Booking..." : `✓ Accept Rate & Book ${worker.name?.split(" ")[0] || "Worker"}`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 2: AI SMART DISPATCH & POLICY ENGINE ── */}
      <div className="rounded-panel border-2 border-forest/30 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-sm md:text-base font-black text-teal-ink uppercase tracking-wide">
                AI Smart Dispatch & Policy Engine
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
              Choose how AI ranks nearby workers, or use 1-click Auto-Dispatch to immediately assign the optimal professional.
            </p>
          </div>

          <button
            disabled={autoDispatching || booking || !rows.length}
            onClick={handleAutoDispatch}
            className="btn-glow btn-press min-h-11 inline-flex items-center gap-2 rounded-card bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 text-xs font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-800 transition-all"
            title="Automatically assign the top-ranked candidate based on the active AI policy"
          >
            <span>⚡ {autoDispatching ? "Auto-Dispatching..." : "1-Click Auto-Dispatch Best Match"}</span>
          </button>
        </div>

        {/* Algorithm Selection Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {[
            { id: "hybrid", label: "🏛️ Smart Consensus", badge: "Recommended", desc: "Balanced blend of distance, rating, skill, & equity" },
            { id: "equity", label: "⚖️ Fair Income Equity", badge: "Anti-Monopoly", desc: "Prioritizes newer & under-allocated artisans" },
            { id: "topsis", label: "📊 TOPSIS Precision", badge: "Pareto Optimal", desc: "Multi-criteria geometric vector closeness" },
            { id: "proximity", label: "📍 Closest Proximity", badge: "Fastest Response", desc: "Orders purely by nearest GPS distance" }
          ].map((algo) => (
            <button
              key={algo.id}
              onClick={() => handleAlgorithmChange(algo.id)}
              className={`rounded-card p-3 text-xs font-semibold text-left transition-all border ${
                algorithm === algo.id
                  ? "bg-forest text-white border-forest shadow-md ring-2 ring-forest/30"
                  : "bg-white text-slate-700 border-[#cfc8b8] hover:bg-[#eee9dd] card-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{algo.label}</span>
                {algo.badge && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                    algorithm === algo.id ? "bg-white/20 text-white" : "bg-forest/10 text-forest"
                  }`}>
                    {algo.badge}
                  </span>
                )}
              </div>
              <div className={`text-[10px] mt-1 leading-tight ${algorithm === algo.id ? "text-white/80" : "text-slate-500"}`}>
                {algo.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: MATCHED WORKERS QUEUE ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-teal-ink">
            {t("nav.matches")} & Ranked Candidates ({rows.length})
          </h2>
          <span className="text-xs text-slate-muted font-medium">
            Active Policy: <strong className="text-teal-ink uppercase">{algorithm}</strong>
          </span>
        </div>

        {!rows.length && (
          <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-8 text-center space-y-2">
            <div className="text-3xl">👥</div>
            <p className="font-semibold text-teal-ink">{t("gig.noMatches")}</p>
            <p className="text-xs text-slate-muted">No eligible workers found in your immediate perimeter.</p>
          </div>
        )}

        {rows.map((row, index) => {
          const isTopMatch = index === 0;
          const matchPercent = row.score ? Math.round(row.score) : 90 - index * 6;

          return (
            <article
              key={row.workerId || row.rank || index}
              className={`card-hover rounded-panel border p-5 space-y-3.5 transition-all ${
                isTopMatch
                  ? "glow-border border-emerald-400 bg-white shadow-md ring-1 ring-emerald-300"
                  : "border-[#d9d2c3] bg-[#eee9dd] hover:border-[#cfc8b8]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  {row.avatar ? (
                    <img
                      src={row.avatar}
                      alt={row.name}
                      className={`h-16 w-16 shrink-0 rounded-full object-cover border-2 shadow-xs ${
                        isTopMatch ? "border-emerald-500" : "border-[#cfc8b8]"
                      }`}
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#d7e3dc] text-forest font-black text-xl">
                      {(row.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-teal-ink">{row.name}</h3>
                      {row.isVerified && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          ✓ {t("profile.verified")}
                        </span>
                      )}
                      {isTopMatch && (
                        <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide animate-pulse">
                          ★ #1 Recommended
                        </span>
                      )}
                    </div>

                    {/* Track record & Experience */}
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                      <span className="font-bold text-forest bg-[#d7e3dc] px-2.5 py-0.5 rounded-full">
                        🏆 {row.completedJobs || 0} Completed Gigs
                      </span>
                      <span className="font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        ⭐ {row.rating || 0}/5 ({row.ratingCount || 0} reviews)
                      </span>
                      <span className="text-slate-muted font-medium">
                        📍 {row.distanceKm != null ? `${Number(row.distanceKm).toFixed(1)} ${t("gig.km")}` : ""}
                      </span>
                    </div>

                    {row.skills && row.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {row.skills.map((s, idx) => (
                          <span key={idx} className="rounded-full bg-white border border-[#cfc8b8] px-2.5 py-0.5 text-[11px] text-teal-ink font-medium capitalize">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Government Badges */}
                    {row.governmentBadges && row.governmentBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {row.governmentBadges.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              badge.color === "emerald"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : badge.color === "amber"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : badge.color === "purple"
                                ? "bg-purple-50 text-purple-900 border-purple-300"
                                : "bg-blue-50 text-blue-900 border-blue-300"
                            }`}
                          >
                            ★ {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Score Radial / Progress Meter & Book */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-right">
                      <div className="text-lg font-black text-forest">{matchPercent}%</div>
                      <span className="text-[10px] text-slate-muted uppercase font-bold tracking-wider">
                        Match Score
                      </span>
                    </div>
                    {/* Mini visual circular indicator */}
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      <span>{matchPercent}%</span>
                    </div>
                  </div>

                  <div className="text-base font-bold text-forest">
                    ₹{gig ? gig.amount : "Standard"}
                  </div>
                  <span className="text-[10px] text-slate-muted block">standard government rate</span>

                  <button
                    disabled={booking || Boolean(acceptingProposalId)}
                    onClick={() => book(row.workerId)}
                    className="btn-press mt-2 min-h-10 rounded-card bg-forest px-5 text-xs font-bold text-[#F3EFE6] shadow-md hover:bg-[#234d3b] transition-all"
                  >
                    {booking ? "Booking..." : `${t("gig.book")} Worker`}
                  </button>
                </div>
              </div>

              {/* Multi-criteria Breakdown Progress Bar */}
              <div className="rounded-card bg-white/70 p-2.5 border border-[#cfc8b8]/70 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[11px] text-teal-ink font-semibold">
                  <span>⚖️ Policy Metric: <strong>{row.algorithmNote || whyLine(row.breakdown) || "Multi-criteria Pareto optimal fit"}</strong></span>
                  <span className="text-forest font-bold">{matchPercent}% Overall Alignment</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, matchPercent))}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

