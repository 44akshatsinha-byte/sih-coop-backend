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
    return <p className="text-sm text-slate-muted">{t("gig.noMatches")}</p>;
  }

  const isEmergency = gig?.urgency === "emergency";
  const pendingProposals = proposals.filter((p) => p.status === "pending" || !p.status);

  return (
    <div className="space-y-4">
      {/* Gig Header Summary */}
      {gig && (
        <div
          className={`rounded-panel border p-4 space-y-2 ${
            isEmergency
              ? "border-red-400 bg-red-50/90 text-red-950 shadow-sm"
              : "border-[#d9d2c3] bg-[#eee9dd]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-teal-ink">{gig.title}</h1>
                {isEmergency && (
                  <span className="rounded-card bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-xs animate-pulse">
                    🚨 EMERGENCY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-muted">
                Standard Budget: <span className="font-semibold text-teal-ink">₹{gig.amount}</span> · Category:{" "}
                <span className="capitalize font-medium text-forest">{gig.category}</span>
              </p>
            </div>
            <span className="rounded bg-[#d7e3dc] px-2.5 py-1 text-xs font-semibold text-forest uppercase">
              {gig.status}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-800 font-medium bg-red-100 p-3 rounded-card">{error}</p>}

      {/* SECTION 1: WORKER PROPOSALS & CUSTOM PAY REQUESTS */}
      {pendingProposals.length > 0 && (
        <div className="space-y-3 rounded-panel border-2 border-purple-400 bg-purple-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💼</span>
              <div>
                <h2 className="text-sm font-bold text-purple-950">
                  Custom Pay Requests & Bids ({pendingProposals.length})
                </h2>
                <p className="text-xs text-purple-900/80">
                  Skilled workers have submitted custom price proposals & equipment requirements for your task.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
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
                  className="rounded-card border border-purple-200 bg-white p-4 shadow-xs space-y-3 transition-all hover:border-purple-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {worker.avatar ? (
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="h-14 w-14 shrink-0 rounded-full object-cover border-2 border-purple-300 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-900 font-bold text-lg">
                          {(worker.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-teal-ink">{worker.name}</h3>
                          {worker.isVerified && (
                            <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[11px] font-semibold">
                              ✓ Verified Pro
                            </span>
                          )}
                        </div>

                        {/* Experience and Rating */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-forest bg-[#d7e3dc] px-2 py-0.5 rounded">
                            🏆 {worker.completedJobs || 0} Jobs Completed
                          </span>
                          <span className="font-medium text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
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
                    <div className="text-right sm:text-right">
                      <span className="text-xs text-slate-muted block">Proposed Total</span>
                      <div className="text-lg font-extrabold text-purple-900">
                        ₹{totalProposed}
                      </div>
                      <span className="text-[11px] text-slate-muted block">
                        Base: ₹{baseReq} {eqCost > 0 ? `+ Tools: ₹${eqCost}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Worker Note & Rationale */}
                  {p.note && (
                    <div className="rounded-card bg-purple-50 p-2.5 text-xs text-purple-950 border border-purple-100">
                      <span className="font-semibold">💬 Worker Experience & Note: </span>
                      <span className="italic">{p.note}</span>
                    </div>
                  )}

                  {/* Equipment requirement */}
                  {eqCost > 0 && (
                    <div className="flex items-center gap-2 text-xs text-blue-900 bg-blue-50 border border-blue-200 p-2 rounded-card">
                      <span>🛠️ <strong>Equipment Required:</strong> {p.equipmentDetails || "Specialized Tools"}</span>
                      <span className="ml-auto font-bold">+₹{eqCost}</span>
                    </div>
                  )}

                  {/* Accept Proposal Button */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      disabled={acceptingProposalId === p._id || booking}
                      onClick={() => handleAcceptProposal(p._id)}
                      className="min-h-10 rounded-card bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow hover:bg-purple-800 transition-colors"
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

      {/* SECTION 2: GOVERNMENT RECOMMENDATION & DISPATCH ENGINE */}
      <div className="rounded-panel border border-[#cfc8b8] bg-[#f8f5ee] p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <h2 className="text-sm font-bold text-teal-ink uppercase tracking-wide">
                Government Recommendation & Dispatch Engine
              </h2>
            </div>
            <p className="text-xs text-slate-muted">
              Live Policy Selector for Hackathon Demonstration: Compare how dispatch shifts between Pareto efficiency, affirmative income equity, and geodesic speed.
            </p>
          </div>

          <button
            disabled={autoDispatching || booking || !rows.length}
            onClick={handleAutoDispatch}
            className="min-h-10 inline-flex items-center gap-2 rounded-card bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-800 transition-colors"
            title="Automatically assign the top-ranked candidate based on the active government algorithm"
          >
            <span>⚡ {autoDispatching ? "Auto-Dispatching..." : "Autonomous Cooperative Dispatch"}</span>
          </button>
        </div>

        {/* Algorithm Selection Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#e2dcd0]">
          {[
            { id: "hybrid", label: "🏛️ Govt Consensus", desc: "TOPSIS 40% · Equity 30% · Proximity 30%" },
            { id: "equity", label: "⚖️ Fair Income Equity", desc: "Boosts under-served artisans & new workers" },
            { id: "topsis", label: "📊 TOPSIS Multi-Criteria", desc: "Pareto-optimal geometric vector closeness" },
            { id: "proximity", label: "📍 Proximity-First", desc: "Fastest response geodesic dispatch" }
          ].map((algo) => (
            <button
              key={algo.id}
              onClick={() => handleAlgorithmChange(algo.id)}
              className={`rounded-card p-2 text-xs font-semibold text-left transition-all border ${
                algorithm === algo.id
                  ? "bg-forest text-white border-forest shadow-xs ring-2 ring-forest/30"
                  : "bg-white text-slate-700 border-[#cfc8b8] hover:bg-[#eee9dd]"
              }`}
            >
              <div className="font-bold">{algo.label}</div>
              <div className={`text-[10px] ${algorithm === algo.id ? "text-white/80" : "text-slate-500"}`}>
                {algo.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: MATCHED WORKERS QUEUE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-teal-ink">
            {t("nav.matches")} & Ranked Candidates ({rows.length})
          </h2>
          <span className="text-xs text-slate-muted font-medium">
            Active Policy: <strong className="text-teal-ink uppercase">{algorithm}</strong>
          </span>
        </div>

        {!rows.length && (
          <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-6 text-center text-sm text-slate-muted">
            {t("gig.noMatches")}
          </div>
        )}

        {rows.map((row) => (
          <article
            key={row.workerId || row.rank}
            className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 space-y-3 hover:border-[#cfc8b8] transition-all"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {row.avatar ? (
                  <img
                    src={row.avatar}
                    alt={row.name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover border border-[#cfc8b8] shadow-xs"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d7e3dc] text-forest font-bold text-lg">
                    {(row.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base text-teal-ink">{row.name}</h3>
                    {row.isVerified && (
                      <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[11px] font-semibold">
                        ✓ {t("profile.verified")}
                      </span>
                    )}
                    <span className="rounded bg-forest/10 text-forest px-2 py-0.5 text-xs font-bold">
                      {row.score ? `${Math.round(row.score)}% Match` : `#${row.rank}`}
                    </span>
                  </div>

                  {/* Track record & Experience */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                    <span className="font-semibold text-forest bg-[#d7e3dc] px-2 py-0.5 rounded">
                      🏆 {row.completedJobs || 0} Successful Jobs
                    </span>
                    <span className="font-medium text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      ⭐ {row.rating || 0}/5 ({row.ratingCount || 0} reviews)
                    </span>
                    <span className="text-slate-muted">
                      📍 {row.distanceKm != null ? `${Number(row.distanceKm).toFixed(1)} ${t("gig.km")}` : ""}
                    </span>
                  </div>

                  {row.skills && row.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {row.skills.map((s, idx) => (
                        <span key={idx} className="rounded bg-page border border-[#cfc8b8] px-2 py-0.5 text-[11px] text-teal-ink capitalize">
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
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
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

                  {/* Algorithm / Policy Explainability Note */}
                  {row.algorithmNote && (
                    <div className="rounded-card bg-white/70 p-2 text-[11px] text-teal-ink border border-[#cfc8b8]">
                      ⚖️ <strong>Policy Metric:</strong> {row.algorithmNote}
                    </div>
                  )}

                  <p className="mt-1 text-xs text-teal-ink">
                    💡 <strong>{t("gig.why")}:</strong> {whyLine(row.breakdown)}
                  </p>
                </div>
              </div>

              {/* Standard Rate & Book */}
              <div className="text-right sm:text-right self-end sm:self-start">
                <div className="text-base font-bold text-forest">
                  ₹{gig ? gig.amount : "Standard"}
                </div>
                <span className="text-[11px] text-slate-muted block">standard rate</span>
                <button
                  disabled={booking || Boolean(acceptingProposalId)}
                  onClick={() => book(row.workerId)}
                  className="mt-2 min-h-10 rounded-card bg-forest px-5 text-xs font-bold text-[#F3EFE6] shadow hover:bg-[#234d3b] transition-colors"
                >
                  {booking ? "Booking..." : `${t("gig.book")} Worker`}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
