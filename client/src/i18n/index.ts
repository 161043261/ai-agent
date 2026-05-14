import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

function getSavedLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved && ["zh", "en"].includes(saved)) {
    return saved;
  }
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("zh") ? "zh" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getSavedLanguage(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});
