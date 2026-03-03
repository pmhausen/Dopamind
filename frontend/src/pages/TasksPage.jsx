import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useMail } from "../context/MailContext";
import { Mail, Calendar, Plus, ChevronDown, ChevronRight, CheckSquare, Square, Trash2, AlertCircle, Pencil, RotateCcw, Check, X, Tag } from "lucide-react";

const PRIORITY_CONFIG = {
  high: { dot: "bg-danger", color: "bg-danger/10 text-danger dark:bg-danger/20" },
  medium: { dot: "bg-warn", color: "bg-warn/10 text-amber-700 dark:bg-warn/20 dark:text-warn" },
  low: { dot: "bg-success", color: "bg-success/10 text-success dark:bg-success/20" },
};

const TAG_COLORS = [
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
];

function getTagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function sanitizeTag(input) {
  return input.trim().replace(/,/g, "");
}

function isTaskOverdue(task) {
  return !!(task.deadline && !task.completed && new Date(task.deadline + "T23:59:59") < new Date());
}

function SubtaskItem({ subtask, taskId, t }) {
  const { dispatch } = useApp();
  return (
    <div className="flex items-center gap-2 py-1 pl-8">
      <button
        onClick={() => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId: subtask.id } })}
        className="w-4 h-4 flex-shrink-0 text-muted-light dark:text-muted-dark hover:text-accent transition-colors"
      >
        {subtask.completed ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4" />}
      </button>
      <span className={`text-xs flex-1 ${subtask.completed ? "line-through text-muted-light dark:text-muted-dark" : ""}`}>
        {subtask.text}
      </span>
      <button
        onClick={() => dispatch({ type: "DELETE_SUBTASK", payload: { taskId, subtaskId: subtask.id } })}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function TaskItem({ task, t, onTagClick }) {
  const { dispatch } = useApp();
  const { untagMail } = useMail();
  const priority = PRIORITY_CONFIG[task.priority];
  const [expanded, setExpanded] = useState(false);
  const [subtaskText, setSubtaskText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editMinutes, setEditMinutes] = useState(task.estimatedMinutes);
  const [editDeadline, setEditDeadline] = useState(task.deadline || "");
  const [editTags, setEditTags] = useState(task.tags || []);
  const [editTagInput, setEditTagInput] = useState("");

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const tags = task.tags || [];
  const isOverdue = isTaskOverdue(task);

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!subtaskText.trim()) return;
    dispatch({ type: "ADD_SUBTASK", payload: { taskId: task.id, text: subtaskText.trim() } });
    setSubtaskText("");
  };

  const handleDelete = () => {
    if (task.mailRef) untagMail(task.mailRef.uid, "todo");
    dispatch({ type: "DELETE_TASK", payload: task.id });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    dispatch({
      type: "UPDATE_TASK",
      payload: { id: task.id, text: editText.trim(), priority: editPriority, estimatedMinutes: editMinutes, deadline: editDeadline || null, tags: editTags },
    });
    setEditing(false);
  };

  const handleEditTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && editTagInput.trim()) {
      e.preventDefault();
      const tag = sanitizeTag(editTagInput);
      if (tag && !editTags.includes(tag)) setEditTags([...editTags, tag]);
      setEditTagInput("");
    }
  };

  if (editing) {
    return (
      <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-3 space-y-2">
        <form onSubmit={handleSaveEdit} className="space-y-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            autoFocus
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEditPriority(key)}
                  className={`px-2 py-1 rounded-lg text-xs transition-all ${editPriority === key ? cfg.color + " ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}
                >
                  {t(`tasks.priority.${key}`)}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={editMinutes}
                onChange={(e) => setEditMinutes(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-center text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <span className="text-xs text-muted-light dark:text-muted-dark">{t("common.min")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
            {editTags.map((tag) => (
              <span key={tag} className={`badge text-[10px] ${getTagColor(tag)} flex items-center gap-1`}>
                {tag}
                <button type="button" onClick={() => setEditTags(editTags.filter((x) => x !== tag))}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={editTagInput}
              onChange={(e) => setEditTagInput(e.target.value)}
              onKeyDown={handleEditTagKeyDown}
              placeholder={t("tasks.addTag")}
              className="flex-1 min-w-[80px] text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs flex items-center gap-1.5 py-1.5"><Check className="w-3.5 h-3.5" /> {t("common.save")}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`group rounded-xl transition-all duration-200 ${task.completed ? "opacity-60 scale-[0.98]" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => dispatch({ type: task.completed ? "REOPEN_TASK" : "COMPLETE_TASK", payload: task.id })}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            task.completed
              ? "border-success bg-success hover:bg-success/70 hover:border-success/70"
              : "border-gray-300 dark:border-gray-600 hover:border-accent"
          }`}
          title={task.completed ? t("tasks.reopen") : t("tasks.complete")}
        >
          {task.completed && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {(subtasks.length > 0 || !task.completed) && (
              <button onClick={() => setExpanded(!expanded)} className="text-muted-light dark:text-muted-dark hover:text-accent transition-colors">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
            <p className={`text-sm font-medium truncate ${task.completed ? "line-through text-muted-light" : ""}`}>
              {task.text}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`badge text-[10px] ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} mr-1`} />
              {t(`tasks.priority.${task.priority}`)}
            </span>
            <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">
              ~{task.estimatedMinutes}{t("common.min")}
            </span>
            {task.deadline && (
              <span className={`badge text-[10px] flex items-center gap-1 ${isOverdue ? "bg-danger/10 text-danger" : "bg-gray-100 dark:bg-white/5 text-muted-light dark:text-muted-dark"}`}>
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
                {new Date(task.deadline + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
              </span>
            )}
            {task.mailRef && (
              <Link to="/mail" className="badge text-[10px] bg-accent/10 text-accent flex items-center gap-1 hover:bg-accent/20 transition-colors">
                <Mail className="w-3 h-3" /> {t("tasks.fromMail")}
              </Link>
            )}
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-light dark:text-muted-dark">
                {completedSubtasks}/{subtasks.length}
              </span>
            )}
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className={`badge text-[10px] ${getTagColor(tag)} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => { setEditText(task.text); setEditPriority(task.priority); setEditMinutes(task.estimatedMinutes); setEditDeadline(task.deadline || ""); setEditTags(task.tags || []); setEditing(true); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
            title={t("common.edit")}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {task.completed && (
            <button
              onClick={() => dispatch({ type: "REOPEN_TASK", payload: task.id })}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
              title={t("tasks.reopen")}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-light hover:text-danger hover:bg-danger/10 transition-all"
            title={t("common.delete")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded: subtasks + add form */}
      {expanded && (
        <div className="pb-3 px-3">
          {task.mailRef && (
            <Link to="/mail" className="pl-8 pb-2 text-xs text-muted-light dark:text-muted-dark block hover:text-accent transition-colors">
              <Mail className="w-3 h-3 inline mr-1" />
              <span className="font-medium">{task.mailRef.subject}</span>
              {task.mailRef.from && <span className="ml-2">({task.mailRef.from})</span>}
            </Link>
          )}
          {subtasks.map((s) => (
            <SubtaskItem key={s.id} subtask={s} taskId={task.id} t={t} />
          ))}
          {!task.completed && (
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pl-8 mt-1">
              <Plus className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
              <input
                type="text"
                value={subtaskText}
                onChange={(e) => setSubtaskText(e.target.value)}
                placeholder={t("tasks.addSubtask")}
                className="flex-1 text-xs px-2 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [minutes, setMinutes] = useState(25);
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [filterTag, setFilterTag] = useState(null);

  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = sanitizeTag(tagInput);
      if (tag && !tags.includes(tag)) setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({
      type: "ADD_TASK",
      payload: { text: text.trim(), priority, estimatedMinutes: minutes, deadline: deadline || null, tags },
    });
    setText("");
    setDeadline("");
    setTags([]);
    setTagInput("");
  };

  const allTags = useMemo(() => {
    const tagSet = new Set();
    state.tasks.forEach((tk) => (tk.tags || []).forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [state.tasks]);

  const filteredTasks = state.tasks.filter((task) => {
    if (filter === "open" && task.completed) return false;
    if (filter === "done" && !task.completed) return false;
    if (filterTag && !(task.tags || []).includes(filterTag)) return false;
    return true;
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (sortBy === "deadline") {
      const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return aD - bD;
    }
    if (sortBy === "created") {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    const aOverdue = isTaskOverdue(a) ? 0 : 1;
    const bOverdue = isTaskOverdue(b) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-4">
          {t("tasks.title")}
        </h2>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("tasks.addPlaceholder")}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
            />
            <button type="submit" className="btn-primary text-sm whitespace-nowrap">
              {t("tasks.add")}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    priority === key
                      ? cfg.color + " ring-1 ring-current/20"
                      : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {t(`tasks.priority.${key}`)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <span className="text-muted-light dark:text-muted-dark">{t("common.min")}</span>
            </div>
          </div>
          {/* Tag input */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
            {tags.map((tag) => (
              <span key={tag} className={`badge text-[10px] ${getTagColor(tag)} flex items-center gap-1`}>
                {tag}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== tag))}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={t("tasks.addTag")}
              className="flex-1 min-w-[100px] text-xs px-2 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
        </form>

        {/* Filter + Sort bar */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex gap-1">
            {["all", "open", "done"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-accent/10 text-accent dark:bg-accent/20"
                    : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {t(`tasks.filter.${f}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.sortBy")}:</span>
            {["priority", "deadline", "created"].map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  sortBy === s
                    ? "bg-accent/10 text-accent dark:bg-accent/20"
                    : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {t(`tasks.sort.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
            {filterTag && (
              <button
                onClick={() => setFilterTag(null)}
                className="badge text-[10px] bg-gray-100 dark:bg-white/10 text-muted-light dark:text-muted-dark flex items-center gap-1"
              >
                <X className="w-2.5 h-2.5" /> {t("tasks.clearFilter")}
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`badge text-[10px] ${getTagColor(tag)} transition-opacity ${filterTag === tag ? "ring-1 ring-current/40" : "opacity-70 hover:opacity-100"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Task list */}
        <div className="space-y-1">
          {sortedTasks.length === 0 && (
            <div className="text-center py-8 text-muted-light dark:text-muted-dark">
              <p className="text-sm">{t("tasks.empty")}</p>
              <p className="text-xs mt-1">{t("tasks.emptyHint")}</p>
            </div>
          )}
          {sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              t={t}
              onTagClick={(tag) => setFilterTag((prev) => (prev === tag ? null : tag))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
