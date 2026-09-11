import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { gigsApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import GigStepper from "../components/GigStepper.jsx";
import PaymentSheet from "../components/PaymentSheet.jsx";

export default function GigDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [gig, setGig] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Material item inputs
  const [matName, setMatName] = useState("");
  const [matCost, setMatCost] = useState("");
  const [savingMat, setSavingMat] = useState(false);

  // Equipment item inputs
  const [eqName, setEqName] = useState("");
  const [eqCost, setEqCost] = useState("");
  const [savingEq, setSavingEq] = useState(false);

  // Worker custom pay proposal modal/form
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [propAmount, setPropAmount] = useState("");
  const [propNote, setPropNote] = useState("");
  const [propEqCost, setPropEqCost] = useState("");
  const [propEqDetails, setPropEqDetails] = useState("");
  const [submittingProp, setSubmittingProp] = useState(false);
  const [acceptingPropId, setAcceptingPropId] = useState(null);

  async function load() {
    const res = await gigsApi.get(id);
    setGig(res.data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);

  if (!gig) return <p className="text-sm text-slate-muted">{t("common.loading")}</p>;

  const isWorker = user?.role === "worker";
  const isCustomer = (user?.role === "customer" && gig.customer === user?.id) || (gig.customer?._id === user?.id) || user?.role === "admin";
  const isAssignedWorker = gig.worker && (gig.worker._id === user?.id || gig.worker === user?.id);
  const isEmergency = gig.urgency === "emergency";

  const currentMaterials = gig.materials || [];
  const materialCost = gig.materialCost || 0;
  const currentEquipment = gig.equipment || [];
  const equipmentCost = gig.equipmentCost || 0;
  const directReimbursement = materialCost + equipmentCost;

  const emergencyFee = gig.emergencyFee || (isEmergency ? Math.round((gig.baseAmount || gig.amount) * 0.25) : 0);
  const baseService = gig.baseAmount || Math.max(0, gig.amount - directReimbursement - emergencyFee);
  const workerServiceShare = Math.round((baseService + emergencyFee) * 0.85);
  const workerTotalTakeHome = workerServiceShare + directReimbursement;

  // Check if current worker has submitted a proposal
  const myProposal = (gig.proposals || []).find(
    (p) => (p.worker?._id === user?.id) || (p.worker === user?.id)
  );

  const pendingProposals = (gig.proposals || []).filter(
    (p) => p.status === "pending" || !p.status
  );

  async function handleAddMaterial(e) {
    e.preventDefault();
    if (!matName.trim() || !matCost) return;
    setSavingMat(true);
    setError("");
    setMsg("");
    try {
      const updatedList = [
        ...currentMaterials,
        { name: matName.trim(), cost: Math.max(0, Number(matCost) || 0) }
      ];
      const res = await gigsApi.updateMaterials(id, updatedList);
      setGig(res.data);
      setMatName("");
      setMatCost("");
      setMsg("Material item added to invoice!");
    } catch (err) {
      setError(err.message || "Failed to update materials");
    } finally {
      setSavingMat(false);
    }
  }

  async function handleRemoveMaterial(index) {
    setSavingMat(true);
    setError("");
    try {
      const updatedList = currentMaterials.filter((_, i) => i !== index);
      const res = await gigsApi.updateMaterials(id, updatedList);
      setGig(res.data);
      setMsg("Material item removed");
    } catch (err) {
      setError(err.message || "Failed to remove material");
    } finally {
      setSavingMat(false);
    }
  }

  async function handleAddEquipment(e) {
    e.preventDefault();
    if (!eqName.trim() || !eqCost) return;
    setSavingEq(true);
    setError("");
    setMsg("");
    try {
      const updatedList = [
        ...currentEquipment,
        { name: eqName.trim(), cost: Math.max(0, Number(eqCost) || 0) }
      ];
      const res = await gigsApi.updateEquipment(id, updatedList);
      setGig(res.data);
      setEqName("");
      setEqCost("");
      setMsg("Equipment item added to invoice!");
    } catch (err) {
      setError(err.message || "Failed to update equipment");
    } finally {
      setSavingEq(false);
    }
  }

  async function handleRemoveEquipment(index) {
    setSavingEq(true);
    setError("");
    try {
      const updatedList = currentEquipment.filter((_, i) => i !== index);
      const res = await gigsApi.updateEquipment(id, updatedList);
      setGig(res.data);
      setMsg("Equipment item removed");
    } catch (err) {
      setError(err.message || "Failed to remove equipment");
    } finally {
      setSavingEq(false);
    }
  }

  async function handleProposalSubmit(e) {
    e.preventDefault();
    if (!propAmount) return;
    setSubmittingProp(true);
    setError("");
    setMsg("");
    try {
      const payload = {
        requestedAmount: Number(propAmount),
        note: propNote.trim(),
        equipmentCost: Number(propEqCost) || 0,
        equipmentDetails: propEqDetails.trim()
      };
      const res = await gigsApi.submitProposal(id, payload);
      setGig(res.data);
      setShowProposalForm(false);
      setMsg("Custom pay proposal sent to customer!");
    } catch (err) {
      setError(err.message || "Failed to submit proposal");
    } finally {
      setSubmittingProp(false);
    }
  }

  async function handleAcceptProposal(proposalId) {
    setAcceptingPropId(proposalId);
    setError("");
    try {
      const res = await gigsApi.acceptProposal(id, proposalId);
      setGig(res.data);
      setMsg("Worker proposal accepted and booked!");
    } catch (err) {
      setError(err.message || "Failed to accept proposal");
    } finally {
      setAcceptingPropId(null);
    }
  }

  const ratingDescriptions = {
    1: "★☆☆☆☆ Poor (1/5)",
    2: "★★☆☆☆ Fair (2/5)",
    3: "★★★☆☆ Good (3/5)",
    4: "★★★★☆ Very Good (4/5)",
    5: "★★★★★ Excellent (5/5)"
  };

  return (
    <div className="space-y-6">
      {/* ── Title & Hero Emergency Banner ── */}
      <div
        className={`relative overflow-hidden rounded-panel border p-5 md:p-6 transition-all shadow-md ${
          isEmergency
            ? "border-red-400 bg-gradient-to-br from-red-50 via-rose-50 to-amber-50 ring-1 ring-red-300"
            : "hero-gradient text-white"
        }`}
      >
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
                    🚨 EMERGENCY PRIORITY
                  </span>
                )}
              </div>
              <p className={`text-xs md:text-sm leading-relaxed ${isEmergency ? "text-red-900/80" : "text-white/80"}`}>
                {gig.description}
              </p>
            </div>

            <div className={`text-right shrink-0 ${isEmergency ? "text-red-950" : "text-white"}`}>
              <div className="text-2xl font-black">₹{gig.amount}</div>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isEmergency ? "text-red-800" : "text-emerald-200"}`}>
                Total Invoice
              </span>
              <span
                className={`inline-block mt-1 rounded-full px-3 py-0.5 text-[10px] font-black uppercase ${
                  gig.status === "completed"
                    ? "bg-emerald-500 text-white"
                    : gig.status === "accepted" || gig.status === "in-progress"
                    ? "bg-blue-500 text-white"
                    : "bg-amber-400 text-amber-950"
                }`}
              >
                ● {gig.status}
              </span>
            </div>
          </div>

          {/* Location & Meta Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10 text-xs">
            <span className={`rounded-full px-2.5 py-0.5 font-bold capitalize flex items-center gap-1 ${
              isEmergency ? "bg-red-100 text-red-900" : "bg-white/15 text-white"
            }`}>
              🏷️ {gig.category}
            </span>
            {gig.location && (
              <span className={`rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 truncate max-w-sm ${
                isEmergency ? "bg-red-100 text-red-900" : "bg-white/15 text-white/90"
              }`}>
                📍 {gig.location}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${
              isEmergency ? "bg-red-100 text-red-900" : "bg-white/15 text-white/90"
            }`}>
              📅 {new Date(gig.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Assigned Worker Profile Card ── */}
      {gig.workerDetails && (
        <div className="card-hover rounded-panel border border-[#cfc8b8] bg-[#eee9dd] p-4 md:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
              <span>👷</span>
              <span>Assigned Service Professional</span>
            </h2>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
              Active Assignment
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {gig.workerDetails.avatar ? (
              <img
                src={gig.workerDetails.avatar}
                alt={gig.workerDetails.name}
                className="h-16 w-16 rounded-full object-cover border-2 border-forest shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d7e3dc] text-forest font-black text-xl shadow-xs">
                {(gig.workerDetails.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-base text-teal-ink">{gig.workerDetails.name}</span>
                {gig.workerDetails.isVerified && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    ✓ Verified Pro
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-forest bg-[#d7e3dc] px-2.5 py-0.5 rounded-full">
                  🏆 {gig.workerDetails.completedJobs || 0} Successful Jobs
                </span>
                <span className="font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  ⭐ {gig.workerDetails.rating || 0}/5 ({gig.workerDetails.ratingCount || 0} reviews)
                </span>
              </div>
              {gig.workerDetails.skills && gig.workerDetails.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {gig.workerDetails.skills.map((s, idx) => (
                    <span key={idx} className="rounded-full bg-white border border-[#cfc8b8] px-2 py-0.5 text-[10px] text-teal-ink font-medium capitalize">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Photos Gallery ── */}
      {gig.images && gig.images.length > 0 && (
        <div className="space-y-2.5 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 md:p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
            <span>📷</span>
            <span>Task Photos & Site Images ({gig.images.length})</span>
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {gig.images.map((imgUrl, i) => (
              <a
                key={i}
                href={imgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block h-24 w-24 overflow-hidden rounded-card border border-[#cfc8b8] shadow-sm hover:scale-105 transition-transform"
              >
                <img src={imgUrl} alt={`Gig task photo ${i + 1}`} className="h-full w-full object-cover group-hover:opacity-90" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                  🔍 View
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Interactive 85/15 Cooperative Financial Breakdown ── */}
      <div className="rounded-panel border border-[#d9d2c3] bg-white p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-teal-ink flex items-center gap-1.5">
              <span>📊</span>
              <span>Transparent Cooperative Financial Split (85/15 Model)</span>
            </h2>
            <p className="text-xs text-slate-muted mt-0.5">
              Workers keep 85% of labor pay + 100% direct parts/tools reimbursements. 15% funds community safety nets.
            </p>
          </div>
          <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full">
            Government Fair Pay Compliant
          </span>
        </div>

        {/* Itemized Cost Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          <div className="rounded-card bg-page border border-[#cfc8b8] p-3 text-center sm:text-left">
            <span className="text-slate-muted block text-[11px] font-semibold">Base Labor</span>
            <span className="font-extrabold text-base text-teal-ink">₹{baseService}</span>
          </div>

          {isEmergency && (
            <div className="rounded-card bg-red-50 border border-red-200 p-3 text-center sm:text-left">
              <span className="text-red-900 block text-[11px] font-bold">Emergency Surge</span>
              <span className="font-extrabold text-base text-red-950">+₹{emergencyFee}</span>
            </div>
          )}

          <div className="rounded-card bg-amber-50/70 border border-amber-200 p-3 text-center sm:text-left">
            <span className="text-amber-900 block text-[11px] font-bold">📦 Materials (100%)</span>
            <span className="font-extrabold text-base text-amber-950">+₹{materialCost}</span>
          </div>

          <div className="rounded-card bg-blue-50/70 border border-blue-200 p-3 text-center sm:text-left">
            <span className="text-blue-900 block text-[11px] font-bold">🛠️ Equipment (100%)</span>
            <span className="font-extrabold text-base text-blue-950">+₹{equipmentCost}</span>
          </div>

          <div className="rounded-card bg-gradient-to-br from-forest to-[#234d3b] text-white p-3 text-center sm:text-left col-span-2 sm:col-span-1 shadow-xs">
            <span className="text-white/80 block text-[11px] font-semibold">Total Invoice</span>
            <span className="font-black text-lg text-white">₹{gig.amount}</span>
          </div>
        </div>

        {/* Visual Revenue Bar Infographic */}
        <div className="rounded-card bg-slate-50 p-3.5 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-forest flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block" />
              👷 Worker Take-Home: ₹{workerTotalTakeHome} ({Math.round((workerTotalTakeHome / (gig.amount || 1)) * 100)}%)
            </span>
            <span className="text-amber-800 flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              🛡️ Co-op Welfare Pool: ₹{Math.round((baseService + emergencyFee) * 0.15)}
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((workerTotalTakeHome / (gig.amount || 1)) * 100))}%` }}
              title="Worker Take-Home Share"
            />
            <div
              className="h-full bg-amber-400 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round(((gig.amount * 0.15) / (gig.amount || 1)) * 100))}%` }}
              title="Cooperative Welfare & Insurance Fund"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-muted pt-1">
            <span>• 85% Service Labor (₹{workerServiceShare}) + 100% Direct Parts & Tool Reimbursement (₹{directReimbursement})</span>
            <span>• 15% Automatic Micro-Insurance & Artisan Pension Pool</span>
          </div>
        </div>
      </div>

      {/* ── CUSTOMER VIEW: WORKER PROPOSALS & BIDS ── */}
      {isCustomer && gig.status === "pending" && pendingProposals.length > 0 && (
        <div className="space-y-3 rounded-panel border-2 border-purple-400 bg-purple-50/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-purple-950 uppercase tracking-wide flex items-center gap-2">
              <span>💼</span>
              <span>Received Custom Rate Proposals ({pendingProposals.length})</span>
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {pendingProposals.map((p) => {
              const worker = p.worker || {};
              const pEqCost = p.equipmentCost || 0;
              const pBase = p.requestedAmount || 0;
              const pEmFee = gig.emergencyFee || 0;
              const pMatCost = gig.materialCost || 0;
              const pTotal = pBase + pEmFee + pMatCost + pEqCost;

              return (
                <div
                  key={p._id}
                  className="card-hover glow-border-purple rounded-card border border-purple-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {worker.avatar ? (
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-purple-400"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-200 text-purple-900 font-bold text-base">
                          {(worker.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-teal-ink">{worker.name}</span>
                          {worker.isVerified && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[10px] font-bold">
                              ✓ Verified Pro
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                          <span className="font-bold text-forest bg-[#d7e3dc] px-2 py-0.5 rounded-full">🏆 {worker.completedJobs || 0} Jobs</span>
                          <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">⭐ {worker.rating || 0}/5 ({worker.ratingCount || 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-purple-950">₹{pTotal}</div>
                      <span className="text-[10px] font-semibold text-slate-muted uppercase">Proposed Total</span>
                    </div>
                  </div>

                  {p.note && (
                    <p className="text-xs text-purple-950 bg-purple-50 p-2.5 rounded-card border border-purple-100 italic leading-relaxed">
                      "{p.note}"
                    </p>
                  )}

                  {pEqCost > 0 && (
                    <div className="text-xs text-blue-950 bg-blue-50 p-2 rounded-card border border-blue-200 flex justify-between">
                      <span>🛠️ Specialized Tools / Equipment: {p.equipmentDetails || "Tools"}</span>
                      <span className="font-bold text-blue-900">+₹{pEqCost}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      disabled={acceptingPropId === p._id}
                      onClick={() => handleAcceptProposal(p._id)}
                      className="btn-press rounded-card bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-2 text-xs font-bold text-white shadow hover:from-purple-800 hover:to-indigo-800 transition-all"
                    >
                      {acceptingPropId === p._id ? "Booking..." : "✓ Accept & Book Worker"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WORKER VIEW: CUSTOM PAY PROPOSAL SUBMISSION */}
      {isWorker && gig.status === "pending" && (
        <div className="rounded-panel border border-purple-300 bg-purple-50/80 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-purple-950">
                💼 Worker Custom Rate / Skill Proposal
              </h2>
              <p className="text-xs text-purple-900/80">
                Experienced professionals can quote custom rates and include specialized equipment.
              </p>
            </div>
            {myProposal ? (
              <span className="rounded bg-purple-200 text-purple-900 px-2.5 py-1 text-xs font-bold">
                Proposal Submitted: ₹{myProposal.requestedAmount} ({myProposal.status})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowProposalForm(!showProposalForm);
                  if (!propAmount) setPropAmount(gig.baseAmount || gig.amount);
                }}
                className="rounded-card bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
              >
                {showProposalForm ? "Cancel" : "+ Propose Custom Rate"}
              </button>
            )}
          </div>

          {showProposalForm && (
            <form onSubmit={handleProposalSubmit} className="space-y-3 pt-2 border-t border-purple-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="block">
                  <span className="font-semibold text-purple-950">Requested Base Service Pay (₹) *</span>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 min-h-9 w-full rounded-card border border-purple-300 bg-white px-2.5 text-xs"
                    placeholder="e.g. 750"
                    value={propAmount}
                    onChange={(e) => setPropAmount(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-slate-muted">Standard rate is ₹{gig.amount}</span>
                </label>

                <label className="block">
                  <span className="font-semibold text-purple-950">Equipment / Tool Rental Cost (₹)</span>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 min-h-9 w-full rounded-card border border-purple-300 bg-white px-2.5 text-xs"
                    placeholder="e.g. 300"
                    value={propEqCost}
                    onChange={(e) => setPropEqCost(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="block">
                  <span className="font-semibold text-purple-950">Equipment Description (if any)</span>
                  <input
                    className="mt-1 min-h-9 w-full rounded-card border border-purple-300 bg-white px-2.5 text-xs"
                    placeholder="e.g. Industrial Pipe Jetter & Laser Level"
                    value={propEqDetails}
                    onChange={(e) => setPropEqDetails(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="font-semibold text-purple-950">Experience & Skill Note</span>
                  <input
                    className="mt-1 min-h-9 w-full rounded-card border border-purple-300 bg-white px-2.5 text-xs"
                    placeholder="e.g. 8+ yrs master electrician, same-day 1hr turnaround"
                    value={propNote}
                    onChange={(e) => setPropNote(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProposalForm(false)}
                  className="rounded-card border border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-900"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingProp}
                  className="rounded-card bg-purple-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-800"
                >
                  {submittingProp ? "Submitting..." : "Send Proposal to Customer"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Equipment & Machinery Cost Management Section */}
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-teal-ink">🛠️ Equipment & Tool Rental Costs</h2>
            <p className="text-xs text-slate-muted">
              Add rental fees for specialized tools, safety scaffolding, or machinery required for this task.
            </p>
          </div>
          <span className="font-bold text-sm text-blue-900">Total Equipment: ₹{equipmentCost}</span>
        </div>

        {currentEquipment.length > 0 ? (
          <ul className="space-y-1.5 pt-1">
            {currentEquipment.map((eq, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between rounded-card bg-page border border-[#cfc8b8] px-3 py-2 text-xs"
              >
                <span className="font-medium text-teal-ink">{eq.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-blue-900">₹{eq.cost}</span>
                  {(isWorker || isCustomer) && gig.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(idx)}
                      disabled={savingEq}
                      className="text-[#8b3a3a] hover:text-red-700 text-xs font-bold"
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-muted italic">No specialized equipment added.</p>
        )}

        {/* Add Equipment Form */}
        {gig.status !== "completed" && gig.status !== "cancelled" && (
          <form onSubmit={handleAddEquipment} className="flex flex-wrap items-end gap-2 pt-2 border-t border-[#d9d2c3]/60">
            <label className="block text-xs flex-1 min-w-[140px]">
              Tool / Equipment Name
              <input
                className="mt-1 min-h-9 w-full rounded-card border border-[#cfc8b8] bg-page px-2.5 text-xs"
                placeholder="e.g. Concrete Breaker Drill / Scaffolding"
                value={eqName}
                onChange={(e) => setEqName(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs w-28">
              Rental Cost (₹)
              <input
                type="number"
                min="0"
                className="mt-1 min-h-9 w-full rounded-card border border-[#cfc8b8] bg-page px-2.5 text-xs"
                placeholder="Cost"
                value={eqCost}
                onChange={(e) => setEqCost(e.target.value)}
                required
              />
            </label>
            <button
              disabled={savingEq}
              className="min-h-9 rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6] hover:bg-[#234d3b] transition-colors"
            >
              {savingEq ? "Saving…" : "+ Add Equipment"}
            </button>
          </form>
        )}
      </div>

      {/* Materials & Parts Management Section */}
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-teal-ink">📦 Required Materials & Parts Cost</h2>
            <p className="text-xs text-slate-muted">
              Add costs of hardware, replacement parts, or supplies purchased for this task.
            </p>
          </div>
          <span className="font-bold text-sm text-amber-900">Total Materials: ₹{materialCost}</span>
        </div>

        {currentMaterials.length > 0 ? (
          <ul className="space-y-1.5 pt-1">
            {currentMaterials.map((m, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between rounded-card bg-page border border-[#cfc8b8] px-3 py-2 text-xs"
              >
                <span className="font-medium text-teal-ink">{m.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-amber-900">₹{m.cost}</span>
                  {(isWorker || isCustomer) && gig.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(idx)}
                      disabled={savingMat}
                      className="text-[#8b3a3a] hover:text-red-700 text-xs font-bold"
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-muted italic">No materials added yet.</p>
        )}

        {/* Add Material Form */}
        {gig.status !== "completed" && gig.status !== "cancelled" && (
          <form onSubmit={handleAddMaterial} className="flex flex-wrap items-end gap-2 pt-2 border-t border-[#d9d2c3]/60">
            <label className="block text-xs flex-1 min-w-[140px]">
              Item Name
              <input
                className="mt-1 min-h-9 w-full rounded-card border border-[#cfc8b8] bg-page px-2.5 text-xs"
                placeholder="e.g. 1.5 inch PVC elbow joint"
                value={matName}
                onChange={(e) => setMatName(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs w-28">
              Cost (₹)
              <input
                type="number"
                min="0"
                className="mt-1 min-h-9 w-full rounded-card border border-[#cfc8b8] bg-page px-2.5 text-xs"
                placeholder="Cost"
                value={matCost}
                onChange={(e) => setMatCost(e.target.value)}
                required
              />
            </label>
            <button
              disabled={savingMat}
              className="min-h-9 rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6] hover:bg-[#234d3b] transition-colors"
            >
              {savingMat ? "Saving…" : "+ Add Material"}
            </button>
          </form>
        )}
      </div>

      <GigStepper status={gig.status} />

      {msg && <p className="text-xs text-forest font-semibold bg-emerald-50 p-2.5 rounded-card border border-emerald-200">{msg}</p>}
      {error && <p className="text-sm text-red-800 font-medium bg-red-100 p-3 rounded-card">{error}</p>}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2.5 pt-2">
        {isWorker && gig.status === "pending" && (
          <button
            className="btn-glow btn-press min-h-11 rounded-card bg-forest px-6 text-[#F3EFE6] font-bold shadow-md hover:bg-[#234d3b] transition-all"
            onClick={() => gigsApi.accept(id).then(load).catch((e) => setError(e.message))}
          >
            ✓ Accept Standard Gig Rate (₹{gig.amount})
          </button>
        )}

        {isWorker && isAssignedWorker && gig.status === "accepted" && (
          <button
            className="btn-glow btn-press min-h-11 rounded-card bg-forest px-6 text-[#F3EFE6] font-bold shadow-md hover:bg-[#234d3b] transition-all"
            onClick={() => gigsApi.start(id).then(load).catch((e) => setError(e.message))}
          >
            ▶ {t("gig.start")}
          </button>
        )}

        {(isWorker || isCustomer) && (gig.status === "accepted" || gig.status === "in-progress") && (
          <button
            className="btn-press min-h-11 rounded-card border-2 border-forest bg-white px-6 text-sm font-bold text-forest hover:bg-forest hover:text-white shadow-sm transition-all"
            onClick={() => gigsApi.complete(id).then(load).catch((e) => setError(e.message))}
          >
            ✓ {t("gig.complete")}
          </button>
        )}

        {isCustomer && gig.status === "completed" && (
          <button
            className="btn-glow btn-press min-h-11 rounded-card bg-gradient-to-r from-emerald-600 to-teal-700 px-6 text-[#F3EFE6] font-bold shadow-md hover:from-emerald-700 hover:to-teal-800 transition-all"
            onClick={() => setPayOpen(true)}
          >
            💳 {t("gig.pay")} (₹{gig.amount})
          </button>
        )}
      </div>

      {/* ── CUSTOMER 5-STAR RATING & REVIEW SECTION ── */}
      {isCustomer && gig.status === "completed" && !gig.review?.rating && (
        <form
          className="glow-border space-y-4 rounded-panel border-2 border-forest/30 bg-gradient-to-br from-[#eee9dd] to-[#e4ded0] p-6 shadow-md"
          onSubmit={(e) => {
            e.preventDefault();
            gigsApi.review(id, { rating: Number(rating), text })
              .then(() => {
                setMsg("Thank you! Your rating has updated the worker's score.");
                load();
              })
              .catch((err) => setError(err.message));
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h2 className="text-base font-bold text-teal-ink">Rate Your Service Professional</h2>
            </div>
            <p className="text-xs text-slate-muted mt-0.5">
              Your transparent feedback directly feeds into the TOPSIS algorithm and worker cooperative ranking.
            </p>
          </div>

          {/* Interactive Star Picker */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl sm:text-4xl transition-all duration-150 transform hover:scale-130 focus:outline-hidden"
                >
                  {(hoverRating || rating) >= star ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <div className="inline-block rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
              {ratingDescriptions[hoverRating || rating]}
            </div>
          </div>

          <label className="block text-xs">
            <span className="font-semibold text-teal-ink">Comments & Experience Feedback (optional)</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded-card border border-[#cfc8b8] bg-white px-3 py-2 text-xs focus:border-forest focus:outline-hidden"
              placeholder="e.g. Prompt arrival, excellent craftsmanship, brought all necessary tools!"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <button className="btn-press btn-glow min-h-11 rounded-card bg-forest px-6 text-xs font-bold text-[#F3EFE6] shadow-md hover:bg-[#234d3b] transition-all">
            ✓ Submit Rating & Update Worker Score
          </button>
        </form>
      )}

      {/* ── Submitted Review Display ── */}
      {gig.review?.rating && (
        <div className="card-hover space-y-2.5 rounded-panel border border-[#d9d2c3] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
              <span>⭐</span>
              <span>Verified Customer Review</span>
            </h2>
            <span className="font-black text-amber-900 text-base bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {"⭐".repeat(gig.review.rating)} ({gig.review.rating}/5)
            </span>
          </div>
          {gig.review.text && (
            <p className="text-xs text-teal-ink italic bg-page p-3 rounded-card border border-[#cfc8b8] leading-relaxed">
              "{gig.review.text}"
            </p>
          )}
          <p className="text-[11px] text-slate-muted flex items-center gap-1">
            <span>✓ Submitted on {new Date(gig.review.createdAt || gig.updatedAt).toLocaleDateString()}</span>
            <span>· Worker score updated in real-time</span>
          </p>
        </div>
      )}

      <PaymentSheet
        open={payOpen}
        amountInr={gig.amount}
        gigId={gig._id}
        onClose={() => setPayOpen(false)}
        onVerified={() => {}}
      />
    </div>
  );
}

