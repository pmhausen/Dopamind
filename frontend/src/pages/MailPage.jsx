import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useMail } from "../context/MailContext";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import {
  Mail, Reply, Trash2, Archive, Tag, Send, X, ChevronLeft, Loader,
  Inbox, FileText, AlertCircle, CheckSquare, Clock, Star, Filter, Link, Square, CheckSquare2, ListPlus,
} from "lucide-react";

const TAG_COLORS = {
  important: "bg-danger/10 text-danger",
  todo: "bg-accent/10 text-accent",
  waiting: "bg-warn/10 text-amber-700 dark:text-warn",
  done: "bg-success/10 text-success",
};
const TAG_ICONS = { important: Star, todo: CheckSquare, waiting: Clock, done: CheckSquare };

const FOLDERS = [
  { key: "inbox", folder: "INBOX", icon: Inbox },
  { key: "sent", folder: "Sent", icon: Send },
  { key: "drafts", folder: "Drafts", icon: FileText },
  { key: "trash", folder: "Trash", icon: Trash2 },
  { key: "archive", folder: "Archive", icon: Archive },
];

function MailCompose({ mail, onSend, onDiscard, t }) {
  const [to, setTo] = useState(mail?.to || "");
  const [cc, setCc] = useState(mail?.cc || "");
  const [subject, setSubject] = useState(mail?.subject || "");
  const [body, setBody] = useState(mail?.body || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onSend({ to, cc, subject, body, replyTo: mail?.replyTo });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">{mail?.replyTo ? t("mail.reply") : t("mail.compose")}</h3>
        <button type="button" onClick={onDiscard} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
      </div>
      {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2">{error}</p>}
      <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t("mail.to")} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" required />
      <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder={t("mail.cc")} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
      <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("mail.subject")} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" required />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("mail.body")} rows={8} className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
      <div className="flex gap-2">
        <button type="submit" disabled={sending} className="btn-primary text-sm flex items-center gap-2">{sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("mail.send")}</button>
        <button type="button" onClick={onDiscard} className="btn-ghost text-sm">{t("mail.discard")}</button>
      </div>
    </form>
  );
}

function MailDetail({ mail, t, onReply, onDelete, onArchive, onTag, onUntag, onCreateTask, onBack }) {
  const [showTags, setShowTags] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  return (
    <div className="glass-card p-5 animate-fade-in">
      <button onClick={onBack} className="btn-ghost text-sm mb-4 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> {t("nav.mail")}</button>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{mail.subject}</h3>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-light dark:text-muted-dark">
          <span className="font-medium text-gray-700 dark:text-gray-300">{mail.from}</span>
          {mail.date && <><span>&middot;</span><span>{new Date(mail.date).toLocaleString()}</span></>}
        </div>
        {mail.tags?.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {mail.tags.map((tag) => (
              <span key={tag} className={`badge text-[10px] flex items-center gap-1 ${TAG_COLORS[tag] || "bg-gray-100 dark:bg-white/5"}`}>
                {t(`mail.tags.${tag}`) || tag}
                <button onClick={() => onUntag(tag)} className="ml-0.5 hover:text-danger transition-colors" title={t("mail.removeTag")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={onReply} className="btn-ghost text-sm flex items-center gap-1.5"><Reply className="w-4 h-4" /> {t("mail.reply")}</button>
        <button onClick={() => { onCreateTask(mail); setTaskCreated(true); }} disabled={taskCreated} className="btn-ghost text-sm flex items-center gap-1.5"><CheckSquare className="w-4 h-4" /> {taskCreated ? t("mail.taskCreated") : t("mail.toTask")}</button>
        <button onClick={onArchive} className="btn-ghost text-sm flex items-center gap-1.5"><Archive className="w-4 h-4" /> {t("mail.archive")}</button>
        <div className="relative">
          <button onClick={() => setShowTags(!showTags)} className="btn-ghost text-sm flex items-center gap-1.5"><Tag className="w-4 h-4" /> {t("mail.tag")}</button>
          {showTags && (
            <div className="absolute top-full left-0 mt-1 glass-card p-2 min-w-[140px] z-10 space-y-1">
              {Object.keys(TAG_COLORS).map((tag) => {
                const I = TAG_ICONS[tag];
                const isActive = mail.tags?.includes(tag);
                return (
                  <button key={tag} onClick={() => { isActive ? onUntag(tag) : onTag(tag); setShowTags(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${isActive ? "font-semibold" : ""}`}>
                    <I className="w-3.5 h-3.5" /> {t(`mail.tags.${tag}`)}
                    {isActive && <X className="w-3 h-3 ml-auto text-danger" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={onDelete} className="btn-ghost text-sm flex items-center gap-1.5 text-danger hover:bg-danger/10"><Trash2 className="w-4 h-4" /> {t("mail.delete")}</button>
      </div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4">{mail.body || mail.preview || ""}</div>
    </div>
  );
}

export default function MailPage() {
  const { t } = useI18n();
  const { settings, isMailConfigured } = useSettings();
  const { state, fetchMails, selectMail, deleteMail, archiveMail, tagMail, untagMail, sendMail, startCompose, startReply, dispatch } = useMail();
  const { dispatch: appDispatch } = useApp();
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [selectedUids, setSelectedUids] = useState([]);
  const [showBatchTags, setShowBatchTags] = useState(false);

  const isMultiSelect = selectedUids.length > 0;

  const toggleSelect = useCallback((uid) => {
    setSelectedUids((prev) => prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedUids((prev) => prev.length === state.mails.length ? [] : state.mails.map((m) => m.uid));
  }, [state.mails]);

  const clearSelection = useCallback(() => { setSelectedUids([]); setShowBatchTags(false); }, []);

  const getSelectedMails = useCallback(() => state.mails.filter((m) => selectedUids.includes(m.uid)), [state.mails, selectedUids]);

  const handleCreateTask = (mail) => {
    // Determine priority from mail tags
    const priorityMap = { important: "high", todo: "medium", waiting: "low" };
    const tagPriority = (mail.tags || []).find((tg) => priorityMap[tg]);
    const priority = tagPriority ? priorityMap[tagPriority] : "medium";

    appDispatch({
      type: "ADD_TASK",
      payload: {
        text: mail.subject || "(no subject)",
        priority,
        estimatedMinutes: 25,
        mailRef: { uid: mail.uid, folder: activeFolder, subject: mail.subject, from: mail.from },
      },
    });
    // Also tag the mail as "todo" on IMAP
    tagMail(mail.uid, "todo");
  };

  // Batch: create one task per selected mail
  const handleBatchCreateTasks = () => {
    const mails = getSelectedMails();
    for (const mail of mails) handleCreateTask(mail);
    clearSelection();
  };

  // Batch: create a single task combining all selected mails
  const handleBatchCreateSingleTask = useCallback(() => {
    const mails = getSelectedMails();
    if (mails.length === 0) return;
    const subjects = mails.map((m) => m.subject || "(no subject)");
    const text = mails.length === 1 ? subjects[0] : `${subjects[0]} (+${mails.length - 1})`;
    const priorityMap = { important: "high", todo: "medium", waiting: "low" };
    const allTags = mails.flatMap((m) => m.tags || []);
    const tagPriority = allTags.find((tg) => priorityMap[tg]);
    const priority = tagPriority ? priorityMap[tagPriority] : "medium";
    appDispatch({
      type: "ADD_TASK",
      payload: {
        text,
        priority,
        estimatedMinutes: 25 * mails.length,
        mailRef: { uid: mails[0].uid, folder: activeFolder, subject: text, from: mails[0].from },
      },
    });
    for (const mail of mails) tagMail(mail.uid, "todo");
    clearSelection();
  }, [getSelectedMails, clearSelection, appDispatch, activeFolder, tagMail]);

  // Batch: tag all selected
  const handleBatchTag = useCallback(async (tag) => {
    await Promise.all(selectedUids.map((uid) => tagMail(uid, tag)));
    setShowBatchTags(false);
  }, [selectedUids, tagMail]);

  // Batch: delete all selected
  const handleBatchDelete = useCallback(async () => {
    await Promise.all(selectedUids.map((uid) => deleteMail(uid)));
    clearSelection();
  }, [selectedUids, deleteMail, clearSelection]);

  const masterTag = settings.mail?.masterTagEnabled ? settings.mail?.masterTag : null;

  useEffect(() => {
    if (isMailConfigured) fetchMails(activeFolder, masterTag);
  }, [isMailConfigured, activeFolder, fetchMails, masterTag]);

  if (!isMailConfigured) {
    return (
      <div className="animate-fade-in"><div className="glass-card p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-muted-light dark:text-muted-dark mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("mail.title")}</h3>
        <p className="text-sm text-muted-light dark:text-muted-dark mb-4">{t("mail.connectionError")}</p>
        <a href="/settings" className="btn-primary text-sm inline-block">{t("nav.settings")}</a>
      </div></div>
    );
  }

  if (state.composing) return <div className="animate-fade-in max-w-2xl"><MailCompose mail={state.composing} onSend={sendMail} onDiscard={() => dispatch({ type: "SET_COMPOSING", payload: null })} t={t} /></div>;
  if (state.selectedMail) return <div className="animate-fade-in max-w-3xl"><MailDetail mail={state.selectedMail} t={t} onReply={() => startReply(state.selectedMail)} onDelete={() => deleteMail(state.selectedMail.uid)} onArchive={() => archiveMail(state.selectedMail.uid)} onTag={(tag) => tagMail(state.selectedMail.uid, tag)} onUntag={(tag) => untagMail(state.selectedMail.uid, tag)} onCreateTask={handleCreateTask} onBack={() => selectMail(null)} /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{t("mail.title")}</h2>
          {masterTag && <span className="badge bg-accent/10 text-accent text-[10px] flex items-center gap-1"><Filter className="w-3 h-3" /> {masterTag}</span>}
        </div>
        <button onClick={() => startCompose()} className="btn-primary text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> {t("mail.compose")}</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1"><div className="glass-card p-3 space-y-1">
          {FOLDERS.map(({ key, folder, icon: Icon }) => (
            <button key={folder} onClick={() => { setActiveFolder(folder); selectMail(null); clearSelection(); }} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${activeFolder === folder ? "bg-accent/10 text-accent dark:bg-accent/20 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
              <Icon className="w-4 h-4 flex-shrink-0" /> {t(`mail.folders.${key}`)}
            </button>
          ))}
        </div></div>
        <div className="lg:col-span-3"><div className="glass-card">
          {/* Batch action bar */}
          {isMultiSelect && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200/50 dark:border-white/5 bg-accent/5 rounded-t-xl flex-wrap">
              <button onClick={clearSelection} className="btn-ghost p-1.5" title={t("mail.clearSelection")}><X className="w-4 h-4" /></button>
              <span className="text-sm font-medium text-accent">{t("mail.selected").replace("{n}", String(selectedUids.length))}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Batch tag */}
                <div className="relative">
                  <button onClick={() => setShowBatchTags(!showBatchTags)} className="btn-ghost text-xs flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {t("mail.tag")}</button>
                  {showBatchTags && (
                    <div className="absolute top-full right-0 mt-1 glass-card p-2 min-w-[140px] z-10 space-y-1">
                      {Object.keys(TAG_COLORS).map((tag) => {
                        const I = TAG_ICONS[tag];
                        return (
                          <button key={tag} onClick={() => handleBatchTag(tag)} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <I className="w-3.5 h-3.5" /> {t(`mail.tags.${tag}`)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Batch create single task */}
                <button onClick={handleBatchCreateSingleTask} className="btn-ghost text-xs flex items-center gap-1" title={t("mail.toSingleTask")}>
                  <CheckSquare className="w-3.5 h-3.5" /> {t("mail.toSingleTask")}
                </button>
                {/* Batch create multiple tasks */}
                <button onClick={handleBatchCreateTasks} className="btn-ghost text-xs flex items-center gap-1" title={t("mail.toMultipleTasks")}>
                  <ListPlus className="w-3.5 h-3.5" /> {t("mail.toMultipleTasks")}
                </button>
                {/* Batch delete */}
                <button onClick={handleBatchDelete} className="btn-ghost text-xs flex items-center gap-1 text-danger hover:bg-danger/10" title={t("mail.delete")}>
                  <Trash2 className="w-3.5 h-3.5" /> {t("mail.delete")}
                </button>
              </div>
            </div>
          )}
          {/* Select all header */}
          {!state.loading && !state.error && state.mails.length > 0 && !isMultiSelect && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200/30 dark:border-white/[0.03]">
              <button onClick={toggleSelectAll} className="w-5 h-5 rounded flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-accent transition-colors" title={t("mail.selectAll")}>
                <Square className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-light dark:text-muted-dark">{t("mail.selectAll")}</span>
            </div>
          )}
          {state.loading && <div className="p-8 text-center text-muted-light dark:text-muted-dark"><p className="text-sm">{t("mail.loading")}</p></div>}
          {state.error && <div className="p-8 text-center text-danger"><p className="text-sm">{state.error}</p></div>}
          {!state.loading && !state.error && state.mails.length === 0 && <div className="p-8 text-center text-muted-light dark:text-muted-dark"><Mail className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">{t("mail.noMails")}</p></div>}
          <div className="divide-y divide-gray-200/50 dark:divide-white/5">
            {state.mails.map((m) => {
              const isSelected = selectedUids.includes(m.uid);
              return (
                <div key={m.uid} onClick={(e) => { if (isMultiSelect) { toggleSelect(m.uid); } else { selectMail(m); } }} className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${!m.seen ? "bg-accent/[0.03]" : ""} ${isSelected ? "!bg-accent/10" : ""}`}>
                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(m.uid); }} className={`flex-shrink-0 mt-1 w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? "text-accent" : "text-gray-300 dark:text-gray-600 hover:text-accent"}`}>
                    {isSelected ? <CheckSquare2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-2 w-2">{!m.seen && <div className="w-2 h-2 rounded-full bg-accent" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${!m.seen ? "font-semibold" : "font-medium"}`}>{m.fromName || m.from}</span>
                      {m.tags?.map((tag) => <span key={tag} className={`badge text-[8px] ${TAG_COLORS[tag] || "bg-gray-100 dark:bg-white/10"}`}>{t(`mail.tags.${tag}`) || tag}</span>)}
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${!m.seen ? "font-medium" : ""}`}>{m.subject}</p>
                    <p className="text-xs text-muted-light dark:text-muted-dark truncate mt-0.5">{m.preview}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-light dark:text-muted-dark">{m.date ? new Date(m.date).toLocaleDateString() : ""}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); archiveMail(m.uid); }} className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-accent" title={t("mail.archive")}><Archive className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteMail(m.uid); }} className="w-6 h-6 rounded flex items-center justify-center text-muted-light hover:text-danger" title={t("mail.delete")}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div></div>
      </div>
    </div>
  );
}
