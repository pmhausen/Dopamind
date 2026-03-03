import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { discoverCalendars } from "../services/calendarService";
import { Check, Sun, Moon, Monitor, Globe, Filter, Search, Loader2 } from "lucide-react";

function Section({ title, children }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label className="text-sm font-medium min-w-[140px]">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
      {...props}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full flex items-center transition-colors duration-200 ${
          checked ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function CalDavSection({ t, settings, updateSettings }) {
  const [calendars, setCalendars] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState(null);

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const result = await discoverCalendars();
      setCalendars(result);
      if (result.length === 0) setDiscoverError(t("settings.caldavNoCalendars"));
    } catch (err) {
      setDiscoverError(err.message);
    } finally {
      setDiscovering(false);
    }
  };

  const canDiscover = settings.caldav.url && settings.caldav.user && settings.caldav.password;

  return (
    <Section title={t("settings.caldav")}>
      <Field label={t("settings.caldavUrl")}>
        <Input
          value={settings.caldav.url}
          onChange={(v) => updateSettings("caldav", { url: v })}
          placeholder={t("settings.caldavUrlHint")}
        />
      </Field>
      <Field label={t("settings.caldavUser")}>
        <Input
          value={settings.caldav.user}
          onChange={(v) => updateSettings("caldav", { user: v })}
        />
      </Field>
      <Field label={t("settings.caldavPassword")}>
        <Input
          type="password"
          value={settings.caldav.password}
          onChange={(v) => updateSettings("caldav", { password: v })}
        />
      </Field>

      {/* Discover + Select Calendar */}
      {canDiscover && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="btn-ghost text-sm flex items-center gap-2 px-4 py-2"
            >
              {discovering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {discovering ? t("settings.caldavDiscovering") : t("settings.caldavDiscover")}
            </button>
          </div>

          {discoverError && (
            <p className="text-xs text-danger">{discoverError}</p>
          )}

          {calendars.length > 0 && (
            <Field label={t("settings.caldavCalendar")}>
              <div className="space-y-1.5">
                {calendars.map((cal) => {
                  const isSelected = settings.caldav.calendarUrl === cal.url;
                  return (
                    <button
                      key={cal.url}
                      onClick={() => updateSettings("caldav", { calendarUrl: cal.url })}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                        isSelected
                          ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                          : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                      <span className="truncate">{cal.name}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {settings.caldav.calendarUrl && (
            <p className="text-xs text-muted-light dark:text-muted-dark truncate">
              {settings.caldav.calendarUrl}
            </p>
          )}
        </>
      )}
    </Section>
  );
}

export default function SettingsPage() {
  const { t, lang, switchLang, availableLanguages } = useI18n();
  const { dark, toggle } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [saved, setSaved] = useState(null);

  const flash = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h2 className="text-xl font-semibold">{t("settings.title")}</h2>

      {/* General */}
      <Section title={t("settings.general")}>
        <Field label={t("settings.language")}>
          <div className="flex gap-2">
            {availableLanguages.map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  lang === l
                    ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                <Globe className="w-4 h-4" />
                {l === "de" ? "Deutsch" : "English"}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("settings.theme")}>
          <div className="flex gap-2">
            {[
              { key: "light", icon: Sun, active: !dark },
              { key: "dark", icon: Moon, active: dark },
            ].map(({ key, icon: Icon, active }) => (
              <button
                key={key}
                onClick={() => { if ((key === "dark") !== dark) toggle(); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  active
                    ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                    : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(`settings.theme${key.charAt(0).toUpperCase() + key.slice(1)}`)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Gamification */}
      <Section title={t("settings.gamification")}>
        <Toggle
          checked={settings.gamification.xpEnabled}
          onChange={(v) => updateSettings("gamification", { xpEnabled: v })}
          label={t("settings.xpEnabled")}
        />
        <Toggle
          checked={settings.gamification.soundEnabled}
          onChange={(v) => updateSettings("gamification", { soundEnabled: v })}
          label={t("settings.soundEnabled")}
        />
      </Section>

      {/* Work Schedule */}
      <Section title={t("settings.workSchedule")}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("settings.workStart")}>
            <Input
              type="time"
              value={settings.workSchedule.start}
              onChange={(v) => updateSettings("workSchedule", { start: v })}
            />
          </Field>
          <Field label={t("settings.workEnd")}>
            <Input
              type="time"
              value={settings.workSchedule.end}
              onChange={(v) => updateSettings("workSchedule", { end: v })}
            />
          </Field>
        </div>
        <Field label={t("settings.breakDuration")}>
          <Input
            type="number"
            min={0}
            max={120}
            step={5}
            value={settings.workSchedule.breakMinutes}
            onChange={(v) => updateSettings("workSchedule", { breakMinutes: Number(v) })}
          />
        </Field>
        <Field label={t("settings.workDays")}>
          <div className="flex gap-1.5">
            {t("settings.weekdaysShort").map((day, i) => {
              const dayNum = i + 1;
              const active = settings.workSchedule.workDays.includes(dayNum);
              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    const days = active
                      ? settings.workSchedule.workDays.filter((d) => d !== dayNum)
                      : [...settings.workSchedule.workDays, dayNum].sort();
                    updateSettings("workSchedule", { workDays: days });
                  }}
                  className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-accent text-white"
                      : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* Mail Filter */}
      <Section title={t("settings.mailFilter")}>
        <Toggle
          checked={settings.mail.masterTagEnabled}
          onChange={(v) => updateSettings("mail", { masterTagEnabled: v })}
          label={t("settings.masterTagEnabled")}
        />
        <p className="text-xs text-muted-light dark:text-muted-dark -mt-2 ml-[52px]">
          {t("settings.masterTagEnabledDesc")}
        </p>
        {settings.mail.masterTagEnabled && (
          <Field label={t("settings.masterTag")}>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-accent flex-shrink-0" />
              <Input
                value={settings.mail.masterTag}
                onChange={(v) => updateSettings("mail", { masterTag: v })}
                placeholder="dopamind"
              />
            </div>
          </Field>
        )}
      </Section>

      {/* IMAP */}
      <Section title={t("settings.imap")}>
        <Field label={t("settings.imapHost")}>
          <Input
            value={settings.imap.host}
            onChange={(v) => updateSettings("imap", { host: v })}
            placeholder="imap.example.com"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("settings.imapPort")}>
            <Input
              type="number"
              value={settings.imap.port}
              onChange={(v) => updateSettings("imap", { port: Number(v) })}
            />
          </Field>
          <Field label="TLS">
            <Toggle
              checked={settings.imap.tls}
              onChange={(v) => updateSettings("imap", { tls: v })}
              label={t("settings.imapTls")}
            />
          </Field>
        </div>
        <Field label={t("settings.imapUser")}>
          <Input
            value={settings.imap.user}
            onChange={(v) => updateSettings("imap", { user: v })}
            placeholder="user@example.com"
          />
        </Field>
        <Field label={t("settings.imapPassword")}>
          <Input
            type="password"
            value={settings.imap.password}
            onChange={(v) => updateSettings("imap", { password: v })}
          />
        </Field>
      </Section>

      {/* SMTP */}
      <Section title={t("settings.smtp")}>
        <Field label={t("settings.smtpHost")}>
          <Input
            value={settings.smtp.host}
            onChange={(v) => updateSettings("smtp", { host: v })}
            placeholder="smtp.example.com"
          />
        </Field>
        <Field label={t("settings.smtpPort")}>
          <Input
            type="number"
            value={settings.smtp.port}
            onChange={(v) => updateSettings("smtp", { port: Number(v) })}
          />
        </Field>
        <Field label={t("settings.imapUser")}>
          <Input
            value={settings.smtp.user}
            onChange={(v) => updateSettings("smtp", { user: v })}
            placeholder="user@example.com"
          />
        </Field>
        <Field label={t("settings.imapPassword")}>
          <Input
            type="password"
            value={settings.smtp.password}
            onChange={(v) => updateSettings("smtp", { password: v })}
          />
        </Field>
      </Section>

      {/* CalDAV */}
      <CalDavSection t={t} settings={settings} updateSettings={updateSettings} />
    </div>
  );
}
