import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", name: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordChecks = [
    { label: t("auth.pwMin8"), ok: form.password.length >= 8 },
    { label: t("auth.pwUpper"), ok: /[A-Z]/.test(form.password) },
    { label: t("auth.pwLower"), ok: /[a-z]/.test(form.password) },
    { label: t("auth.pwNumber"), ok: /\d/.test(form.password) },
  ];

  const passwordValid = passwordChecks.every((c) => c.ok);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!passwordValid) {
      setError(t("auth.pwRequirements"));
      return;
    }
    if (!passwordsMatch) {
      setError(t("auth.pwMismatch"));
      return;
    }

    setLoading(true);
    try {
      await register(form.email, form.name, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Dopamind
          </h1>
          <p className="text-muted-light dark:text-muted-dark mt-1 text-sm">
            {t("app.tagline")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus size={20} /> {t("auth.register")}
          </h2>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.name")}</label>
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
            <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
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
            <label className="block text-sm font-medium mb-1">{t("auth.password")}</label>
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
                  <li key={i} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-600 dark:text-green-400" : "text-muted-light dark:text-muted-dark"}`}>
                    <CheckCircle2 size={12} className={c.ok ? "opacity-100" : "opacity-30"} />
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.confirmPassword")}</label>
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

          <button
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? t("common.loading") : t("auth.register")}
          </button>

          <p className="text-center text-sm text-muted-light dark:text-muted-dark">
            {t("auth.hasAccount")}{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
