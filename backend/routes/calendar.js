const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// --- Persistence layer (file-based fallback, user-isolated) ---

function getUserDataFile(userId) {
  // Sanitize userId to prevent path traversal
  const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(__dirname, "..", "data", `events-${safeId}.json`);
}

function loadEvents(userId) {
  const dataFile = getUserDataFile(userId);
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, "utf8"));
    }
  } catch {}
  return [];
}

function saveEvents(userId, events) {
  const dataFile = getUserDataFile(userId);
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
}

// --- CalDAV helpers ---

function getCalDavConfig(req) {
  const cfg = req.headers["x-caldav-config"];
  if (!cfg) return null;
  try {
    return JSON.parse(Buffer.from(cfg, "base64").toString());
  } catch {
    return null;
  }
}

/** The effective calendar URL — either the explicit calendarUrl or the base url */
function getCalendarUrl(config) {
  return (config.calendarUrl || config.url || "").replace(/\/$/, "");
}

async function caldavRequest(url, method, body, auth, depth) {
  const headers = {
    Authorization: "Basic " + Buffer.from(`${auth.user}:${auth.password}`).toString("base64"),
    "Content-Type": method === "PUT"
      ? "text/calendar; charset=utf-8"
      : "application/xml; charset=utf-8",
  };
  if (depth !== undefined) headers["Depth"] = String(depth);

  const res = await fetch(url, {
    method,
    headers,
    body: body || undefined,
    redirect: "follow",
  });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

function toIcal(event) {
  const uid = event.id || Date.now().toString(36);
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  let dtstart, dtend;

  if (event.allDay) {
    dtstart = `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`;
    dtend = "";
  } else {
    const date = event.date.replace(/-/g, "");
    dtstart = `DTSTART:${date}T${(event.start || "09:00").replace(":", "")}00`;
    dtend = `DTEND:${date}T${(event.end || "10:00").replace(":", "")}00`;
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dopamind//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@dopamind`,
    `DTSTAMP:${now}`,
    dtstart,
    dtend,
    `SUMMARY:${event.title || ""}`,
    event.description ? `DESCRIPTION:${event.description}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

// --- CalDAV fetch events ---
async function fetchCalDavEvents(config, start, end) {
  const calendarUrl = getCalendarUrl(config);
  if (!calendarUrl) throw new Error("No calendar URL configured");

  // Build REPORT body — empty comp-filter fetches all events
  let timeRange = "";
  if (start && end) {
    timeRange = `<c:time-range start="${start.replace(/-/g, "")}T000000Z" end="${end.replace(/-/g, "")}T235959Z"/>`;
  }

  const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        ${timeRange}
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const res = await caldavRequest(calendarUrl, "REPORT", reportBody, config, 1);
  if (res.status >= 400) {
    console.error("CalDAV REPORT response:", res.status, res.text.slice(0, 500));
    throw new Error(`CalDAV REPORT failed: ${res.status}`);
  }

  const events = [];
  // Match calendar-data in various namespace prefixes (cal:, c:, C:, or no prefix)
  const calDataRegex = /<(?:[A-Za-z]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[A-Za-z]+:)?calendar-data>/gi;
  let match;
  while ((match = calDataRegex.exec(res.text)) !== null) {
    const ical = match[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&#13;/g, "\r");
    const ev = parseIcalEvent(ical);
    if (ev) events.push(ev);
  }
  return events;
}

function parseIcalEvent(ical) {
  const get = (key) => {
    // Handle unfolded iCal lines (continuation lines start with space/tab)
    const re = new RegExp(`^${key}[;:](.*(?:\\r?\\n[ \\t].*)*)`, "m");
    const m = ical.match(re);
    if (!m) return null;
    // Unfold: remove CRLF + leading whitespace
    return m[1].replace(/\r?\n[ \t]/g, "").trim();
  };

  const uid = get("UID");
  const summary = get("SUMMARY");
  const dtstart = get("DTSTART");
  const dtend = get("DTEND");
  const description = get("DESCRIPTION");
  const location = get("LOCATION");

  if (!uid) return null;

  let date, start, end, allDay = false;

  if (dtstart) {
    // Strip any iCal parameter prefix (e.g. VALUE=DATE: or TZID=...:)
    // DTSTART;VALUE=DATE:20260303 → "VALUE=DATE:20260303"
    const colonIdx = dtstart.indexOf(":");
    const valuePart = colonIdx >= 0 ? dtstart.slice(colonIdx + 1) : dtstart;
    const paramPart = colonIdx >= 0 ? dtstart.slice(0, colonIdx).toUpperCase() : "";

    if (paramPart.includes("VALUE=DATE") || valuePart.length === 8) {
      date = `${valuePart.slice(0, 4)}-${valuePart.slice(4, 6)}-${valuePart.slice(6, 8)}`;
      allDay = true;
    } else {
      // DateTime: 20260303T090000 or 20260303T090000Z
      const dt = valuePart.replace(/Z$/, "");
      if (dt.length >= 15) {
        date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
        start = `${dt.slice(9, 11)}:${dt.slice(11, 13)}`;
      } else if (dt.length === 8) {
        date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
        allDay = true;
      }
    }
  }

  if (dtend && !allDay) {
    const colonIdx = dtend.indexOf(":");
    const valuePart = colonIdx >= 0 ? dtend.slice(colonIdx + 1) : dtend;
    const dt = valuePart.replace(/Z$/, "");
    if (dt.length >= 15) {
      end = `${dt.slice(9, 11)}:${dt.slice(11, 13)}`;
    }
  }

  return {
    id: uid.replace(/@.*/, ""),
    title: summary || "(no title)",
    description: description || "",
    location: location || "",
    date: date || new Date().toISOString().slice(0, 10),
    start: start || null,
    end: end || null,
    allDay,
  };
}

// --- CalDAV calendar discovery ---
async function discoverCalendars(config) {
  const baseUrl = config.url.replace(/\/$/, "");

  // Step 1: PROPFIND on the given URL to find calendar-home-set or direct calendars
  const propfindBody = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
    <cs:getctag/>
    <d:current-user-principal/>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`;

  const res = await caldavRequest(baseUrl, "PROPFIND", propfindBody, config, 1);
  if (res.status >= 400) throw new Error(`PROPFIND failed: ${res.status}`);

  // Check if we got calendars directly (Depth:1 on a calendar-home-set)
  let calendars = extractCalendars(res.text, baseUrl);
  if (calendars.length > 0) return calendars;

  // Try to find calendar-home-set URL
  const homeSetMatch = res.text.match(/<(?:[A-Za-z]+:)?calendar-home-set[^>]*>\s*<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\//i);
  if (homeSetMatch) {
    const homeSetUrl = resolveUrl(baseUrl, homeSetMatch[1].trim());
    const homeRes = await caldavRequest(homeSetUrl, "PROPFIND", propfindBody, config, 1);
    if (homeRes.status < 400) {
      calendars = extractCalendars(homeRes.text, homeSetUrl);
      if (calendars.length > 0) return calendars;
    }
  }

  // Try to find current-user-principal and go from there
  const principalMatch = res.text.match(/<(?:[A-Za-z]+:)?current-user-principal[^>]*>\s*<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\//i);
  if (principalMatch) {
    const principalUrl = resolveUrl(baseUrl, principalMatch[1].trim());
    const pRes = await caldavRequest(principalUrl, "PROPFIND", propfindBody, config, 0);
    if (pRes.status < 400) {
      const pHomeMatch = pRes.text.match(/<(?:[A-Za-z]+:)?calendar-home-set[^>]*>\s*<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\//i);
      if (pHomeMatch) {
        const homeUrl = resolveUrl(baseUrl, pHomeMatch[1].trim());
        const hRes = await caldavRequest(homeUrl, "PROPFIND", propfindBody, config, 1);
        if (hRes.status < 400) {
          calendars = extractCalendars(hRes.text, homeUrl);
        }
      }
    }
  }

  return calendars;
}

function resolveUrl(base, href) {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  const url = new URL(base);
  url.pathname = href;
  return url.toString();
}

function extractCalendars(xml, baseUrl) {
  const calendars = [];
  // Split into <d:response> or <response> blocks
  const responseRegex = /<(?:[A-Za-z]+:)?response[^>]*>([\s\S]*?)<\/(?:[A-Za-z]+:)?response>/gi;
  let rMatch;
  while ((rMatch = responseRegex.exec(xml)) !== null) {
    const block = rMatch[1];

    // Check if this is a calendar collection
    const hasCalendar = /<(?:[A-Za-z]+:)?calendar\s*\/?\s*>/i.test(block);
    const hasCollection = /<(?:[A-Za-z]+:)?collection\s*\/?\s*>/i.test(block);
    if (!hasCalendar || !hasCollection) continue;

    // Get href
    const hrefMatch = block.match(/<(?:[A-Za-z]+:)?href[^>]*>([^<]+)<\//i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1].trim();
    const url = resolveUrl(baseUrl, href);

    // Get displayname
    const nameMatch = block.match(/<(?:[A-Za-z]+:)?displayname[^>]*>([^<]*)<\//i);
    const name = nameMatch ? nameMatch[1].trim() : href.split("/").filter(Boolean).pop() || "Calendar";

    // Get ctag if available
    const ctagMatch = block.match(/<(?:[A-Za-z]+:)?getctag[^>]*>([^<]*)<\//i);

    calendars.push({
      url,
      name,
      ctag: ctagMatch ? ctagMatch[1] : null,
    });
  }
  return calendars;
}

// --- Static routes BEFORE parameterized routes ---

// POST /api/calendar/discover — discover available calendars
router.post("/discover", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);
  if (!caldavConfig?.url) return res.status(400).json({ error: "CalDAV URL not configured" });

  try {
    const calendars = await discoverCalendars(caldavConfig);
    res.json(calendars);
  } catch (err) {
    console.error("CalDAV discover error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/test
router.post("/test", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);
  if (!caldavConfig?.url) return res.status(400).json({ error: "CalDAV not configured" });

  const testBody = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`;

  try {
    const result = await caldavRequest(caldavConfig.url, "PROPFIND", testBody, caldavConfig, 0);
    if (result.status === 401) throw new Error("Authentication failed (401)");
    if (result.status >= 400) throw new Error(`HTTP ${result.status}: ${result.text.slice(0, 200)}`);
    res.json({ success: true });
  } catch (err) {
    console.error("CalDAV test error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar?start=...&end=...
router.get("/", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);
  const { start, end } = req.query;

  // Only use CalDAV if a specific calendar collection is selected (not just the base URL)
  const calUrl = caldavConfig?.calendarUrl ? caldavConfig.calendarUrl.replace(/\/$/, "") : null;
  if (calUrl) {
    try {
      const events = await fetchCalDavEvents(caldavConfig, start, end);
      return res.json(events);
    } catch (err) {
      console.error("CalDAV fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Fallback: local file storage (user-isolated)
  let events = loadEvents(req.user.id);
  if (start) events = events.filter((e) => (e.date || "") >= start);
  if (end) events = events.filter((e) => (e.date || "") <= end);
  res.json(events);
});

// POST /api/calendar
router.post("/", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);
  const event = {
    ...req.body,
    id: req.body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };

  const calUrl = caldavConfig?.calendarUrl ? caldavConfig.calendarUrl.replace(/\/$/, "") : null;
  if (calUrl) {
    try {
      const ical = toIcal(event);
      const putUrl = `${calUrl}/${event.id}.ics`;
      const result = await caldavRequest(putUrl, "PUT", ical, caldavConfig);
      if (result.status >= 400) throw new Error(`CalDAV PUT failed: ${result.status} – ${result.text.slice(0, 200)}`);
      return res.status(201).json(event);
    } catch (err) {
      console.error("CalDAV create error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const events = loadEvents(req.user.id);
  events.push(event);
  saveEvents(req.user.id, events);
  res.status(201).json(event);
});

// PUT /api/calendar/:id
router.put("/:id", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);
  const event = { ...req.body, id: req.params.id };

  const calUrl = caldavConfig?.calendarUrl ? caldavConfig.calendarUrl.replace(/\/$/, "") : null;
  if (calUrl) {
    try {
      const ical = toIcal(event);
      const putUrl = `${calUrl}/${req.params.id}.ics`;
      const result = await caldavRequest(putUrl, "PUT", ical, caldavConfig);
      if (result.status >= 400) throw new Error(`CalDAV PUT failed: ${result.status}`);
      return res.json(event);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const events = loadEvents(req.user.id);
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Event not found" });
  events[idx] = { ...events[idx], ...req.body };
  saveEvents(req.user.id, events);
  res.json(events[idx]);
});

// DELETE /api/calendar/:id
router.delete("/:id", async (req, res) => {
  const caldavConfig = getCalDavConfig(req);

  const calUrl = caldavConfig?.calendarUrl ? caldavConfig.calendarUrl.replace(/\/$/, "") : null;
  if (calUrl) {
    try {
      const delUrl = `${calUrl}/${req.params.id}.ics`;
      const result = await caldavRequest(delUrl, "DELETE", null, caldavConfig);
      if (result.status >= 400 && result.status !== 404) {
        throw new Error(`CalDAV DELETE failed: ${result.status}`);
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  let events = loadEvents(req.user.id);
  events = events.filter((e) => e.id !== req.params.id);
  saveEvents(req.user.id, events);
  res.json({ success: true });
});

module.exports = router;
