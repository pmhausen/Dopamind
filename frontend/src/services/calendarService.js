import { apiFetch } from "./api";

export function fetchEvents(start, end) {
  let url = "/calendar";
  const params = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length) url += `?${params.join("&")}`;
  return apiFetch(url);
}

export function createEvent(event) {
  return apiFetch("/calendar", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export function updateEvent(event) {
  return apiFetch(`/calendar/${event.id}`, {
    method: "PUT",
    body: JSON.stringify(event),
  });
}

export function deleteEvent(id) {
  return apiFetch(`/calendar/${id}`, { method: "DELETE" });
}

export function testCalDav() {
  return apiFetch("/calendar/test", { method: "POST" });
}

export function discoverCalendars() {
  return apiFetch("/calendar/discover", { method: "POST" });
}

