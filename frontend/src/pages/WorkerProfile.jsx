import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authApi, CATEGORIES } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MapPicker from "../components/MapPicker.jsx";

export default function WorkerProfile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [avatar, setAvatar] = useState("");
  const [skills, setSkills] = useState([]);
  const [phone, setPhone] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [pin, setPin] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAvatar(user.avatar || "");
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

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Please choose an image file (PNG, JPG, WebP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatar(dataUrl);
        setMsg("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await authApi.patchMe({
        avatar,
        skills,
        phone,
        isAvailable,
        latitude: pin?.lat ?? null,
        longitude: pin?.lng ?? null
      });
      setUser(res.user);
      setMsg("Profile saved successfully!");
    } catch (err) {
      setMsg(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  const status = user?.verificationStatus || (user?.isVerified ? "verified" : "pending");

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-xl font-semibold">{t("nav.profile")}</h1>

      {/* Photo Upload Section */}
      <div className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
        <label className="block text-sm font-medium mb-2">{t("profile.photo")}</label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#cfc8b8] bg-[#d7e3dc] text-2xl font-bold text-forest shadow-sm">
            {avatar ? (
              <img src={avatar} alt={user?.name || "Worker"} className="h-full w-full object-cover" />
            ) : (
              <span>{(user?.name || "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer inline-flex min-h-9 items-center justify-center rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6] hover:bg-[#234d3b] transition-colors shadow-sm">
                <span>{avatar ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </label>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className="min-h-9 rounded-card border border-[#cfc8b8] bg-[#F3EFE6] px-3 text-xs font-medium text-[#8b3a3a] hover:bg-[#ebdada]"
                >
                  {t("profile.removePhoto")}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-muted">JPG, PNG or WebP · Max 2MB</p>
          </div>
        </div>
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
