import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Wifi,
  WifiOff,
  Database,
  KeyRound,
  RefreshCw,
} from "lucide-react";

const STEPS = ["health", "welcome", "account", "confirm"];

const API_BASE = process.env.REACT_APP_API_URL || "/api";

export default function SetupPage() {
  const { completeSetup } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Health check state
  const [healthStatus, setHealthStatus] = useState(null); // null | { reachable, security, database }
  const [healthLoading, setHealthLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthStatus(null);
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("Non-OK response");
      const data = await res.json();
      setHealthStatus({ reachable: true, ...data });
    } catch {
      setHealthStatus({ reachable: false });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordChecks = [
    { label: t("auth.pwMin8"), ok: form.password.length >= 8 },
    { label: t("auth.pwUpper"), ok: /[A-Z]/.test(form.password) },
    { label: t("auth.pwLower"), ok: /[a-z]/.test(form.password) },
    { label: t("auth.pwNumber"), ok: /\d/.test(form.password) },
  ];

  const passwordValid = passwordChecks.every((c) => c.ok);
  const passwordsMatch =
    form.password === form.confirmPassword &&
    form.confirmPassword.length > 0;

  const canProceed = () => {
    if (step === 0) return healthStatus?.reachable === true;
    if (step === 1) return true;
    if (step === 2) {
      return (
        form.email.trim().length > 0 &&
        form.name.trim().length > 0 &&
        passwordValid &&
        passwordsMatch
      );
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await completeSetup(form.email, form.name, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step
              ? "w-8 bg-accent"
              : i < step
              ? "w-4 bg-accent/40"
              : "w-4 bg-gray-300 dark:bg-white/10"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Dopamind
          </h1>
          <p className="text-muted-light dark:text-muted-dark mt-1 text-sm">
            {t("setup.subtitle")}
          </p>
        </div>

        <div className="glass-card p-6">
          {stepIndicator}

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Step 0: Health Check */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={20} className="text-accent" />
                <h2 className="text-lg font-semibold">{t("setup.healthCheck")}</h2>
              </div>

              {healthLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-light dark:text-muted-dark py-4 justify-center">
                  <RefreshCw size={16} className="animate-spin" />
                  {t("common.loading")}
                </div>
              )}

              {!healthLoading && healthStatus && (
                <div className="space-y-3">
                  {/* Backend reachability */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                    healthStatus.reachable
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                  }`}>
                    {healthStatus.reachable
                      ? <CheckCircle2 size={18} className="flex-shrink-0" />
                      : <WifiOff size={18} className="flex-shrink-0" />}
                    <span>{healthStatus.reachable ? t("setup.backendOnline") : t("setup.backendOffline")}</span>
                  </div>

                  {/* Security keys */}
                  {healthStatus.reachable && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                      healthStatus.security?.jwtSecret && healthStatus.security?.encryptionKey
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    }`}>
                      <KeyRound size={18} className="flex-shrink-0" />
                      <span>
                        {healthStatus.security?.jwtSecret && healthStatus.security?.encryptionKey
                          ? t("setup.securityKeysOk")
                          : t("setup.securityKeysMissing")}
                      </span>
                    </div>
                  )}

                  {/* Database */}
                  {healthStatus.reachable && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                      healthStatus.database
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                    }`}>
                      <Database size={18} className="flex-shrink-0" />
                      <span>{healthStatus.database ? t("setup.databaseOk") : t("setup.databaseError")}</span>
                    </div>
                  )}

                  {/* Offline explanation */}
                  {!healthStatus.reachable && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs leading-relaxed">
                      {t("setup.envVarHint")}
                    </div>
                  )}
                </div>
              )}

              {!healthLoading && (
                <button
                  onClick={checkHealth}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={14} /> {t("setup.retry")}
                </button>
              )}
            </div>
          )}

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <Rocket size={32} className="text-accent" />
              </div>
              <h2 className="text-xl font-semibold">{t("setup.welcome")}</h2>
              <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                {t("setup.welcomeText")}
              </p>
            </div>
          )}

          {/* Step 2: Admin Account Form */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={20} className="text-accent" />
                <h2 className="text-lg font-semibold">
                  {t("setup.adminAccount")}
                </h2>
              </div>
              <p className="text-xs text-muted-light dark:text-muted-dark mb-3">
                {t("setup.adminHint")}
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("auth.name")}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={updateField("name")}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                  placeholder={t("auth.namePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField("email")}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                  placeholder={t("auth.emailPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={form.password}
                    onChange={updateField("password")}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-accent transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {passwordChecks.map((c, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-1.5 text-xs ${
                          c.ok
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-light dark:text-muted-dark"
                        }`}
                      >
                        <CheckCircle2
                          size={12}
                          className={c.ok ? "opacity-100" : "opacity-30"}
                        />
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("auth.confirmPassword")}
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={updateField("confirmPassword")}
                  className={`w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm ${
                    form.confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-400 dark:border-green-600"
                        : "border-red-400 dark:border-red-600"
                      : "border-gray-200 dark:border-white/10"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={20} className="text-success" />
                <h2 className="text-lg font-semibold">
                  {t("setup.confirm")}
                </h2>
              </div>
              <p className="text-sm text-muted-light dark:text-muted-dark">
                {t("setup.confirmText")}
              </p>

              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-light dark:text-muted-dark">
                    {t("auth.name")}
                  </span>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light dark:text-muted-dark">
                    {t("auth.email")}
                  </span>
                  <span className="font-medium">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-light dark:text-muted-dark">
                    {t("setup.role")}
                  </span>
                  <span className="font-medium text-accent">
                    {t("setup.administrator")}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-3 text-xs">
                {t("setup.oneTimeWarning")}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                <ChevronLeft size={16} /> {t("setup.back")}
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-6 py-2 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {t("setup.next")} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1 px-6 py-2 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {loading ? t("common.loading") : t("setup.finish")}
                {!loading && <Rocket size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
