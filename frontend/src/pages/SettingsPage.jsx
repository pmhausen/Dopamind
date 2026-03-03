import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { discoverCalendars } from "../services/calendarService";
import { Check, Sun, Moon, Globe, Filter, Search, Loader2, SlidersHorizontal, Briefcase, Mail, Calendar, Gamepad2, User, AlertTriangle } from "lucide-react";

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

function AccountSection({ t }) {
  const { user, changePassword, deleteAccount, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const handleProfileSave = async () => {
    try {
      await updateProfile(name);
      setProfileMsg(t("settings.profileSaved"));
      setTimeout(() => setProfileMsg(""), 3000);
    } catch (err) {
      setProfileMsg(err.message);
    }
  };

  const handlePasswordChange = async () => {
    setPwError("");
    setPwMsg("");
    if (newPw !== confirmPw) {
      setPwError(t("auth.pwMismatch"));
      return;
    }
    try {
      await changePassword(currentPw, newPw);
      setPwMsg(t("settings.passwordChanged"));
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err) {
      setPwError(err.message);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    try {
      await deleteAccount(deletePw);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <>
      <Section title={t("settings.account")}>
        <Field label={t("settings.profileEmail")}>
          <p className="text-sm text-muted-light dark:text-muted-dark py-2">{user?.email}</p>
        </Field>
        <Field label={t("settings.profileName")}>
          <Input value={name} onChange={setName} />
        </Field>
        <button onClick={handleProfileSave} className="btn-primary text-sm px-4 py-2 rounded-xl">
          {t("settings.profileSave")}
        </button>
        {profileMsg && <p className="text-xs text-accent">{profileMsg}</p>}
      </Section>

      <Section title={t("settings.changePassword")}>
        <Field label={t("settings.currentPassword")}>
          <Input type="password" value={currentPw} onChange={setCurrentPw} />
        </Field>
        <Field label={t("settings.newPassword")}>
          <Input type="password" value={newPw} onChange={setNewPw} />
        </Field>
        <Field label={t("settings.confirmNewPassword")}>
          <Input type="password" value={confirmPw} onChange={setConfirmPw} />
        </Field>
        <button
          onClick={handlePasswordChange}
          disabled={!currentPw || !newPw || !confirmPw}
          className="btn-primary text-sm px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {t("settings.changePassword")}
        </button>
        {pwMsg && <p className="text-xs text-accent">{pwMsg}</p>}
        {pwError && <p className="text-xs text-danger">{pwError}</p>}
      </Section>

      <Section title={t("settings.deleteAccount")}>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{t("settings.deleteAccountWarning")}</p>
        </div>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="text-sm px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-danger hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
          >
            {t("settings.deleteAccountButton")}
          </button>
        ) : (
          <>
            <p className="text-sm">{t("settings.deleteAccountConfirm")}</p>
            <Field label={t("settings.currentPassword")}>
              <Input type="password" value={deletePw} onChange={setDeletePw} />
            </Field>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!deletePw}
                className="text-sm px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {t("settings.deleteAccountButton")}
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeletePw(""); setDeleteError(""); }}
                className="btn-ghost text-sm px-4 py-2"
              >
                {t("common.cancel")}
              </button>
            </div>
            {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
          </>
        )}
      </Section>
    </>
  );
}

export default function SettingsPage() {
  const { t, lang, switchLang, availableLanguages } = useI18n();
  const { dark, toggle } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("general");

  const TABS = [
    { key: "general",      icon: SlidersHorizontal, label: t("settings.tabGeneral") },
    { key: "worktime",     icon: Briefcase,          label: t("settings.tabWorkTime") },
    { key: "email",        icon: Mail,               label: t("settings.tabEmail") },
    { key: "calendar",     icon: Calendar,           label: t("settings.tabCalendar") },
    { key: "gamification", icon: Gamepad2,           label: t("settings.tabGamification") },
    { key: "account",      icon: User,               label: t("settings.tabAccount") },
  ];

  return (
    <div className="animate-fade-in max-w-3xl">
      <h2 className="text-xl font-semibold mb-5">{t("settings.title")}</h2>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* Tab sidebar */}
        <nav className="sm:w-44 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 flex-shrink-0">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-accent/10 text-accent"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* General tab */}
          {activeTab === "general" && (
            <>
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

            <Section title={t("settings.features")}>
              <Toggle
                checked={settings.features.mailEnabled}
                onChange={(v) => updateSettings("features", { mailEnabled: v })}
                label={t("settings.featureMail")}
              />
              <Toggle
                checked={settings.features.calendarEnabled}
                onChange={(v) => updateSettings("features", { calendarEnabled: v })}
                label={t("settings.featureCalendar")}
              />
              <Toggle
                checked={settings.features.timeTrackingEnabled}
                onChange={(v) => updateSettings("features", { timeTrackingEnabled: v })}
                label={t("settings.featureTimeTracking")}
              />
              <Toggle
                checked={settings.features.gamificationEnabled}
                onChange={(v) => updateSettings("features", { gamificationEnabled: v })}
                label={t("settings.featureGamification")}
              />
            </Section>
            </>
          )}

          {/* Work Time tab */}
          {activeTab === "worktime" && (
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
          )}

          {/* Email tab */}
          {activeTab === "email" && (
            <>
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
                <Field label={t("settings.smtpUser")}>
                  <Input
                    value={settings.smtp.user}
                    onChange={(v) => updateSettings("smtp", { user: v })}
                    placeholder="user@example.com"
                  />
                </Field>
                <Field label={t("settings.smtpPassword")}>
                  <Input
                    type="password"
                    value={settings.smtp.password}
                    onChange={(v) => updateSettings("smtp", { password: v })}
                  />
                </Field>
              </Section>
            </>
          )}

          {/* Calendar tab */}
          {activeTab === "calendar" && (
            <CalDavSection t={t} settings={settings} updateSettings={updateSettings} />
          )}

          {/* Gamification tab */}
          {activeTab === "gamification" && (
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
          )}

          {/* Account tab */}
          {activeTab === "account" && (
            <AccountSection t={t} />
          )}

        </div>
      </div>
    </div>
  );
}
