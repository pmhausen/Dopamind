import { apiFetch } from "./api";

export function fetchMails(folder = "INBOX", masterTag = null) {
  let url = `/mail?folder=${encodeURIComponent(folder)}`;
  if (masterTag) url += `&tag=${encodeURIComponent(masterTag)}`;
  return apiFetch(url);
}

export function fetchMailDetail(uid, folder = "INBOX") {
  return apiFetch(`/mail/${uid}?folder=${encodeURIComponent(folder)}`);
}

export function markSeen(uid) {
  return apiFetch(`/mail/${uid}/seen`, { method: "PUT" });
}

export function deleteMail(uid) {
  return apiFetch(`/mail/${uid}`, { method: "DELETE" });
}

export function archiveMail(uid) {
  return apiFetch(`/mail/${uid}/archive`, { method: "PUT" });
}

export function tagMail(uid, tag) {
  return apiFetch(`/mail/${uid}/tag`, {
    method: "PUT",
    body: JSON.stringify({ tag }),
  });
}

export function untagMail(uid, tag) {
  return apiFetch(`/mail/${uid}/untag`, {
    method: "PUT",
    body: JSON.stringify({ tag }),
  });
}

export function sendMail(data) {
  return apiFetch("/mail/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function testConnection() {
  return apiFetch("/mail/test", { method: "POST" });
}
