import { languageAtom, themeAtom, type Theme } from "@/stores/settings";
import { useAtom } from "jotai";
import { Sun, Moon, Monitor, Languages, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

function SettingsBar() {
  const [language, setLanguage] = useAtom(languageAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const { t, i18n } = useTranslation();

  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const langRef = useRef<HTMLDetailsElement>(null);
  const themeRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
      if (
        themeRef.current &&
        !themeRef.current.contains(event.target as Node)
      ) {
        setThemeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (newLang: "zh" | "en") => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    setLangOpen(false);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Language Switcher */}
      <details
        className="dropdown dropdown-end"
        ref={langRef}
        open={langOpen}
        onToggle={(e) => setLangOpen(e.currentTarget.open)}
      >
        <summary className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200 hover:text-base-content h-9 gap-2 rounded-full px-3 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <Languages className="h-4 w-4" />
          <span className="text-sm">{language === "zh" ? "中文" : "EN"}</span>
        </summary>
        <ul className="dropdown-content menu rounded-box border-base-200 bg-base-100 z-50 mt-1 min-w-30 border p-2 shadow-sm">
          <li>
            <a
              onClick={() => {
                handleLanguageChange("zh");
              }}
              className="flex items-center justify-between"
            >
              <span>中文</span>
              {language === "zh" && <Check className="text-primary h-4 w-4" />}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                handleLanguageChange("en");
              }}
              className="flex items-center justify-between"
            >
              <span>English</span>
              {language === "en" && <Check className="text-primary h-4 w-4" />}
            </a>
          </li>
        </ul>
      </details>

      {/* Theme Switcher */}
      <details
        className="dropdown dropdown-end"
        ref={themeRef}
        open={themeOpen}
        onToggle={(e) => setThemeOpen(e.currentTarget.open)}
      >
        <summary className="btn btn-ghost btn-sm text-base-content/70 hover:bg-base-200 hover:text-base-content h-9 w-9 rounded-full p-0 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          {getThemeIcon()}
        </summary>
        <ul className="dropdown-content menu rounded-box border-base-200 bg-base-100 z-50 mt-1 min-w-35 border p-2 shadow-sm">
          <li>
            <a
              onClick={() => {
                handleThemeChange("light");
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <span>{t("theme.light")}</span>
              </div>
              {theme === "light" && <Check className="text-primary h-4 w-4" />}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                handleThemeChange("dark");
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span>{t("theme.dark")}</span>
              </div>
              {theme === "dark" && <Check className="text-primary h-4 w-4" />}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                handleThemeChange("system");
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>{t("theme.system")}</span>
              </div>
              {theme === "system" && <Check className="text-primary h-4 w-4" />}
            </a>
          </li>
        </ul>
      </details>
    </div>
  );
}

export default SettingsBar;
