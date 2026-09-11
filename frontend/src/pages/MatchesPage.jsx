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
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);

  const gigId = loc.state?.gigId || sessionStorage.getItem("lastGigId");

  useEffect(() => {
    if (!gigId) return;
    const body = {
      gigId,
      latitude: loc.state?.latitude,
      longitude: loc.state?.longitude,
      category: loc.state?.category,
      urgency: loc.state?.urgency,
      limit: 5
    };
    matchApi
      .rank(body)
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.message));
  }, [gigId, loc.state]);

  async function book(workerId) {
    setBooking(true);
    setError("");
    try {
      await gigsApi.assign(gigId, workerId);
      navigate(`/gigs/${gigId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBooking(false);
    }
  }

  if (!gigId) {
    return <p className="text-sm text-slate-muted">{t("gig.noMatches")}</p>;
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t("nav.matches")}</h1>
      {error && <p className="text-sm text-red-800">{error}</p>}
      {rows.map((row) => (
          <article key={row.workerId || row.rank} className="rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d7e3dc] text-forest">
                {(row.name || "?").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{row.name}</h2>
                  {row.isVerified && <span className="text-xs text-forest">{t("profile.verified")}</span>}
                </div>
                <p className="text-xs text-slate-muted">{(row.skills || []).join(", ")}</p>
                <p className="mt-1 text-sm">
                  {row.distanceKm != null ? `${Number(row.distanceKm).toFixed(1)} ${t("gig.km")}` : ""} · {row.rating || 0} {t("gig.stars")} ({row.ratingCount || 0}) ·{" "}
                  {row.isAvailable ? t("gig.available") : t("gig.unavailable")}
                </p>
                <p className="mt-1 text-xs text-teal-ink">
                  {t("gig.why")}: {whyLine(row.breakdown)}
                </p>
              </div>
            </div>
            <button
              disabled={booking}
              onClick={() => book(row.workerId)}
              className="mt-3 min-h-10 rounded-card bg-forest px-4 text-[#F3EFE6]"
            >
              {t("gig.book")}
            </button>
          </article>
        ))}
    </div>
  );
}
