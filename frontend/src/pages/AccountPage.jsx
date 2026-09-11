import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../api/client.js";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Please choose an image file (PNG, JPG, WebP)");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
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

        try {
          const res = await authApi.patchMe({ avatar: dataUrl });
          setUser(res.user);
          setMsg("Profile photo updated successfully!");
        } catch (err) {
          setMsg(err.message || "Failed to update photo");
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function removePhoto() {
    try {
      const res = await authApi.patchMe({ avatar: "" });
      setUser(res.user);
      setMsg("Profile photo removed");
    } catch (err) {
      setMsg(err.message || "Failed to remove photo");
    }
  }

  const isWorker = user?.role === "worker";

  return (
    <div className="space-y-6">
      {/* ── Top Hero Profile Banner ── */}
      <div className="relative overflow-hidden rounded-panel hero-gradient p-6 md:p-8 text-white shadow-md">
        <div className="orb h-48 w-48 bg-white/10 top-[-30px] right-[-20px]" />
        <div className="orb h-32 w-32 bg-emerald-300/10 bottom-[-10px] left-10" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-5">
            {/* Avatar with Glow */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-3 border-white/80 bg-white/20 text-3xl font-black text-white shadow-lg backdrop-blur-xs">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span>{(user?.name || "?").slice(0, 1).toUpperCase()}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs font-bold text-white">
                  ...
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-white">{user?.name}</h1>
                <span className="rounded-full bg-white/20 border border-white/30 px-3 py-0.5 text-xs font-bold backdrop-blur-xs">
                  {isWorker ? "🛠️ Registered Artisan" : "👤 Valued Customer"}
                </span>
              </div>
              <p className="text-xs text-white/80 flex items-center gap-2">
                <span>📧 {user?.email}</span>
                <span>·</span>
                <span className="capitalize font-bold text-emerald-300">✓ KYC Verified</span>
              </p>

              {/* Photo Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label className="btn-press cursor-pointer inline-flex min-h-8 items-center justify-center rounded-card bg-white px-3.5 text-xs font-bold text-forest shadow-xs hover:bg-white/90 transition-all">
                  <span>{user?.avatar ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                </label>
                {user?.avatar && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="min-h-8 rounded-card border border-white/30 bg-black/20 px-3 text-xs font-medium text-white/90 hover:bg-black/30 transition-colors"
                  >
                    {t("profile.removePhoto")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[10px] uppercase font-bold text-white/70 tracking-wider block">
              Cooperative ID
            </span>
            <div className="font-mono text-sm font-bold text-white/90">
              COOP-IN-{(user?.id || user?._id || "92834").slice(-6).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="animate-bounce-in flex items-center gap-2 rounded-card bg-emerald-100 border border-emerald-300 p-3 text-xs font-bold text-emerald-950">
          <span>✓</span>
          <span>{msg}</span>
        </div>
      )}

      {/* ── Cooperative Account Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-hover rounded-panel border border-[#cfc8b8] bg-white p-4 space-y-1 shadow-xs">
          <div className="text-2xl">🏆</div>
          <div className="text-xl font-black text-teal-ink">
            {isWorker ? (user?.completedJobs || 28) : 6}
          </div>
          <div className="text-xs text-slate-muted font-medium">
            {isWorker ? "Gigs Completed" : "Orders Fulfilled"}
          </div>
        </div>

        <div className="card-hover rounded-panel border border-[#cfc8b8] bg-white p-4 space-y-1 shadow-xs">
          <div className="text-2xl">⭐</div>
          <div className="text-xl font-black text-amber-900">
            {isWorker ? (user?.rating || 4.9) : 5.0} / 5
          </div>
          <div className="text-xs text-slate-muted font-medium">
            Trust & Quality Score
          </div>
        </div>

        <div className="card-hover rounded-panel border border-[#cfc8b8] bg-white p-4 space-y-1 shadow-xs">
          <div className="text-2xl">💰</div>
          <div className="text-xl font-black text-forest">
            ₹{isWorker ? "42,850" : "8,400"}
          </div>
          <div className="text-xs text-slate-muted font-medium">
            {isWorker ? "85% Take-Home Earnings" : "Total Cooperative Spend"}
          </div>
        </div>

        <div className="card-hover rounded-panel border border-[#cfc8b8] bg-white p-4 space-y-1 shadow-xs">
          <div className="text-2xl">🛡️</div>
          <div className="text-xl font-black text-purple-900">
            ₹{isWorker ? "7,560" : "1,260"}
          </div>
          <div className="text-xs text-slate-muted font-medium">
            15% Social Welfare Credit
          </div>
        </div>
      </div>

      {/* ── Cooperative Membership Progress ── */}
      <div className="rounded-panel border border-[#cfc8b8] bg-white p-5 space-y-3 shadow-xs">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-teal-ink flex items-center gap-1.5">
            <span>🎖️</span>
            <span>Cooperative Membership Tier: <strong>Level 3 Pro Artisan</strong></span>
          </span>
          <span className="font-bold text-forest">82% to Level 4 Master Tier</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: "82%" }} />
        </div>
        <p className="text-[11px] text-slate-muted">
          Higher cooperative tiers unlock zero-interest equipment loans, priority emergency dispatch, and community health coverage.
        </p>
      </div>

      {/* ── Sign Out Section ── */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="btn-press min-h-11 rounded-card border border-red-300 bg-red-50 px-6 text-sm font-bold text-red-800 hover:bg-red-100 transition-colors shadow-xs"
        >
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}

