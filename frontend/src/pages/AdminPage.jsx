import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";
import {
  Users, Search, Shield, ShieldOff, UserX, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, ScrollText,
} from "lucide-react";

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

  useEffect(() => {
    if (tab === "users") loadUsers(1);
    if (tab === "audit") loadAuditLog(1);
  }, [tab, loadUsers, loadAuditLog]);

  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const toggleRole = async (u) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await apiFetch(`/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      flash(`${u.email} → ${newRole}`);
      loadUsers(pagination.page);
    } catch (err) {
      flash(err.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      await apiFetch(`/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !u.active }),
      });
      flash(`${u.email} ${!u.active ? t("admin.activate") : t("admin.deactivate")}`);
      loadUsers(pagination.page);
    } catch (err) {
      flash(err.message);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`${t("admin.confirmDelete")} ${u.email}?`)) return;
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: "DELETE" });
      flash(`${u.email} ${t("admin.deleted")}`);
      loadUsers(pagination.page);
    } catch (err) {
      flash(err.message);
    }
  };

  const tabs = [
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "audit", label: t("admin.auditLog"), icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield size={24} /> {t("admin.title")}
      </h1>

      {actionMsg && (
        <div className="text-sm text-accent bg-accent/10 p-3 rounded-xl">{actionMsg}</div>
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

          <div className="space-y-2">
            {loading ? (
              <p className="text-center py-8 text-muted-light dark:text-muted-dark">{t("common.loading")}</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{u.name}</span>
                      {u.role === "admin" && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                      {!u.active && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-danger px-2 py-0.5 rounded-full">
                          {t("admin.disabled")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-light dark:text-muted-dark truncate">{u.email}</p>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                      {t("admin.registered")}: {new Date(u.createdAt).toLocaleDateString()}
                      {u.lastLogin && ` · ${t("admin.lastLogin")}: ${new Date(u.lastLogin).toLocaleDateString()}`}
                    </p>
                  </div>
                  {u.id !== currentUser.id && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleRole(u)}
                        title={u.role === "admin" ? t("admin.removeAdmin") : t("admin.makeAdmin")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      >
                        {u.role === "admin" ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        title={u.active ? t("admin.deactivate") : t("admin.activate")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      >
                        {u.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        title={t("common.delete")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-danger transition-colors"
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
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
    </div>
  );
}
