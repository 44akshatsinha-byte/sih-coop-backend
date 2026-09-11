import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";

const saved = typeof localStorage !== "undefined" ? localStorage.getItem("coop_lang") : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi }
  },
  lng: saved === "hi" ? "hi" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("coop_lang", lng);
  document.documentElement.lang = lng;
});

export default i18n;
