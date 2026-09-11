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
    location: "",
    urgency: "normal"
  });
  const [pin, setPin] = useState(null);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    gigsApi.mine().then((r) => setMine(r.data || [])).catch(() => {});
  }, []);

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Location permission denied")
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = {
        ...form,
        amount: Number(form.amount),
        latitude: pin?.lat,
        longitude: pin?.lng
      };
      const res = await gigsApi.create(body);
      const gig = res.data;
      sessionStorage.setItem("lastGigId", gig._id);
      navigate("/matches", { state: { gigId: gig._id, latitude: pin?.lat, longitude: pin?.lng, category: form.category, urgency: form.urgency } });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
        <h1 className="text-xl font-semibold">{t("gig.post")}</h1>
        <label className="block text-sm">
          {t("gig.serviceType")}
          <select className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {t("gig.title")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label className="block text-sm">
          {t("gig.description")}
          <textarea className="mt-1 min-h-24 w-full rounded-card border border-[#cfc8b8] bg-page px-3 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </label>
        <label className="block text-sm">
          {t("gig.amount")}
          <input type="number" min="1" className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <label className="block text-sm">
          {t("gig.locationLabel")}
          <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <p className="text-xs text-slate-muted">{t("gig.mapHint")}</p>
        <MapPicker value={pin} onChange={setPin} />
        <button type="button" onClick={useMyLocation} className="min-h-10 rounded-card border border-[#cfc8b8] px-3 text-sm">
          {t("gig.useMyLocation")}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t("gig.urgency")}</span>
          <button type="button" onClick={() => setForm({ ...form, urgency: form.urgency === "emergency" ? "normal" : "emergency" })} className="min-h-10 rounded-card border border-[#cfc8b8] px-3 text-sm">
            {form.urgency === "emergency" ? t("gig.emergency") : t("gig.normal")}
          </button>
          {form.urgency === "emergency" && (
            <span className="rounded-card bg-[#d7e3dc] px-2 py-1 text-xs text-forest">{t("gig.emergencyBadge")}</span>
          )}
        </div>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <button className="min-h-11 w-full rounded-card bg-forest text-[#F3EFE6]">{t("gig.submit")}</button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold">{t("gig.shortcuts")}</h2>
        <ul className="space-y-2">
          {mine.slice(0, 6).map((g) => (
            <li key={g._id}>
              <Link to={`/gigs/${g._id}`} className="block rounded-card border border-[#d9d2c3] bg-[#eee9dd] px-3 py-2">
                <span className="font-medium">{g.title}</span>
                <span className="ml-2 text-xs text-slate-muted">{g.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
