import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authApi, CATEGORIES } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MapPicker from "../components/MapPicker.jsx";

export default function WorkerProfile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [skills, setSkills] = useState([]);
  const [phone, setPhone] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [pin, setPin] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    setSkills(user.skills || []);
    setPhone(user.phone || "");
    setIsAvailable(user.isAvailable !== false);
    if (user.latitude != null && user.longitude != null) {
      setPin({ lat: user.latitude, lng: user.longitude });
    }
  }, [user]);

  function toggleSkill(s) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function save(e) {
    e.preventDefault();
    const res = await authApi.patchMe({
      skills,
      phone,
      isAvailable,
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null
    });
    setUser(res.user);
    setMsg("Saved");
  }

  const status = user?.verificationStatus || (user?.isVerified ? "verified" : "pending");

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("nav.profile")}</h1>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d7e3dc] text-xl text-forest">
        {(user?.name || "?").slice(0, 1)}
      </div>
      <p className="text-sm">
        {t("profile.rating")}: {user?.rating || 0} ({user?.ratingCount || 0})
      </p>
      <p className="text-sm">
        {status === "verified" ? t("profile.verified") : status === "rejected" ? t("profile.rejected") : t("profile.pending")}
      </p>
      <fieldset>
        <legend className="text-sm">{t("profile.skills")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c !== "general").map((s) => (
            <button type="button" key={s} onClick={() => toggleSkill(s)} className={`min-h-9 rounded-card px-3 text-sm ${skills.includes(s) ? "bg-forest text-[#F3EFE6]" : "border border-[#cfc8b8]"}`}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
        {t("profile.availability")}
      </label>
      <label className="block text-sm">
        {t("profile.phone")}
        <input className="mt-1 min-h-11 w-full rounded-card border border-[#cfc8b8] bg-[#eee9dd] px-3" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <p className="text-sm">{t("profile.setLocation")}</p>
      <MapPicker value={pin} onChange={setPin} />
      <button type="button" className="min-h-10 rounded-card border border-[#cfc8b8] px-3 text-sm" onClick={() => navigator.geolocation.getCurrentPosition((p) => setPin({ lat: p.coords.latitude, lng: p.coords.longitude }))}>
        {t("gig.useMyLocation")}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
      <button className="min-h-11 rounded-card bg-forest px-4 text-[#F3EFE6]">{t("profile.save")}</button>
    </form>
  );
}
