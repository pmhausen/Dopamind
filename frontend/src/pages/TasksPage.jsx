import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { useMail } from "../context/MailContext";
import { useSettings } from "../context/SettingsContext";
import CountdownStart from "../components/CountdownStart";
import { Mail, Calendar, Plus, ChevronDown, ChevronRight, CheckSquare, Square, Trash2, AlertCircle, Pencil, RotateCcw, Check, X, Tag, Clock, Folder, CalendarDays, Settings2, GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const PRIORITY_CONFIG = {
  high: { dot: "bg-danger", color: "bg-danger/10 text-danger dark:bg-danger/20" },
  medium: { dot: "bg-warn", color: "bg-warn/10 text-amber-700 dark:bg-warn/20 dark:text-warn" },
  low: { dot: "bg-success", color: "bg-success/10 text-success dark:bg-success/20" },
};

const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
];

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

function SubtaskItem({ subtask, taskId, t, countdownStartEnabled }) {
  const { dispatch } = useApp();
  const [editingMin, setEditingMin] = useState(false);
  const [minVal, setMinVal] = useState(subtask.estimatedMinutes || 0);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedTime, setSchedTime] = useState(subtask.scheduledTime || "");
  const [schedDate, setSchedDate] = useState(subtask.scheduledDate || "");
  const [showCountdown, setShowCountdown] = useState(false);
  const saveMinutes = () => {
    dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId: subtask.id, estimatedMinutes: minVal } });
    setEditingMin(false);
  };
  const saveSchedule = () => {
    dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId: subtask.id, scheduledTime: schedTime || null, scheduledDate: schedDate || null } });
    setEditingSchedule(false);
  };
  return (
    <div className="py-1 pl-8">
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId, subtaskId: subtask.id } })}
          className="w-4 h-4 flex-shrink-0 text-muted-light dark:text-muted-dark hover:text-accent transition-colors"
        >
          {subtask.completed ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4" />}
        </button>
        {!subtask.completed && countdownStartEnabled && (
          <button
            onClick={() => setShowCountdown(true)}
            className="w-4 h-4 flex-shrink-0 rounded text-muted-light dark:text-muted-dark hover:text-accent hover:bg-accent/10 transition-all flex items-center justify-center text-[10px]"
            title={t("tasks.startNow")}
          >
            ▶
          </button>
        )}
        <span className={`text-xs flex-1 ${subtask.completed ? "line-through text-muted-light dark:text-muted-dark" : ""}`}>
          {subtask.text}
        </span>
        {editingMin ? (
          <input
            type="number"
            min={0}
            max={480}
            step={5}
            value={minVal}
            autoFocus
            onChange={(e) => setMinVal(Number(e.target.value))}
            onBlur={saveMinutes}
            onKeyDown={(e) => { if (e.key === "Enter") saveMinutes(); }}
            className="w-12 px-1 py-0.5 rounded text-[10px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
        ) : (
          <button
            onClick={() => setEditingMin(true)}
            className="text-[10px] text-muted-light dark:text-muted-dark hover:text-accent transition-colors font-mono px-1"
            title={t("tasks.subtaskMinutes")}
          >
            {subtask.estimatedMinutes ? `${subtask.estimatedMinutes}${t("common.min")}` : `+${t("common.min")}`}
          </button>
        )}
        <button
          onClick={() => setEditingSchedule(!editingSchedule)}
          className={`text-[10px] transition-colors font-mono px-1 ${subtask.scheduledTime || subtask.scheduledDate ? "text-accent" : "text-muted-light dark:text-muted-dark hover:text-accent"}`}
          title={t("tasks.scheduledTime")}
        >
          <Clock className="w-3 h-3 inline" />
          {subtask.scheduledTime && <span className="ml-0.5">{subtask.scheduledTime}</span>}
        </button>
        <button
          onClick={() => dispatch({ type: "DELETE_SUBTASK", payload: { taskId, subtaskId: subtask.id } })}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {editingSchedule && (
        <div className="flex items-center gap-2 mt-1 ml-6">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-light dark:text-muted-dark" />
            <input
              type="time"
              value={schedTime}
              onChange={(e) => setSchedTime(e.target.value)}
              className="px-1.5 py-0.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3 text-muted-light dark:text-muted-dark" />
            <input
              type="date"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
              className="px-1.5 py-0.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[10px] focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={saveSchedule}
            className="text-accent text-[10px] font-medium hover:underline"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setEditingSchedule(false)}
            className="text-muted-light text-[10px] hover:text-danger"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {showCountdown && (
        <CountdownStart
          estimatedMinutes={subtask.estimatedMinutes || 25}
          onClose={() => setShowCountdown(false)}
        />
      )}
    </div>
  );
}

function TaskItem({ task, t, onTagClick, onCategoryClick, categories, countdownStartEnabled }) {
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
  const [editScheduledTime, setEditScheduledTime] = useState(task.scheduledTime || "");
  const [editScheduledDate, setEditScheduledDate] = useState(task.scheduledDate || "");
  const [editCategory, setEditCategory] = useState(task.category || "");
  const [editTags, setEditTags] = useState(task.tags || []);
  const [editTagInput, setEditTagInput] = useState("");
  const [showCountdown, setShowCountdown] = useState(false);

  const catObj = categories.find((c) => c.id === task.category);

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
      payload: {
        id: task.id,
        text: editText.trim(),
        priority: editPriority,
        estimatedMinutes: editMinutes,
        deadline: editDeadline || null,
        scheduledTime: editScheduledTime || null,
        scheduledDate: editScheduledDate || null,
        category: editCategory || null,
        tags: editTags,
      },
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
              title={t("tasks.deadline")}
              className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
              <input
                type="time"
                value={editScheduledTime}
                onChange={(e) => setEditScheduledTime(e.target.value)}
                title={t("tasks.scheduledTime")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
              <input
                type="date"
                value={editScheduledDate}
                onChange={(e) => setEditScheduledDate(e.target.value)}
                title={t("tasks.scheduledDate")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={editMinutes}
                onChange={(e) => setEditMinutes(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-center text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <span className="text-xs text-muted-light dark:text-muted-dark">{t("common.min")}</span>
            </div>
          </div>
          {/* Category selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
            <button
              type="button"
              onClick={() => setEditCategory("")}
              className={`px-2 py-1 rounded-lg text-[10px] transition-all ${!editCategory ? "bg-gray-200 dark:bg-white/10 ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}
            >
              {t("tasks.noCategory")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setEditCategory(cat.id)}
                className={`px-2 py-1 rounded-lg text-[10px] transition-all ${editCategory === cat.id ? (cat.color || "bg-gray-100 text-gray-700") + " ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}
              >
                {cat.emoji}
              </button>
            ))}
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
    <div
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); }}
      className={`group rounded-xl transition-all duration-200 ${task.completed ? "opacity-60 scale-[0.98]" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"}`}
    >
      <div className="flex items-center gap-3 p-3">
        <span className="w-4 flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity">
          <GripVertical className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
        </span>
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
            {catObj && (
              <button
                onClick={() => onCategoryClick(catObj.id)}
                className={`badge text-[10px] ${catObj.color || "bg-gray-100 text-gray-700"} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {catObj.emoji}
              </button>
            )}
            <span className={`badge text-[10px] ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} mr-1`} />
              {t(`tasks.priority.${task.priority}`)}
            </span>
            <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">
              ~{task.estimatedMinutes}{t("common.min")}
            </span>
            {task.scheduledTime && (
              <span className="badge text-[10px] bg-accent/10 text-accent flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.scheduledTime}
              </span>
            )}
            {task.scheduledDate && (
              <span className="badge text-[10px] bg-accent/10 text-accent flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {new Date(task.scheduledDate + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
              </span>
            )}
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
          {!task.completed && countdownStartEnabled && (
            <button
              onClick={() => setShowCountdown(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
              title={t("tasks.startNow")}
            >
              <span className="text-xs font-bold">▶</span>
            </button>
          )}
          <button
            onClick={() => { setEditText(task.text); setEditPriority(task.priority); setEditMinutes(task.estimatedMinutes); setEditDeadline(task.deadline || ""); setEditScheduledTime(task.scheduledTime || ""); setEditScheduledDate(task.scheduledDate || ""); setEditCategory(task.category || ""); setEditTags(task.tags || []); setEditing(true); }}
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
            <SubtaskItem key={s.id} subtask={s} taskId={task.id} t={t} countdownStartEnabled={countdownStartEnabled} />
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
      {showCountdown && (
        <CountdownStart
          estimatedMinutes={task.estimatedMinutes || 25}
          onClose={() => setShowCountdown(false)}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { settings } = useSettings();
  const countdownStartEnabled = settings.gamification?.countdownStartEnabled !== false;
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [minutes, setMinutes] = useState(25);
  const [deadline, setDeadline] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [filterTag, setFilterTag] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [addFormExpanded, setAddFormExpanded] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📁");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatEmoji, setEditCatEmoji] = useState("");

  const categories = state.categories || [];

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
      payload: {
        text: text.trim(),
        priority,
        estimatedMinutes: minutes,
        deadline: deadline || null,
        scheduledTime: scheduledTime || null,
        scheduledDate: scheduledDate || null,
        category: category || null,
        tags,
      },
    });
    setText("");
    setDeadline("");
    setScheduledTime("");
    setScheduledDate("");
    setCategory("");
    setTags([]);
    setTagInput("");
    setAddFormExpanded(false);
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
    if (filterCategory && task.category !== filterCategory) return false;
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

  // Count tasks per category for aggregated display
  const taskCountByCategory = useMemo(() => {
    const counts = {};
    state.tasks.forEach((tk) => {
      const cat = tk.category || "_none";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [state.tasks]);

  // Helper: get display name for a category (strips emoji prefix from i18n if present)
  const getCatDisplayName = (cat) => {
    const key = `tasks.categories.${cat.name}`;
    const translated = t(key);
    if (translated !== key) return translated.replace(/^[^\s]+\s/, '');
    return cat.name;
  };

  // Handle drag-and-drop of tasks into categories
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const handleCatDragOver = (e, catId) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCatId(catId); };
  const handleCatDragLeave = () => setDragOverCatId(null);
  const handleCatDrop = (e, catId) => {
    e.preventDefault();
    setDragOverCatId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      dispatch({ type: "UPDATE_TASK", payload: { id: taskId, category: catId === "_none" ? null : catId } });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{t("tasks.title")}</h2>
          {filterCategory && categories.find((c) => c.id === filterCategory) && (
            <span className="badge bg-accent/10 text-accent text-xs flex items-center gap-1">
              {categories.find((c) => c.id === filterCategory)?.emoji} {getCatDisplayName(categories.find((c) => c.id === filterCategory))}
              <button onClick={() => setFilterCategory(null)} className="ml-0.5 hover:text-danger"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
            title={t("tasks.category")}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => setAddFormExpanded(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("tasks.add")}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${sidebarOpen ? "lg:grid-cols-4" : ""}`}>
        {/* Category sidebar — collapsible, hidden on mobile by default */}
        {sidebarOpen && (
          <div className="hidden lg:block lg:col-span-1">
            <div className="glass-card p-4 space-y-1.5 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("tasks.category")}</h3>
                <button
                  onClick={() => setManagingCategories((v) => !v)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
                  title={t("tasks.manageCategories")}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* "All" category */}
              <button
                onClick={() => setFilterCategory(null)}
                onDragOver={(e) => handleCatDragOver(e, "_none")}
                onDragLeave={handleCatDragLeave}
                onDrop={(e) => handleCatDrop(e, "_none")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  !filterCategory ? "bg-accent/10 text-accent dark:bg-accent/20 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                } ${dragOverCatId === "_none" ? "ring-2 ring-accent/40" : ""}`}
              >
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{t("tasks.filter.all")}</span>
                <span className="text-xs font-mono opacity-60">{state.tasks.length}</span>
              </button>

              {/* Category list — each is a drop target */}
              {categories.map((cat) => (
                <div key={cat.id}>
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <input
                        value={editCatEmoji}
                        onChange={(e) => setEditCatEmoji(e.target.value)}
                        className="w-8 px-1 py-1 rounded-lg text-center text-sm bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                      />
                      <input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                      />
                      <button
                        onClick={() => { dispatch({ type: "UPDATE_CATEGORY", payload: { id: cat.id, name: editCatName, emoji: editCatEmoji } }); setEditingCatId(null); }}
                        className="text-accent"
                      ><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingCatId(null)} className="text-muted-light"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                      onDragOver={(e) => handleCatDragOver(e, cat.id)}
                      onDragLeave={handleCatDragLeave}
                      onDrop={(e) => handleCatDrop(e, cat.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all group/cat ${
                        filterCategory === cat.id ? (cat.color || "bg-accent/10 text-accent") + " font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                      } ${dragOverCatId === cat.id ? "ring-2 ring-accent/40 scale-[1.02]" : ""}`}
                    >
                      <span className="flex-shrink-0 text-base">{cat.emoji}</span>
                      <span className="flex-1 text-left truncate">{getCatDisplayName(cat)}</span>
                      <span className="text-xs font-mono opacity-60">{taskCountByCategory[cat.id] || 0}</span>
                      {managingCategories && (
                        <span className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                          <span
                            onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditCatName(cat.name); setEditCatEmoji(cat.emoji); }}
                            className="cursor-pointer hover:text-accent"
                          ><Pencil className="w-3 h-3" /></span>
                          <span
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: "DELETE_CATEGORY", payload: cat.id }); }}
                            className="cursor-pointer hover:text-danger"
                          ><Trash2 className="w-3 h-3" /></span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}

              {/* Add category (visible in manage mode) */}
              {managingCategories && (
                <div className="pt-2 flex items-center gap-1.5">
                  <input
                    value={newCatEmoji}
                    onChange={(e) => setNewCatEmoji(e.target.value)}
                    placeholder="📁"
                    className="w-8 px-1 py-1 rounded-lg text-center text-sm bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                  />
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t("tasks.categoryName")}
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      const colorIdx = categories.length % CATEGORY_COLORS.length;
                      dispatch({ type: "ADD_CATEGORY", payload: { name: newCatName.trim(), emoji: newCatEmoji || "📁", color: CATEGORY_COLORS[colorIdx] } });
                      setNewCatName("");
                      setNewCatEmoji("📁");
                    }}
                    className="text-accent"
                  ><Plus className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile category chips (visible on small screens when sidebar hidden) */}
        <div className="lg:hidden col-span-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Folder className="w-4 h-4 text-muted-light dark:text-muted-dark flex-shrink-0" />
            {filterCategory && (
              <button
                onClick={() => setFilterCategory(null)}
                className="badge text-xs bg-gray-100 dark:bg-white/10 text-muted-light dark:text-muted-dark flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t("tasks.clearFilter")}
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                onDragOver={(e) => handleCatDragOver(e, cat.id)}
                onDragLeave={handleCatDragLeave}
                onDrop={(e) => handleCatDrop(e, cat.id)}
                className={`badge text-xs ${cat.color || "bg-gray-100 text-gray-700"} transition-opacity ${filterCategory === cat.id ? "ring-1 ring-current/40" : "opacity-70 hover:opacity-100"} ${dragOverCatId === cat.id ? "ring-2 ring-accent/40" : ""}`}
              >
                {cat.emoji} <span className="ml-0.5 font-mono">{taskCountByCategory[cat.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main task list */}
        <div className={sidebarOpen ? "lg:col-span-3" : "col-span-1"}>
          <div className="glass-card">
            {/* Collapsible Add form */}
            {addFormExpanded && (
              <div className="p-5 border-b border-gray-200/50 dark:border-white/5 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider">{t("tasks.add")}</h3>
                  <button onClick={() => setAddFormExpanded(false)} className="text-xs text-muted-light dark:text-muted-dark hover:text-accent">{t("tasks.addTaskCollapse")}</button>
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("tasks.addPlaceholder")}
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  />
                  {/* Row 1: Priority */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
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
                  {/* Row 2: Dates & Times */}
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        title={t("tasks.deadline")}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        title={t("tasks.scheduledDate")}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        title={t("tasks.scheduledTime")}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                        className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-center text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                      <span className="text-muted-light dark:text-muted-dark">{t("common.min")}</span>
                    </div>
                  </div>
                  {/* Row 3: Category */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(category === cat.id ? "" : cat.id)}
                        className={`px-2 py-1 rounded-lg text-xs transition-all ${category === cat.id ? (cat.color || "bg-gray-100 text-gray-700") + " ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}
                      >
                        {cat.emoji}
                      </button>
                    ))}
                  </div>
                  {/* Row 4: Tags */}
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
                      className="flex-1 min-w-[100px] text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                  </div>
                  {/* Submit */}
                  <button type="submit" className="btn-primary text-sm w-full">
                    {t("tasks.add")}
                  </button>
                </form>
              </div>
            )}

            {/* Filter + Sort bar */}
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-200/50 dark:border-white/5 flex-wrap">
              <div className="flex gap-1.5">
                {["all", "open", "done"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
              <div className="flex items-center gap-1.5 flex-wrap px-5 py-2 border-b border-gray-200/50 dark:border-white/5">
                <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                {filterTag && (
                  <button
                    onClick={() => setFilterTag(null)}
                    className="badge text-xs bg-gray-100 dark:bg-white/10 text-muted-light dark:text-muted-dark flex items-center gap-1"
                  >
                    <X className="w-2.5 h-2.5" /> {t("tasks.clearFilter")}
                  </button>
                )}
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className={`badge text-xs ${getTagColor(tag)} transition-opacity ${filterTag === tag ? "ring-1 ring-current/40" : "opacity-70 hover:opacity-100"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Task list */}
            <div className="divide-y divide-gray-200/50 dark:divide-white/5">
              {sortedTasks.length === 0 && (
                <div className="text-center py-12 text-muted-light dark:text-muted-dark">
                  <p className="text-sm">{t("tasks.empty")}</p>
                  <p className="text-xs mt-1">{t("tasks.emptyHint")}</p>
                </div>
              )}
              {sortedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  t={t}
                  categories={categories}
                  onTagClick={(tag) => setFilterTag((prev) => (prev === tag ? null : tag))}
                  onCategoryClick={(cat) => setFilterCategory((prev) => (prev === cat ? null : cat))}
                  countdownStartEnabled={countdownStartEnabled}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
