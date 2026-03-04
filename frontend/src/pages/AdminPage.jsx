import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";
import {
  Users, Search, Shield, ShieldOff, UserX, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, ScrollText,
  UserPlus, Pencil, X, Eye, EyeOff, AlertCircle, Settings,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Modal wrapper                                                     */
/* ------------------------------------------------------------------ */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Password checks (reused from RegisterPage)                        */
/* ------------------------------------------------------------------ */
function PasswordChecks({ password, t }) {
  const checks = [
    { label: t("auth.pwMin8"), ok: password.length >= 8 },
    { label: t("auth.pwUpper"), ok: /[A-Z]/.test(password) },
    { label: t("auth.pwLower"), ok: /[a-z]/.test(password) },
    { label: t("auth.pwNumber"), ok: /\d/.test(password) },
  ];
  return (
    <ul className="mt-1 space-y-0.5">
      {checks.map((c, i) => (
        <li key={i} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-600 dark:text-green-400" : "text-muted-light dark:text-muted-dark"}`}>
          <CheckCircle2 size={12} className={c.ok ? "opacity-100" : "opacity-30"} /> {c.label}
        </li>
      ))}
    </ul>
  );
}

function passwordValid(pw) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}

/* ------------------------------------------------------------------ */
/*  Create User Dialog                                                */
/* ------------------------------------------------------------------ */
function CreateUserDialog({ open, onClose, onCreated, t }) {
  const [form, setForm] = useState({ email: "", name: "", password: "", confirmPassword: "", role: "user" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const pwMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwordValid(form.password)) { setError(t("auth.pwRequirements")); return; }
    if (!pwMatch) { setError(t("auth.pwMismatch")); return; }
    setLoading(true);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: form.email, name: form.name, password: form.password, role: form.role }),
      });
      setForm({ email: "", name: "", password: "", confirmPassword: "", role: "user" });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("admin.createUser")}>
      {error && (
        <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.name")}</label>
          <input type="text" required value={form.name} onChange={update("name")} autoComplete="name"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
            placeholder={t("auth.namePlaceholder")} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
          <input type="email" required value={form.email} onChange={update("email")} autoComplete="email"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
            placeholder={t("auth.emailPlaceholder")} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("admin.role")}</label>
          <select value={form.role} onChange={update("role")}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm">
            <option value="user">{t("admin.roleUser")}</option>
            <option value="admin">{t("admin.roleAdmin")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.password")}</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} required value={form.password} onChange={update("password")} autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-accent transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.password.length > 0 && <PasswordChecks password={form.password} t={t} />}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.confirmPassword")}</label>
          <input type="password" required value={form.confirmPassword} onChange={update("confirmPassword")} autoComplete="new-password"
            className={`w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm ${
              form.confirmPassword.length > 0 ? (pwMatch ? "border-green-400 dark:border-green-600" : "border-red-400 dark:border-red-600") : "border-gray-200 dark:border-white/10"
            }`} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={loading || !passwordValid(form.password) || !pwMatch}
            className="px-5 py-2 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-50">
            {loading ? t("common.loading") : t("admin.createUser")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit User Dialog                                                  */
/* ------------------------------------------------------------------ */
function EditUserDialog({ open, onClose, user, onSaved, currentUserId, t }) {
  const [form, setForm] = useState({ name: "", email: "", role: "user", active: true });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, role: user.role, active: user.active });
      setError("");
    }
  }, [user]);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isSelf = user?.id === currentUserId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = { name: form.name, email: form.email };
      if (!isSelf) {
        body.role = form.role;
        body.active = form.active;
      }
      await apiFetch(`/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("admin.editUser")}>
      {error && (
        <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.name")}</label>
          <input type="text" required value={form.name} onChange={update("name")}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
          <input type="email" required value={form.email} onChange={update("email")}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm" />
        </div>
        {!isSelf && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">{t("admin.role")}</label>
              <select value={form.role} onChange={update("role")}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm">
                <option value="user">{t("admin.roleUser")}</option>
                <option value="admin">{t("admin.roleAdmin")}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">{t("admin.activeStatus")}</label>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? "bg-accent" : "bg-gray-300 dark:bg-white/20"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "left-5" : "left-1"}`} />
              </button>
              <span className={`text-xs ${form.active ? "text-green-600 dark:text-green-400" : "text-danger"}`}>
                {form.active ? t("admin.active") : t("admin.disabled")}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-50">
            {loading ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Dialog                                        */
/* ------------------------------------------------------------------ */
function DeleteUserDialog({ open, onClose, user, onDeleted, t }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    setLoading(true);
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("admin.confirmDelete")}>
      {error && (
        <div className="flex items-center gap-2 text-danger text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      <p className="text-sm text-muted-light dark:text-muted-dark">
        {t("admin.deleteWarning")}
      </p>
      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-sm">
        <span className="font-medium">{user.name}</span>
        <span className="text-muted-light dark:text-muted-dark ml-2">{user.email}</span>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
          {t("common.cancel")}
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="px-5 py-2 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-all disabled:opacity-50">
          {loading ? t("common.loading") : t("common.delete")}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Admin Page                                                   */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState({ page: 1, pages: 1 });

  // Settings state
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (search) params.set("search", search);
        const data = await apiFetch(`/admin/users?${params}`);
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  const loadAuditLog = useCallback(async (page = 1) => {
    try {
      const data = await apiFetch(`/admin/audit-log?page=${page}&limit=20`);
      setAuditLogs(data.logs);
      setAuditPage(data.pagination);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await apiFetch("/admin/settings");
      setRegistrationEnabled(data.registrationEnabled);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers(1);
    if (tab === "audit") loadAuditLog(1);
    if (tab === "settings") loadSettings();
  }, [tab, loadUsers, loadAuditLog, loadSettings]);

  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const toggleRegistration = async () => {
    try {
      const data = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ registrationEnabled: !registrationEnabled }),
      });
      setRegistrationEnabled(data.registrationEnabled);
      flash(t("common.success"));
    } catch (err) {
      flash(err.message);
    }
  };

  const handleUserChanged = () => {
    flash(t("common.success"));
    loadUsers(pagination.page);
  };

  const tabs = [
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "settings", label: t("admin.settings"), icon: Settings },
    { id: "audit", label: t("admin.auditLog"), icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield size={24} /> {t("admin.title")}
        </h1>
        {tab === "users" && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all">
            <UserPlus size={16} /> {t("admin.createUser")}
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="text-sm text-accent bg-accent/10 p-3 rounded-xl animate-fade-in">{actionMsg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === id
                ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                : "hover:bg-gray-100 dark:hover:bg-white/10"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers(1)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                placeholder={t("admin.searchUsers")}
              />
            </div>
            <button
              onClick={() => loadUsers(1)}
              className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
            >
              {t("admin.search")}
            </button>
          </div>

          <div className="text-sm text-muted-light dark:text-muted-dark">
            {t("admin.totalUsers")}: {pagination.total}
          </div>

          {/* User table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-light dark:text-muted-dark border-b border-gray-200 dark:border-white/10">
                  <th className="pb-2 font-medium">{t("auth.name")}</th>
                  <th className="pb-2 font-medium">{t("auth.email")}</th>
                  <th className="pb-2 font-medium">{t("admin.role")}</th>
                  <th className="pb-2 font-medium">{t("admin.status")}</th>
                  <th className="pb-2 font-medium">{t("admin.registered")}</th>
                  <th className="pb-2 font-medium text-right">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-light dark:text-muted-dark">{t("common.loading")}</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-light dark:text-muted-dark">{t("admin.noUsers")}</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{u.name}</span>
                        {u.id === currentUser.id && (
                          <span className="ml-1.5 text-[10px] text-muted-light dark:text-muted-dark">({t("admin.you")})</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-light dark:text-muted-dark">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === "admin"
                            ? "bg-accent/10 text-accent"
                            : "bg-gray-100 dark:bg-white/10 text-muted-light dark:text-muted-dark"
                        }`}>
                          {u.role === "admin" && <Shield size={10} />}
                          {u.role === "admin" ? t("admin.roleAdmin") : t("admin.roleUser")}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          u.active
                            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-danger"
                        }`}>
                          {u.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {u.active ? t("admin.active") : t("admin.disabled")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-light dark:text-muted-dark text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditUser(u)} title={t("common.edit")}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <Pencil size={14} />
                          </button>
                          {u.id !== currentUser.id && (
                            <button onClick={() => setDeleteTarget(u)} title={t("common.delete")}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-danger transition-colors">
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => loadUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => loadUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <p className="text-center py-8 text-muted-light dark:text-muted-dark">{t("admin.noAuditLogs")}</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="glass-card p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-xs text-muted-light dark:text-muted-dark">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-light dark:text-muted-dark text-xs mt-0.5">
                  {log.user_email || t("admin.system")} · {log.detail}
                </p>
              </div>
            ))
          )}

          {auditPage.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => loadAuditLog(auditPage.page - 1)}
                disabled={auditPage.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                {auditPage.page} / {auditPage.pages}
              </span>
              <button
                onClick={() => loadAuditLog(auditPage.page + 1)}
                disabled={auditPage.page >= auditPage.pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="space-y-4">
          {settingsLoading ? (
            <p className="text-center py-8 text-muted-light dark:text-muted-dark">{t("common.loading")}</p>
          ) : (
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{t("admin.registrationEnabled")}</h3>
                  <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                    {t("admin.registrationEnabledDesc")}
                  </p>
                </div>
                <button onClick={toggleRegistration}
                  className={`relative w-11 h-6 rounded-full transition-colors ${registrationEnabled ? "bg-accent" : "bg-gray-300 dark:bg-white/20"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${registrationEnabled ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleUserChanged} t={t} />
      <EditUserDialog open={!!editUser} onClose={() => setEditUser(null)} user={editUser} onSaved={handleUserChanged} currentUserId={currentUser.id} t={t} />
      <DeleteUserDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} user={deleteTarget} onDeleted={handleUserChanged} t={t} />
    </div>
  );
}
