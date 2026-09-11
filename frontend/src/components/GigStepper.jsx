import { useTranslation } from "react-i18next";

const STEPS = ["pending", "accepted", "in-progress", "completed"];

export default function GigStepper({ status }) {
  const { t } = useTranslation();
  const idx = STEPS.indexOf(status);
  const labels = {
    pending: t("gig.pending"),
    accepted: t("gig.accepted"),
    "in-progress": t("gig.inProgress"),
    completed: t("gig.completed")
  };

  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`min-h-8 rounded-card px-3 py-1 text-sm ${
            i <= idx && idx >= 0
              ? "bg-[#d7e3dc] text-forest"
              : "bg-[#ebe6da] text-slate-muted"
          }`}
        >
          {labels[s]}
        </li>
      ))}
    </ol>
  );
}
