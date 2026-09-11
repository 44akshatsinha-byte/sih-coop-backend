import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../api/client.js";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const [msg, setMsg] = useState("");

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
          setMsg("Photo updated!");
        } catch (err) {
          setMsg(err.message || "Failed to update photo");
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
      setMsg("Photo removed");
    } catch (err) {
      setMsg(err.message || "Failed to remove photo");
    }
  }

  return (
    <div className="space-y-4 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
      <h1 className="text-xl font-semibold">{t("nav.account")}</h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#cfc8b8] bg-[#d7e3dc] text-2xl font-bold text-forest shadow-sm">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <span>{(user?.name || "?").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-base">{user?.name}</p>
            <p className="text-xs text-slate-muted">{user?.email} · <span className="uppercase font-medium text-forest">{user?.role}</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer inline-flex min-h-9 items-center justify-center rounded-card bg-forest px-3 text-xs font-medium text-[#F3EFE6] hover:bg-[#234d3b] transition-colors shadow-sm">
              <span>{user?.avatar ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
            {user?.avatar && (
              <button
                type="button"
                onClick={removePhoto}
                className="min-h-9 rounded-card border border-[#cfc8b8] bg-[#F3EFE6] px-3 text-xs font-medium text-[#8b3a3a] hover:bg-[#ebdada]"
              >
                {t("profile.removePhoto")}
              </button>
            )}
          </div>
        </div>
      </div>

      {msg && <p className="text-xs text-forest">{msg}</p>}

      <div className="pt-2 border-t border-[#d9d2c3]">
        <button onClick={logout} className="min-h-11 rounded-card border border-[#cfc8b8] bg-[#F3EFE6] px-4 text-sm font-medium text-[#8b3a3a] hover:bg-[#ebdada]">
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
