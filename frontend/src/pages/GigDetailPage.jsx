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
    <div className="space-y-4">
      {/* Title & Emergency Banner */}
      <div
        className={`rounded-panel border p-4 sm:p-5 space-y-3 ${
          isEmergency
            ? "border-red-400 bg-red-50/90 text-red-950 shadow-sm"
            : "border-[#d9d2c3] bg-[#eee9dd]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-teal-ink">{gig.title}</h1>
              {isEmergency && (
                <span className="rounded-card bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs animate-pulse">
                  🚨 EMERGENCY PRIORITY
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-muted">{gig.description}</p>
          </div>

          <span
            className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${
              gig.status === "completed"
                ? "bg-emerald-100 text-emerald-800"
                : gig.status === "accepted" || gig.status === "in-progress"
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {gig.status}
          </span>
        </div>

        {/* Location & Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-muted pt-1 border-t border-[#d9d2c3]/60">
          <span className="capitalize font-medium text-teal-ink bg-[#d7e3dc] px-2 py-0.5 rounded">
            {gig.category}
          </span>
          {gig.location && (
            <span className="text-teal-ink font-medium">
              📍 {gig.location}
            </span>
          )}
        </div>
      </div>

      {/* Assigned Worker Profile Card */}
      {gig.workerDetails && (
        <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-forest">
            Assigned Service Professional
          </h2>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {gig.workerDetails.avatar ? (
              <img
                src={gig.workerDetails.avatar}
                alt={gig.workerDetails.name}
                className="h-12 w-12 rounded-full object-cover border border-[#cfc8b8]"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d7e3dc] text-forest font-bold">
                {(gig.workerDetails.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-teal-ink">{gig.workerDetails.name}</span>
                {gig.workerDetails.isVerified && (
                  <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-semibold">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-forest">
                  🏆 {gig.workerDetails.completedJobs || 0} Successful Jobs
                </span>
                <span className="text-amber-900 font-medium">
                  ⭐ {gig.workerDetails.rating || 0}/5 ({gig.workerDetails.ratingCount || 0} reviews)
                </span>
              </div>
              {gig.workerDetails.skills && gig.workerDetails.skills.length > 0 && (
                <p className="text-[11px] text-slate-muted">
                  Skills: {gig.workerDetails.skills.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Photos Gallery */}
      {gig.images && gig.images.length > 0 && (
        <div className="space-y-2 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest">
            Task Photos ({gig.images.length})
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {gig.images.map((imgUrl, i) => (
              <a
                key={i}
                href={imgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-card border border-[#cfc8b8] shadow-sm hover:opacity-90"
              >
                <img src={imgUrl} alt={`Gig task photo ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pricing & Cooperative Breakdown Card */}
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 space-y-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-forest">
          Invoice & Payment Breakdown
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
          <div className="rounded-card bg-page border border-[#cfc8b8] p-2.5">
            <span className="text-slate-muted block">Base Service</span>
            <span className="font-semibold text-sm text-teal-ink">₹{baseService}</span>
          </div>

          {isEmergency && (
            <div className="rounded-card bg-red-100 border border-red-300 p-2.5">
              <span className="text-red-900 block font-medium">Emergency Surge</span>
              <span className="font-bold text-sm text-red-950">+₹{emergencyFee}</span>
            </div>
          )}

          <div className="rounded-card bg-page border border-[#cfc8b8] p-2.5">
            <span className="text-slate-muted block">Parts & Materials</span>
            <span className="font-semibold text-sm text-amber-900">+₹{materialCost}</span>
          </div>

          <div className="rounded-card bg-page border border-[#cfc8b8] p-2.5">
            <span className="text-slate-muted block">Tools & Equipment</span>
            <span className="font-semibold text-sm text-blue-900">+₹{equipmentCost}</span>
          </div>

          <div className="rounded-card bg-forest/10 border border-forest/30 p-2.5 col-span-2 sm:col-span-1">
            <span className="text-forest block font-medium">Total Gig Cost</span>
            <span className="font-bold text-base text-forest">₹{gig.amount}</span>
          </div>
        </div>

        {/* Worker Payout Highlight */}
        <div className="mt-2 rounded-card bg-[#d7e3dc] p-3 text-xs text-forest space-y-1">
          <div className="flex justify-between items-center font-bold text-sm">
            <span>👷 Worker Take-Home Payout:</span>
            <span>₹{workerTotalTakeHome}</span>
          </div>
          <p className="text-[11px] text-teal-ink">
            • 85% Service Share (₹{workerServiceShare}) + 100% Direct Reimbursement (Materials: ₹{materialCost} + Equipment: ₹{equipmentCost})
          </p>
          <p className="text-[11px] text-slate-muted">
            • 15% Cooperative Pool Community Benefit Fund (₹{Math.round((baseService + emergencyFee) * 0.15)})
          </p>
        </div>
      </div>

      {/* CUSTOMER VIEW: WORKER PROPOSALS & BIDS */}
      {isCustomer && gig.status === "pending" && pendingProposals.length > 0 && (
        <div className="space-y-3 rounded-panel border-2 border-purple-400 bg-purple-50/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-purple-950">
              💼 Received Custom Rate Proposals ({pendingProposals.length})
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
                  className="rounded-card border border-purple-200 bg-white p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {worker.avatar ? (
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="h-11 w-11 rounded-full object-cover border border-purple-300"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-200 text-purple-900 font-bold">
                          {(worker.name || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-teal-ink">{worker.name}</span>
                          {worker.isVerified && (
                            <span className="rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[10px] font-semibold">
                              ✓ Verified Pro
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-forest">🏆 {worker.completedJobs || 0} Jobs</span>
                          <span className="text-amber-900 font-medium">⭐ {worker.rating || 0}/5 ({worker.ratingCount || 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-purple-900">₹{pTotal}</div>
                      <span className="text-[10px] text-slate-muted">Proposed Total</span>
                    </div>
                  </div>

                  {p.note && (
                    <p className="text-xs text-purple-950 bg-purple-50 p-2 rounded border border-purple-100 italic">
                      "{p.note}"
                    </p>
                  )}

                  {pEqCost > 0 && (
                    <div className="text-xs text-blue-900 bg-blue-50 p-1.5 rounded flex justify-between">
                      <span>🛠️ Equipment: {p.equipmentDetails || "Tools"}</span>
                      <span className="font-bold">+₹{pEqCost}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      disabled={acceptingPropId === p._id}
                      onClick={() => handleAcceptProposal(p._id)}
                      className="rounded-card bg-purple-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-purple-800 transition-colors"
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
      <div className="flex flex-wrap gap-2 pt-2">
        {isWorker && gig.status === "pending" && (
          <button
            className="min-h-11 rounded-card bg-forest px-5 text-[#F3EFE6] font-medium shadow hover:bg-[#234d3b]"
            onClick={() => gigsApi.accept(id).then(load).catch((e) => setError(e.message))}
          >
            ✓ Accept Standard Gig Rate (₹{gig.amount})
          </button>
        )}

        {isWorker && isAssignedWorker && gig.status === "accepted" && (
          <button
            className="min-h-11 rounded-card bg-forest px-5 text-[#F3EFE6] font-medium shadow hover:bg-[#234d3b]"
            onClick={() => gigsApi.start(id).then(load).catch((e) => setError(e.message))}
          >
            ▶ {t("gig.start")}
          </button>
        )}

        {(isWorker || isCustomer) && (gig.status === "accepted" || gig.status === "in-progress") && (
          <button
            className="min-h-11 rounded-card border border-[#cfc8b8] bg-page px-5 text-sm font-medium hover:bg-[#d7e3dc]"
            onClick={() => gigsApi.complete(id).then(load).catch((e) => setError(e.message))}
          >
            ✓ {t("gig.complete")}
          </button>
        )}

        {isCustomer && gig.status === "completed" && (
          <button
            className="min-h-11 rounded-card bg-forest px-5 text-[#F3EFE6] font-medium shadow"
            onClick={() => setPayOpen(true)}
          >
            💳 {t("gig.pay")} (₹{gig.amount})
          </button>
        )}
      </div>

      {/* CUSTOMER 5-STAR RATING & REVIEW SECTION */}
      {isCustomer && gig.status === "completed" && !gig.review?.rating && (
        <form
          className="space-y-3 rounded-panel border-2 border-forest/30 bg-[#eee9dd] p-5 shadow-sm"
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
            <h2 className="text-base font-bold text-teal-ink">⭐ Rate Your Service Professional</h2>
            <p className="text-xs text-slate-muted">
              Your feedback directly determines worker rankings and community trust score.
            </p>
          </div>

          {/* Interactive Star Picker */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl transition-transform hover:scale-125 focus:outline-hidden"
                >
                  {(hoverRating || rating) >= star ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-forest">
              {ratingDescriptions[hoverRating || rating]}
            </p>
          </div>

          <label className="block text-xs">
            <span className="font-semibold text-teal-ink">Comments & Experience Feedback (optional)</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded-card border border-[#cfc8b8] bg-page px-3 py-2 text-xs"
              placeholder="e.g. Prompt arrival, excellent craftsmanship, brought all necessary tools!"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <button className="min-h-11 rounded-card bg-forest px-5 text-xs font-bold text-[#F3EFE6] shadow hover:bg-[#234d3b]">
            ✓ Submit Rating & Update Worker Score
          </button>
        </form>
      )}

      {/* Submitted Review Display */}
      {gig.review?.rating && (
        <div className="space-y-2 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-forest">
              Customer Review & Feedback
            </h2>
            <span className="font-bold text-amber-900 text-sm">
              {"⭐".repeat(gig.review.rating)} ({gig.review.rating}/5)
            </span>
          </div>
          {gig.review.text && (
            <p className="text-xs text-teal-ink italic bg-page p-2.5 rounded border border-[#cfc8b8]">
              "{gig.review.text}"
            </p>
          )}
          <p className="text-[11px] text-slate-muted">
            Submitted on {new Date(gig.review.createdAt || gig.updatedAt).toLocaleDateString()} · Worker score dynamically updated
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
