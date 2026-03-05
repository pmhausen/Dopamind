import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "../services/api";

const SettingsContext = createContext();
const STORAGE_KEY = "dopamind-settings";

const defaultSettings = {
  imap: { host: "", port: 993, user: "", password: "", tls: true },
  smtp: { host: "", port: 587, user: "", password: "", tls: true },
  caldav: { url: "", user: "", password: "", calendarUrl: "" },
  assistanceWindow: {
    start: "08:00",
    end: "17:00",
    activeDays: [1, 2, 3, 4, 5],
  },
  gamification: {
    xpEnabled: true,
    soundEnabled: false,
    compassionModeEnabled: true,
    microConfettiEnabled: true,
    variableRewardsEnabled: true,
    flowShieldEnabled: true,
    countdownStartEnabled: true,
    energyCheckinEnabled: true,
    dailyChallengeEnabled: true,
    pauseSuggestionsEnabled: true,
    weeklyReportEnabled: true,
  },
  notifications: { enabled: true, focusReminder: true },
  mail: { masterTagEnabled: false, masterTag: "dopamind" },
  features: {
    mailEnabled: true,
    calendarEnabled: true,
    resourceMonitorEnabled: true,
    gamificationEnabled: true,
  },
  timeWarnings: {
    enabled: true,
    moderateThreshold1: 60,
    moderateThreshold2: 30,
    criticalThreshold1: 15,
    criticalThreshold2: 0,
  },
  timeline: {
    gridInterval: 30, // 15 | 30 | 60
    hideParentWithSubtasks: false,
    taskSchedulingRound: "halfHour", // "halfHour" | "fullHour" | "custom"
    taskSchedulingCustomMinutes: 30,
    timeRangeMode: "workHours", // "workHours" | "fullDay" | "custom"
    customTimeStart: "06:00",
    customTimeEnd: "22:00",
  },
  estimation: {
    sizeMappings: { quick: 10, short: 25, medium: 45, long: 90 },
    autopilot: false,
  },
  timezone: "auto",
};

// Migrate old workSchedule → assistanceWindow
function migrateSettings(s) {
  if (s.workSchedule && !s.assistanceWindow) {
    s.assistanceWindow = {
      start: s.workSchedule.start || defaultSettings.assistanceWindow.start,
      end: s.workSchedule.end || defaultSettings.assistanceWindow.end,
      activeDays: s.workSchedule.workDays || defaultSettings.assistanceWindow.activeDays,
    };
  }
  // Clean up legacy breakPattern if it exists in stored settings
  if (s.breakPattern) {
    delete s.breakPattern;
  }
  // Migrate old feature toggle
  if (s.features && s.features.timeTrackingEnabled !== undefined && s.features.resourceMonitorEnabled === undefined) {
    s.features.resourceMonitorEnabled = s.features.timeTrackingEnabled;
  }
  // Backward-compat: keep workSchedule as computed alias so existing consumers don't break during transition
  if (s.assistanceWindow && !s.workSchedule) {
    s.workSchedule = {
      start: s.assistanceWindow.start,
      end: s.assistanceWindow.end,
      workDays: s.assistanceWindow.activeDays,
    };
  } else if (s.assistanceWindow && s.workSchedule) {
    s.workSchedule.start = s.assistanceWindow.start;
    s.workSchedule.end = s.assistanceWindow.end;
    s.workSchedule.workDays = s.assistanceWindow.activeDays;
    delete s.workSchedule.breakMinutes;
  }
  // Backward-compat: keep timeTrackingEnabled alias
  if (s.features) {
    s.features.timeTrackingEnabled = s.features.resourceMonitorEnabled;
  }
  return s;
}

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
      if (saved) return migrateSettings(deepMerge(defaultSettings, JSON.parse(saved)));
    } catch {}
    return migrateSettings({ ...defaultSettings });
  });
  const saveTimer = useRef(null);
  const didLoad = useRef(false);

  // Load settings from backend on mount
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    const token = localStorage.getItem("dopamind-token");
    if (!token) return;
    apiFetch("/user-data/settings")
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          const merged = migrateSettings(deepMerge(defaultSettings, res.data));
          setSettings(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      })
      .catch(() => {});
  }, []);

  const persistToBackend = useCallback((data) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const token = localStorage.getItem("dopamind-token");
      if (!token) return;
      apiFetch("/user-data/settings", {
        method: "PUT",
        body: JSON.stringify({ data }),
      }).catch(() => {});
    }, 500);
  }, []);

  const updateSettings = useCallback((section, values) => {
    setSettings((prev) => {
      const next = typeof values === "object" && values !== null
        ? { ...prev, [section]: { ...prev[section], ...values } }
        : { ...prev, [section]: values };
      const migrated = migrateSettings(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      persistToBackend(migrated);
      return migrated;
    });
  }, [persistToBackend]);

  const isMailConfigured = Boolean(settings.imap.host && settings.imap.user);
  const isCalendarConfigured = Boolean(settings.caldav.url && settings.caldav.user);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isMailConfigured, isCalendarConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
