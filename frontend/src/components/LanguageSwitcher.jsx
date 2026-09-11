import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const lng = i18n.language.startsWith("hi") ? "hi" : "en";

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-card border border-[#cfc8b8] bg-[#ebe6da] px-1 py-0.5 text-xs">
      {["en", "hi"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={`min-h-7 min-w-[2.5rem] rounded-md px-2 py-1 ${
            lng === code ? "bg-forest text-[#F3EFE6]" : "text-teal-ink"
          }`}
        >
          {code === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
