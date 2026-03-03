import { createContext, useContext, useState, useCallback } from "react";

const SettingsContext = createContext();
const STORAGE_KEY = "dopamind-settings";

const defaultSettings = {
  imap: { host: "", port: 993, user: "", password: "", tls: true },
  smtp: { host: "", port: 587, user: "", password: "", tls: true },
  caldav: { url: "", user: "", password: "", calendarUrl: "" },
  workSchedule: {
    start: "08:00",
    end: "17:00",
    breakMinutes: 60,
    workDays: [1, 2, 3, 4, 5],
  },
  gamification: { xpEnabled: true, soundEnabled: false },
  notifications: { enabled: true, focusReminder: true },
  mail: { masterTagEnabled: false, masterTag: "dopamind" },
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return deepMerge(defaultSettings, JSON.parse(saved));
    } catch {}
    return defaultSettings;
  });

  const updateSettings = useCallback((section, values) => {
    setSettings((prev) => {
      const next = { ...prev, [section]: { ...prev[section], ...values } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isMailConfigured = Boolean(settings.imap.host && settings.imap.user);
  const isCalendarConfigured = Boolean(settings.caldav.url && settings.caldav.user);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isMailConfigured, isCalendarConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
