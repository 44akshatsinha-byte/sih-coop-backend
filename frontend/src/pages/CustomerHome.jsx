import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CATEGORIES, gigsApi, aiApi } from "../api/client.js";
import MapPicker from "../components/MapPicker.jsx";

const CATEGORY_META = {
  plumbing: { icon: "🔧", label: "Plumbing", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-300" },
  electrical: { icon: "⚡", label: "Electrical", color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-300" },
  carpentry: { icon: "🪚", label: "Carpentry", color: "from-orange-500/20 to-amber-600/20", border: "border-orange-300" },
  painting: { icon: "🎨", label: "Painting", color: "from-pink-500/20 to-rose-500/20", border: "border-pink-300" },
  cleaning: { icon: "🧹", label: "Cleaning", color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-300" },
  driving: { icon: "🚗", label: "Driving", color: "from-indigo-500/20 to-blue-600/20", border: "border-indigo-300" },
  gardening: { icon: "🌿", label: "Gardening", color: "from-green-500/20 to-emerald-600/20", border: "border-green-300" },
  caregiving: { icon: "🩺", label: "Caregiving", color: "from-red-500/20 to-rose-600/20", border: "border-red-300" },
  technician: { icon: "💻", label: "Technician", color: "from-sky-500/20 to-blue-500/20", border: "border-sky-300" },
  domestic: { icon: "🏠", label: "Domestic", color: "from-amber-500/20 to-orange-500/20", border: "border-amber-300" },
  general: { icon: "🛠️", label: "General", color: "from-teal-500/20 to-forest/20", border: "border-teal-300" }
};

export default function CustomerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "plumbing",
    amount: 500,
    urgency: "normal"
  });

  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiEstimateResult, setAiEstimateResult] = useState(null);

  // Detailed address & landmark fields
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [cityArea, setCityArea] = useState("");

  // Map and Coordinates
  const [pin, setPin] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");

  // Optional task photos
  const [images, setImages] = useState([]);

  const [mine, setMine] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    gigsApi.mine().then((r) => setMine(r.data || [])).catch(() => {});
  }, []);

  function useMyLocation() {
    setLocating(true);
    setLocMsg("");
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPin({ lat, lng });
        setLocating(false);
        setLocMsg(`Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { Accept: "application/json" } }
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.address) {
              const a = data.address;
              const sub = a.suburb || a.neighbourhood || a.road || "";
              const c = a.city || a.town || a.county || a.state_district || "";
              const detected = [sub, c].filter(Boolean).join(", ");
              if (detected && !cityArea) {
                setCityArea(detected);
              }
            }
          })
          .catch(() => {});
      },
      (err) => {
        setLocating(false);
        setError(err.message || "Location access was denied or timed out");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setImages((prev) => [...prev, dataUrl]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const locationFormatted = [
      address.trim(),
      landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
      cityArea.trim()
    ]
      .filter(Boolean)
      .join(", ");

    const baseAmt = Number(form.amount) || 500;
    const emergencyFee = form.urgency === "emergency" ? Math.max(200, Math.round(baseAmt * 0.25)) : 0;
    const totalAmount = baseAmt + emergencyFee;

    try {
      const body = {
        ...form,
        location: locationFormatted || cityArea || "Local Area",
        baseAmount: baseAmt,
        emergencyFee,
        amount: totalAmount,
        images,
        latitude: pin?.lat ?? null,
        longitude: pin?.lng ?? null
      };

      const res = await gigsApi.create(body);
      const gig = res.data;
      sessionStorage.setItem("lastGigId", gig._id);
      navigate("/matches", {
        state: {
          gigId: gig._id,
          latitude: pin?.lat,
          longitude: pin?.lng,
          category: form.category,
          urgency: form.urgency
        }
      });
    } catch (err) {
      setError(err.message || "Failed to post gig");
    } finally {
      setSubmitting(false);
    }
  }

  const QUICK_PROMPTS = [
    { label: "🚰 Leaking Kitchen Pipe", text: "Kitchen tap leaking water continuously and pipe joint broken under sink, need plumber urgently", cat: "plumbing" },
    { label: "⚡ MCB Tripping & Sparks", text: "Main MCB switch is tripping repeatedly with sparks in switchboard, emergency electrician needed", cat: "electrical" },
    { label: "🚪 Jammed Door Lock", text: "Main wooden door lock is jammed and hinges are loose, need carpenter for repair", cat: "carpentry" },
    { label: "❄️ AC Service & Cooling", text: "Split AC not cooling properly, needs coil cleaning and gas level check", cat: "technician" },
    { label: "🧹 Deep Cleaning", text: "Need full 2BHK home deep cleaning including bathroom, kitchen tiles, and sofa vacuuming", cat: "cleaning" },
    { label: "🎨 Wall Paint Touchup", text: "Living room wall has water stains and peeling paint, need primer and color touchup", cat: "painting" }
  ];

  async function applyQuickPrompt(prompt) {
    setForm((prev) => ({
      ...prev,
      description: prompt.text,
      category: prompt.cat || prev.category
    }));
    // Automatically trigger AI analysis
    setAiEstimating(true);
    setError("");
    try {
      const res = await aiApi.estimate({ description: prompt.text });
      if (res && res.suggestedDraft) {
        setForm((prev) => ({
          ...prev,
          title: res.suggestedDraft.title,
          category: res.suggestedDraft.category || prompt.cat || prev.category,
          urgency: res.suggestedDraft.urgency || prev.urgency,
          amount: res.suggestedDraft.estimatedAmount || prev.amount
        }));
        setAiEstimateResult(res);
      }
    } catch {
      // fallback silent
    } finally {
      setAiEstimating(false);
    }
  }

  async function runAiEstimate() {
    if (!form.description || !form.description.trim()) {
      setError("Please type a problem description below (e.g., 'nal se paani tapak raha hai' or 'MCB tripping')");
      return;
    }
    setAiEstimating(true);
    setError("");
    try {
      const res = await aiApi.estimate({ description: form.description });
      if (res && res.suggestedDraft) {
        setForm((prev) => ({
          ...prev,
          title: res.suggestedDraft.title || prev.title,
          category: res.suggestedDraft.category || prev.category,
          urgency: res.suggestedDraft.urgency || prev.urgency,
          amount: res.suggestedDraft.estimatedAmount || prev.amount
        }));
        setAiEstimateResult(res);
      }
    } catch (err) {
      setError(err.message || "Failed to analyze task");
    } finally {
      setAiEstimating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Graphics Section ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b3d30] via-[#2C5F4A] to-[#3a7a5f] p-6 md:p-8 text-white shadow-xl">
        <div className="orb orb-emerald h-48 w-48 top-[-20px] right-[-20px]" />
        <div className="orb orb-gold h-32 w-32 bottom-[-10px] left-[20%]" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🤖 AI-Powered Fair Cooperative Matching & Pricing</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Book Verified Artisans with <span className="text-amber-300">Transparent AI Pricing</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
            Write your task in English or Hindi. Our AI automatically extracts the required trade, calculates government-standard fair pay, and matches verified local pros with guaranteed 85% worker take-home.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
              <span>100% e-Shram & KYC Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">⚡</span>
              <span>Bilingual NLP Price Auto-Tagger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">⚖️</span>
              <span>Pareto TOPSIS Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── AI Smart Quick-Start Assistant ─── */}
      <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-purple-50/80 p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-lg shadow-xs animate-float">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-black text-purple-950 uppercase tracking-wide">
                AI Magic Auto-Fill & Fair Rate Calculator
              </h2>
              <p className="text-xs text-purple-900/80">
                Click a sample problem below or type your description in Hindi/English to let AI autofill everything.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyQuickPrompt(qp)}
              className="btn-press rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-900 shadow-xs hover:border-purple-400 hover:bg-purple-100/60 transition-all"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Booking Form ─── */}
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-[#d9d2c3] bg-[#eee9dd]/90 backdrop-blur-md p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9d2c3]/80 pb-3">
          <div>
            <h2 className="text-lg font-bold text-teal-ink flex items-center gap-2">
              <span>📋</span> {t("gig.post")}
            </h2>
            <p className="text-xs text-slate-muted">Choose your trade, describe what needs doing, and find the best rated pro.</p>
          </div>
          <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
            Step 1 of 2
          </span>
        </div>

        {/* Interactive Category Grid Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-forest">
            Select Service Trade
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {CATEGORIES.map((catKey) => {
              const meta = CATEGORY_META[catKey] || { icon: "🛠️", label: catKey, color: "from-slate-100 to-slate-200", border: "border-slate-300" };
              const isSelected = form.category === catKey;

              return (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setForm({ ...form, category: catKey })}
                  className={`service-icon-card flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "border-forest bg-forest text-white shadow-md scale-102 ring-2 ring-forest/30"
                      : "border-[#d9d2c3] bg-page hover:bg-[#e4ded0] text-teal-ink"
                  }`}
                >
                  <span className="text-2xl mb-1 transition-transform hover:scale-110">{meta.icon}</span>
                  <span className="text-xs font-semibold capitalize truncate w-full">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description & AI Auto-Estimator */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-teal-ink">
              Task Description & Details *
            </label>
            <button
              type="button"
              disabled={aiEstimating}
              onClick={runAiEstimate}
              className="btn-press btn-glow inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-purple-800 hover:to-indigo-800 transition-all"
            >
              <span>{aiEstimating ? "🤖 AI Analyzing..." : "✨ AI Auto-Estimate & Rate (Hindi/Eng)"}</span>
            </button>
          </div>
          <textarea
            className="mt-1 min-h-24 w-full rounded-xl border border-[#cfc8b8] bg-page px-3.5 py-2.5 text-sm shadow-inner transition-all focus:border-forest focus:ring-1 focus:ring-forest"
            placeholder="Describe the issue in detail, required tools, urgency... (e.g. 'nal se paani tapak raha hai kitchen me' or 'main MCB tripping repeatedly with sparks')"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          {aiEstimateResult && (
            <div className="animate-slide-up rounded-xl border-2 border-purple-300 bg-white p-4 text-xs space-y-2.5 text-purple-950 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <span className="font-black text-sm text-purple-950 block">
                      AI Schedule Estimate: ₹{aiEstimateResult.fairPricingBreakdown?.totalRecommendedAmount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Based on Government District Schedule of Rates (CSR-2026)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 font-bold uppercase text-[10px]">
                    🏷️ {aiEstimateResult.detected?.category}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px] ${
                    aiEstimateResult.detected?.isEmergency ? "bg-red-100 text-red-900 border border-red-200" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  }`}>
                    {aiEstimateResult.detected?.urgency}
                  </span>
                </div>
              </div>

              <p className="text-purple-900/90 text-xs leading-relaxed italic bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                "{aiEstimateResult.explainability}"
              </p>

              <div className="flex flex-wrap gap-3 text-xs pt-1 border-t border-purple-100">
                <span className="text-emerald-800 font-bold flex items-center gap-1">
                  <span>✓</span> Worker Direct Share (85%): ₹{aiEstimateResult.fairPricingBreakdown?.cooperativeDistribution?.workerEarnings}
                </span>
                <span className="text-purple-800 font-bold flex items-center gap-1">
                  <span>🛡️</span> Welfare & Health Fund (15%): ₹{aiEstimateResult.fairPricingBreakdown?.cooperativeDistribution?.cooperativeWelfarePool}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Task Title & Amount Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-teal-ink">
              Task Title *
            </label>
            <input
              className="mt-1 min-h-11 w-full rounded-xl border border-[#cfc8b8] bg-page px-3.5 text-sm shadow-inner transition-all focus:border-forest focus:ring-1 focus:ring-forest font-medium"
              placeholder="e.g. Fix leaking pipe under bathroom basin"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-ink">
              Offered Budget (₹) *
            </label>
            <input
              type="number"
              min="1"
              className="mt-1 min-h-11 w-full rounded-xl border border-[#cfc8b8] bg-page px-3.5 text-sm font-black text-forest shadow-inner transition-all focus:border-forest focus:ring-1 focus:ring-forest"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
        </div>


        {/* Photo Upload Section */}
        <div className="rounded-xl border border-[#cfc8b8] bg-[#e7e1d3] p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-teal-ink flex items-center gap-1.5">
                <span>📸</span> {t("gig.addPhotos")}
              </p>
              <p className="text-[11px] text-slate-muted">{t("gig.photoHint")}</p>
            </div>
            <label className="btn-press cursor-pointer inline-flex min-h-9 items-center justify-center rounded-xl bg-forest px-4 text-xs font-semibold text-[#F3EFE6] hover:bg-[#234d3b] shadow-sm">
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>+ Add Photos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#cfc8b8] shadow-sm group">
                  <img src={imgUrl} alt={`Uploaded ${idx}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    title="Remove"
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[11px] text-white hover:bg-red-700 shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location & Interactive Map Section */}
        <fieldset className="space-y-3 rounded-xl border border-[#cfc8b8] bg-[#e7e1d3] p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wider text-forest">
            📍 Work Location & Address
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              {t("gig.address")}
              <input
                className="mt-1 min-h-10 w-full rounded-xl border border-[#cfc8b8] bg-page px-3 text-sm shadow-inner"
                placeholder="e.g. Flat 301, Sunshine Heights"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <label className="block text-xs font-medium">
              {t("gig.landmark")}
              <input
                className="mt-1 min-h-10 w-full rounded-xl border border-[#cfc8b8] bg-page px-3 text-sm shadow-inner"
                placeholder="e.g. Near Metro Gate 2 / City Hospital"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-xs font-medium">
            {t("gig.cityArea")}
            <input
              className="mt-1 min-h-10 w-full rounded-xl border border-[#cfc8b8] bg-page px-3 text-sm shadow-inner"
              placeholder="e.g. Indiranagar, Bangalore"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
            />
          </label>

          {/* Map Location Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="btn-press inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#cfc8b8] bg-page px-3.5 text-xs font-semibold hover:bg-[#d7e3dc] transition-colors"
              >
                <svg className="h-4 w-4 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{locating ? "Locating via GPS…" : t("gig.useMyLocation")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`btn-press inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                  showMap
                    ? "border-forest bg-forest text-[#F3EFE6]"
                    : "border-[#cfc8b8] bg-page hover:bg-[#d7e3dc]"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>{showMap ? t("gig.hideMap") : t("gig.chooseOnMap")}</span>
              </button>
            </div>

            {pin && (
              <div className="flex items-center gap-1.5 text-xs text-forest font-bold bg-white/70 px-2.5 py-1 rounded-lg border border-[#cfc8b8]">
                <span>📍 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span>
                <button
                  type="button"
                  onClick={() => setPin(null)}
                  className="text-[11px] text-red-700 underline hover:no-underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {locMsg && <p className="text-xs text-forest font-semibold">{locMsg}</p>}

          {/* Collapsible Interactive Map */}
          {showMap && (
            <div className="space-y-2 pt-2 animate-slide-up">
              <p className="text-xs text-slate-muted">{t("gig.mapHint")}</p>
              <MapPicker value={pin} onChange={setPin} height="16rem" />
            </div>
          )}
        </fieldset>

        {/* Urgency Selection */}
        <div className="space-y-2.5 pt-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-forest">
            {t("gig.urgency")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, urgency: "normal" })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                form.urgency === "normal"
                  ? "border-forest bg-forest text-white shadow-md ring-2 ring-forest/30"
                  : "border-[#d9d2c3] bg-page hover:bg-[#e4ded0] text-teal-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <span className="font-bold text-sm">Standard Scheduling</span>
              </div>
              <p className={`text-xs mt-1 ${form.urgency === "normal" ? "text-white/80" : "text-slate-muted"}`}>
                Flexible timing for routine maintenance and scheduled home tasks.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, urgency: "emergency" })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                form.urgency === "emergency"
                  ? "border-red-500 bg-red-600 text-white shadow-md glow-border-red"
                  : "border-[#d9d2c3] bg-page hover:bg-red-50 text-teal-ink"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg animate-pulse">🚨</span>
                <span className="font-bold text-sm">Emergency Priority (24/7)</span>
              </div>
              <p className={`text-xs mt-1 ${form.urgency === "emergency" ? "text-white/90" : "text-slate-muted"}`}>
                Immediate top-of-queue priority alert with direct worker bonus.
              </p>
            </button>
          </div>

          {form.urgency === "emergency" && (
            <div className="animate-slide-up rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between font-bold">
                <span>⚡ Priority Fast-Dispatch Surge</span>
                <span className="rounded bg-red-200 text-red-950 px-2 py-0.5 text-xs font-bold">
                  +₹{Math.max(200, Math.round((Number(form.amount) || 500) * 0.25))}
                </span>
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                Emergency gigs are pinned at the top of worker dashboards with loud alerts. Responding pros receive an emergency surge payout.
              </p>
              <div className="pt-2 flex justify-between items-center border-t border-red-200 font-semibold text-xs">
                <span>Total Invoice:</span>
                <span className="text-sm font-extrabold text-red-950">
                  ₹{(Number(form.amount) || 500) + Math.max(200, Math.round((Number(form.amount) || 500) * 0.25))}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-800 font-bold bg-red-100 p-3 rounded-xl">{error}</p>}

        <button
          disabled={submitting}
          className="btn-press btn-glow min-h-12 w-full rounded-xl bg-gradient-to-r from-forest to-[#3a7a5f] text-[#F3EFE6] text-base font-bold shadow-lg hover:from-[#234d3b] hover:to-[#2C5F4A] transition-all"
        >
          {submitting ? "Finding Best Matches…" : `🚀 ${t("gig.submit")} & Match Pros`}
        </button>
      </form>

      {/* ─── Recent Bookings Card ─── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-teal-ink flex items-center gap-2">
          <span>🕒</span> {t("gig.shortcuts")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mine.slice(0, 6).map((g) => (
            <Link
              key={g._id}
              to={`/gigs/${g._id}`}
              className="card-hover-subtle block rounded-xl border border-[#d9d2c3] bg-[#eee9dd] p-3.5 hover:bg-[#e4ded0] transition-colors shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-teal-ink truncate">{g.title}</span>
                <span className="text-[11px] uppercase font-bold text-forest rounded-full bg-[#d7e3dc] px-2.5 py-0.5 shrink-0">
                  {g.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-muted">
                <span>₹{g.amount} · <span className="capitalize">{g.category}</span></span>
                {g.location && <span className="truncate max-w-[140px]">📍 {g.location}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

