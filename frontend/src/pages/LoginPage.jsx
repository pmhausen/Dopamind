import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login, registrationEnabled } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Dopamind
          </h1>
          <p className="text-muted-light dark:text-muted-dark mt-1 text-sm">
            {t("app.tagline")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 space-y-5"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <LogIn size={20} /> {t("auth.login")}
          </h2>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? t("common.loading") : t("auth.login")}
          </button>

          {registrationEnabled && (
            <p className="text-center text-sm text-muted-light dark:text-muted-dark">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="text-accent hover:underline font-medium">
                {t("auth.register")}
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
