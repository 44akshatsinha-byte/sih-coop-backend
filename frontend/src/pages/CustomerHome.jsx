import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CATEGORIES, gigsApi } from "../api/client.js";
import MapPicker from "../components/MapPicker.jsx";

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

        // Reverse geocoding to auto-suggest area name if blank
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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4 sm:p-5">
        <h1 className="text-xl font-semibold">{t("gig.post")}</h1>

        {/* Category & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            {t("gig.serviceType")}
            <select
              className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            {t("gig.amount")}
            <input
              type="number"
              min="1"
              className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
        </div>

        <label className="block text-sm">
          {t("gig.title")}
          <input
            className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3"
            placeholder="e.g. Fix leaking kitchen sink"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>

        {/* Description & Optional Photos */}
        <div className="space-y-2">
          <label className="block text-sm">
            {t("gig.description")}
            <textarea
              className="mt-1 min-h-24 w-full rounded-card border border-[#cfc8b8] bg-page px-3 py-2"
              placeholder="Describe what needs to be done, specific requirements, tools needed..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </label>

          {/* Photo Upload Section */}
          <div className="rounded-card border border-[#cfc8b8] bg-[#e7e1d3] p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-teal-ink">{t("gig.addPhotos")}</p>
                <p className="text-[11px] text-slate-muted">{t("gig.photoHint")}</p>
              </div>
              <label className="cursor-pointer inline-flex min-h-9 items-center justify-center rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6] hover:bg-[#234d3b] transition-colors shadow-sm">
                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Upload Photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-card border border-[#cfc8b8] shadow-sm">
                    <img src={imgUrl} alt={`Uploaded ${idx}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      title="Remove"
                      className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location, Address, Landmarks Section */}
        <fieldset className="space-y-3 rounded-card border border-[#cfc8b8] bg-[#e7e1d3] p-3.5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-forest">
            Work Location & Address
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs">
              {t("gig.address")}
              <input
                className="mt-1 min-h-10 w-full rounded-card border border-[#cfc8b8] bg-page px-3 text-sm"
                placeholder="e.g. Flat 301, Sunshine Heights, 12th Main"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <label className="block text-xs">
              {t("gig.landmark")}
              <input
                className="mt-1 min-h-10 w-full rounded-card border border-[#cfc8b8] bg-page px-3 text-sm"
                placeholder="e.g. Opposite City Hospital / Near Metro Gate 2"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-xs">
            {t("gig.cityArea")}
            <input
              className="mt-1 min-h-10 w-full rounded-card border border-[#cfc8b8] bg-page px-3 text-sm"
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
                className="inline-flex min-h-9 items-center gap-1.5 rounded-card border border-[#cfc8b8] bg-page px-3 text-xs font-medium hover:bg-[#d7e3dc] transition-colors"
              >
                <svg className="h-3.5 w-3.5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{locating ? "Locating…" : t("gig.useMyLocation")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-card border px-3 text-xs font-medium transition-colors ${
                  showMap
                    ? "border-forest bg-forest text-[#F3EFE6]"
                    : "border-[#cfc8b8] bg-page hover:bg-[#d7e3dc]"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>{showMap ? t("gig.hideMap") : t("gig.chooseOnMap")}</span>
              </button>
            </div>

            {pin && (
              <div className="flex items-center gap-1.5 text-xs text-forest font-medium">
                <span>📍 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span>
                <button
                  type="button"
                  onClick={() => setPin(null)}
                  className="text-[11px] text-[#8b3a3a] underline hover:no-underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {locMsg && <p className="text-xs text-forest">{locMsg}</p>}

          {/* Collapsible Interactive Map */}
          {showMap && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-muted">{t("gig.mapHint")}</p>
              <MapPicker value={pin} onChange={setPin} height="16rem" />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMap(false)}
                  className="min-h-8 rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6]"
                >
                  {t("gig.hideMap")}
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {/* Urgency Selection */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t("gig.urgency")}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, urgency: form.urgency === "emergency" ? "normal" : "emergency" })}
              className={`min-h-10 rounded-card border px-3.5 text-sm font-medium transition-all ${
                form.urgency === "emergency"
                  ? "border-red-600 bg-red-600 text-white shadow-sm"
                  : "border-[#cfc8b8] bg-page hover:bg-[#d7e3dc]"
              }`}
            >
              {form.urgency === "emergency" ? "🚨 Emergency Priority" : "🟢 Standard (Normal)"}
            </button>
          </div>

          {form.urgency === "emergency" && (
            <div className="rounded-card border border-red-300 bg-red-50 p-3 text-xs text-red-900 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">🚨 Priority Fast-Dispatch</span>
                <span className="rounded bg-red-200 text-red-950 px-2 py-0.5 text-[11px] font-bold">
                  +₹{Math.max(200, Math.round((Number(form.amount) || 500) * 0.25))} Priority Surge
                </span>
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                Emergency jobs are pinned to the top of worker job boards with immediate alerts. Responding workers receive a higher payout bonus directly for rapid response.
              </p>
              <div className="pt-1.5 flex justify-between border-t border-red-200 font-medium text-xs">
                <span>Estimated Total:</span>
                <span>
                  ₹{Number(form.amount) || 500} Base + ₹{Math.max(200, Math.round((Number(form.amount) || 500) * 0.25))} Surge ={" "}
                  <strong className="font-bold text-red-950 text-sm">
                    ₹{(Number(form.amount) || 500) + Math.max(200, Math.round((Number(form.amount) || 500) * 0.25))}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-800">{error}</p>}

        <button
          disabled={submitting}
          className="min-h-11 w-full rounded-card bg-forest text-[#F3EFE6] font-medium shadow hover:bg-[#234d3b] transition-colors"
        >
          {submitting ? "Posting gig…" : t("gig.submit")}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold">{t("gig.shortcuts")}</h2>
        <ul className="space-y-2">
          {mine.slice(0, 6).map((g) => (
            <li key={g._id}>
              <Link to={`/gigs/${g._id}`} className="block rounded-card border border-[#d9d2c3] bg-[#eee9dd] px-3 py-2 hover:bg-[#e4ded0] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-xs uppercase font-semibold text-forest rounded bg-[#d7e3dc] px-2 py-0.5">
                    {g.status}
                  </span>
                </div>
                {g.location && <p className="text-xs text-slate-muted mt-0.5">📍 {g.location}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
