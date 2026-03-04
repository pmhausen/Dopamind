const API_BASE = process.env.REACT_APP_API_URL || "/api";

function safeBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

function getSettingsConfig() {
  try {
    return JSON.parse(localStorage.getItem("dopamind-settings") || "{}");
  } catch {
    return {};
  }
}

function getAuthToken() {
  return localStorage.getItem("dopamind-token") || "";
}

export function getMailConfigHeader() {
  const settings = getSettingsConfig();
  if (!settings.imap?.host) return {};
  const config = { ...settings.imap, smtp: settings.smtp };
  return { "X-Mail-Config": safeBase64(JSON.stringify(config)) };
}

export function getCalDavConfigHeader() {
  const settings = getSettingsConfig();
  if (!settings.caldav?.url) return {};
  const config = {
    url: settings.caldav.url,
    user: settings.caldav.user,
    password: settings.caldav.password,
    calendarUrl: settings.caldav.calendarUrl || "",
  };
  return { "X-CalDAV-Config": safeBase64(JSON.stringify(config)) };
}

export async function apiFetch(path, options = {}) {
  const extraHeaders = {};
  if (path.startsWith("/mail")) Object.assign(extraHeaders, getMailConfigHeader());
  if (path.startsWith("/calendar")) Object.assign(extraHeaders, getCalDavConfigHeader());

  const token = getAuthToken();
  if (token) {
    extraHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // Token expired or invalid – redirect to login
      localStorage.removeItem("dopamind-token");
      localStorage.removeItem("dopamind-user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}
