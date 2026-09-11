import { useState } from "react";
import { useTranslation } from "react-i18next";
import { paymentsApi } from "../api/client.js";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(s);
  });
}

export default function PaymentSheet({ open, amountInr, gigId, onClose, onVerified }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await loadRazorpay();
      const cfg = await paymentsApi.config();
      const created = await paymentsApi.createOrder({
        amount: Number(amountInr),
        currency: "INR",
        notes: { gigId: gigId || "" }
      });
      const order = created.order;
      const rzp = new window.Razorpay({
        key: cfg.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Co-op Gigs",
        theme: { color: "#2C5F4A" },
        handler: async (response) => {
          await paymentsApi.verify(response);
          onVerified?.(response);
          onClose();
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      rzp.open();
    } catch (e) {
      setError(e.message || t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#3A5F5F]/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-panel border border-[#cfc8b8] bg-[#F3EFE6] p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-teal-ink">{t("pay.title")}</h2>
        <p className="mt-2 text-sm text-slate-muted">
          {t("pay.amount")}: ₹{Number(amountInr).toFixed(0)}
        </p>
        {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={pay}
            className="min-h-11 flex-1 rounded-card bg-forest px-4 py-2 text-[#F3EFE6]"
          >
            {t("pay.continue")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-card border border-[#cfc8b8] px-4 py-2 text-teal-ink"
          >
            {t("pay.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
