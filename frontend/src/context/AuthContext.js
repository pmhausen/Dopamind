import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const AuthContext = createContext();

const TOKEN_KEY = "dopamind-token";
const USER_KEY = "dopamind-user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(null); // null = unknown, true/false = resolved
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const didVerify = useRef(false);

  const API_BASE = process.env.REACT_APP_API_URL || "/api";

  const saveAuth = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("dopamind-settings");
    localStorage.removeItem("dopamind-state");
    localStorage.removeItem("dopamind-timetracking");
    setToken(null);
    setUser(null);
  }, []);

  // Check setup status and verify token on mount
  useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;

    const checkSetup = fetch(`${API_BASE}/setup/status`)
      .then((res) => res.json())
      .then((data) => {
        setSetupNeeded(data.needsSetup === true);
        setRegistrationEnabled(data.registrationEnabled !== false);
      })
      .catch(() => {
        setSetupNeeded(false);
      });

    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      checkSetup.finally(() => setLoading(false));
      return;
    }
    Promise.all([
      checkSetup,
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Invalid token");
          return res.json();
        })
        .then((data) => {
          setUser(data);
          localStorage.setItem(USER_KEY, JSON.stringify(data));
        })
        .catch(() => clearAuth()),
    ]).finally(() => setLoading(false));
  }, [API_BASE, clearAuth]);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveAuth(data.token, data.user);
      return data;
    },
    [API_BASE, saveAuth]
  );

  const register = useCallback(
    async (email, name, password) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      saveAuth(data.token, data.user);
      return data;
    },
    [API_BASE, saveAuth]
  );

  const completeSetup = useCallback(
    async (email, name, password) => {
      const res = await fetch(`${API_BASE}/setup/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      setSetupNeeded(false);
      saveAuth(data.token, data.user);
      return data;
    },
    [API_BASE, saveAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const deleteAccount = useCallback(
    async (password) => {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Account deletion failed");
      clearAuth();
      return data;
    },
    [API_BASE, token, clearAuth]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");
      return data;
    },
    [API_BASE, token]
  );

  const updateProfile = useCallback(
    async (name) => {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile update failed");
      setUser(data);
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      return data;
    },
    [API_BASE, token]
  );

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, token, loading, setupNeeded, registrationEnabled, login, register, completeSetup, logout, deleteAccount, changePassword, updateProfile, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
