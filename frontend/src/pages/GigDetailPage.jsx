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
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await gigsApi.get(id);
    setGig(res.data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);

  if (!gig) return <p>{t("common.loading")}</p>;

  const isWorker = user?.role === "worker";
  const isCustomer = user?.role === "customer" || user?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-xl font-semibold">{gig.title}</h1>
        {gig.urgency === "emergency" && (
          <span className="rounded-card bg-[#d7e3dc] px-2 py-1 text-xs text-forest">{t("gig.emergencyBadge")}</span>
        )}
      </div>
      <p className="text-sm">{gig.description}</p>
      <p className="text-sm">₹{gig.amount} · {gig.category}</p>
      <GigStepper status={gig.status} />
      {error && <p className="text-sm text-red-800">{error}</p>}

      {isWorker && gig.status === "accepted" && (
        <button className="min-h-11 rounded-card bg-forest px-4 text-[#F3EFE6]" onClick={() => gigsApi.start(id).then(load).catch((e) => setError(e.message))}>
          {t("gig.start")}
        </button>
      )}
      {(isWorker || isCustomer) && (gig.status === "accepted" || gig.status === "in-progress") && (
        <button className="min-h-11 rounded-card border border-[#cfc8b8] px-4" onClick={() => gigsApi.complete(id).then(load).catch((e) => setError(e.message))}>
          {t("gig.complete")}
        </button>
      )}
      {isCustomer && gig.status === "completed" && (
        <button className="min-h-11 rounded-card bg-forest px-4 text-[#F3EFE6]" onClick={() => setPayOpen(true)}>
          {t("gig.pay")}
        </button>
      )}
      {isCustomer && gig.status === "completed" && !gig.review?.rating && (
        <form
          className="space-y-2 rounded-panel border border-[#d9d2c3] bg-[#eee9dd] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            gigsApi.review(id, { rating: Number(rating), text }).then(load).catch((err) => setError(err.message));
          }}
        >
          <h2 className="font-semibold">{t("gig.review")}</h2>
          <select className="min-h-11 w-full rounded-card border border-[#cfc8b8] bg-page px-3" value={rating} onChange={(e) => setRating(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <textarea className="min-h-20 w-full rounded-card border border-[#cfc8b8] bg-page px-3 py-2" placeholder={t("gig.reviewText")} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="min-h-11 rounded-card bg-forest px-4 text-[#F3EFE6]">{t("gig.submitReview")}</button>
        </form>
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
