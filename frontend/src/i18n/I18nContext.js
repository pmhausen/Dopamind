import { createContext, useContext, useState, useCallback } from "react";
import de from "./de.json";
import en from "./en.json";

const I18nContext = createContext();

const locales = { de, en };
const STORAGE_KEY = "dopamind-lang";

function resolve(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales[saved]) return saved;
    const browserLang = navigator.language?.slice(0, 2);
    return locales[browserLang] ? browserLang : "de";
  });

  const t = useCallback(
    (key, params) => {
      let value = resolve(locales[lang], key) ?? resolve(locales.de, key) ?? key;
      if (typeof value === "string" && params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        });
      }
      return value;
    },
    [lang]
  );

  const switchLang = useCallback((newLang) => {
    if (locales[newLang]) {
      setLang(newLang);
      localStorage.setItem(STORAGE_KEY, newLang);
    }
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, switchLang, availableLanguages: Object.keys(locales) }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
