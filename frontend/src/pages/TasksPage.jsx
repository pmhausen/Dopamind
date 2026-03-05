import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useApp } from "../context/AppContext";
import { LABEL_COLORS, resolveCatColorKey } from "../context/AppContext";
import { useMail } from "../context/MailContext";
import { useSettings } from "../context/SettingsContext";
import { useQuickAdd } from "../context/QuickAddContext";
import CountdownStart from "../components/CountdownStart";
import TaskFormModal from "../components/TaskFormModal";
import { Mail, Calendar, Plus, ChevronDown, ChevronRight, CheckSquare, Square, Trash2, AlertCircle, Pencil, RotateCcw, Check, X, Tag, Clock, Folder, CalendarDays, Settings2, GripVertical, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const PRIORITY_CONFIG = {
  high: { dot: "bg-danger", color: "bg-danger/10 text-danger dark:bg-danger/20" },
  medium: { dot: "bg-warn", color: "bg-warn/10 text-amber-700 dark:bg-warn/20 dark:text-warn" },
  low: { dot: "bg-success", color: "bg-success/10 text-success dark:bg-success/20" },
};

const ENERGY_CONFIG = {
  low: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  high: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};

const TIME_OF_DAY_OPTIONS = ["morning", "afternoon", "evening", "exact"];

const LABEL_COLOR_KEYS = Object.keys(LABEL_COLORS);

function sanitizeTag(input) {
  return input.trim().replace(/,/g, "");
}

function isTaskOverdue(task) {
  return !!(task.deadline && !task.completed && new Date(task.deadline + "T23:59:59") < new Date());
}

function SubtaskItem({ subtask, taskId, task, t, countdownStartEnabled, categories, sizeMappings }) {
  const { dispatch } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

  const handleEditSubmit = (formData) => {
    dispatch({ type: "UPDATE_SUBTASK", payload: { taskId, subtaskId: subtask.id, ...formData } });
  };

  const isOverdue = subtask.deadline && new Date(subtask.deadline + "T23:59:59") < new Date();
  const priCfg = PRIORITY_CONFIG[subtask.priority];

  return (
    <div className="py-1 pl-8 group/sub">
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
        <button
          onClick={() => setShowEditModal(true)}
          className="opacity-0 group-hover/sub:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
          title={t("tasks.editSubtask")}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => dispatch({ type: "DELETE_SUBTASK", payload: { taskId, subtaskId: subtask.id } })}
          className="opacity-0 group-hover/sub:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-light hover:text-danger transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {/* Badges row — priority dot, deadline, tags only */}
      <div className="flex items-center gap-1.5 mt-0.5 ml-6 flex-wrap">
        {priCfg && (
          <span className={`w-1.5 h-1.5 rounded-full ${priCfg.dot} flex-shrink-0`} role="img" aria-label={subtask.priority} />
        )}
        {subtask.deadline && (
          <span className={`badge text-[9px] flex items-center gap-0.5 ${isOverdue ? "bg-danger/10 text-danger" : "bg-gray-100 dark:bg-white/5 text-muted-light dark:text-muted-dark"}`}>
            {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
            <Calendar className="w-2.5 h-2.5" />
            {new Date(subtask.deadline + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
          </span>
        )}
        {(subtask.tags || []).map((tag) => (
          <span key={tag} className={`badge text-[9px] ${LABEL_COLORS.gray.bg} ${LABEL_COLORS.gray.text}`}>{tag}</span>
        ))}
      </div>
      {showEditModal && (
        <TaskFormModal
          t={t}
          isSubtask
          initialValues={subtask}
          inheritedCategory={task?.category}
          categories={categories}
          sizeMappings={sizeMappings}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showCountdown && (
        <CountdownStart
          taskId={subtask.id}
          taskText={subtask.text}
          estimatedMinutes={subtask.estimatedMinutes || 25}
          sizeCategory={subtask.sizeCategory}
          onClose={() => setShowCountdown(false)}
        />
      )}
    </div>
  );
}

function TaskItem({ task, t, onTagClick, onCategoryClick, categories, countdownStartEnabled, sizeMappings }) {
  const { dispatch } = useApp();
  const { untagMail } = useMail();
  const { openQuickAdd } = useQuickAdd();
  const priority = PRIORITY_CONFIG[task.priority];
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editEnergyCost, setEditEnergyCost] = useState(task.energyCost || "medium");
  const [editSizeCategory, setEditSizeCategory] = useState(task.sizeCategory || "medium");
  const [editCustomMinutes, setEditCustomMinutes] = useState(task.sizeCategory ? null : (task.estimatedMinutes || null));
  const [editShowCustom, setEditShowCustom] = useState(!!(task.estimatedMinutes && !task.sizeCategory && task.estimatedMinutes !== 25));
  const [editDeadline, setEditDeadline] = useState(task.deadline || "");
  const [editTimeOfDay, setEditTimeOfDay] = useState(task.timeOfDay || "");
  const [editScheduledTime, setEditScheduledTime] = useState(task.scheduledTime || "");
  const [editScheduledDate, setEditScheduledDate] = useState(task.scheduledDate || "");
  const [editCategory, setEditCategory] = useState(task.category || "");
  const [editTags, setEditTags] = useState(task.tags || []);
  const [editTagInput, setEditTagInput] = useState("");
  const [editShowDetails, setEditShowDetails] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

  const catObj = categories.find((c) => c.id === task.category);

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const tags = task.tags || [];
  const isOverdue = isTaskOverdue(task);

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
        energyCost: editEnergyCost,
        estimatedMinutes: editShowCustom && editCustomMinutes ? editCustomMinutes : (sizeMappings[editSizeCategory] || 25),
        sizeCategory: editShowCustom ? null : editSizeCategory,
        deadline: editDeadline || null,
        timeOfDay: editTimeOfDay || null,
        scheduledTime: (editTimeOfDay === "exact" ? editScheduledTime : null) || null,
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
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setEditing(false); }}>
        <div className="modal-card p-6 max-w-lg w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{t("common.edit")}</h3>
            <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-5">
            {/* Task name */}
            <div>
              <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionWhat")}</label>
              <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus />
            </div>
            {/* Importance */}
            <div>
              <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionImportance")}</label>
              <div className="flex gap-1.5">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setEditPriority(key)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${editPriority === key ? cfg.color + " ring-1 ring-current/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                    {t(`tasks.priority.${key}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* When */}
            <div>
              <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionWhen")}</label>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark" />
                <input type="date" value={editScheduledDate} onChange={(e) => setEditScheduledDate(e.target.value)} className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => setEditTimeOfDay(editTimeOfDay === opt ? "" : opt)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editTimeOfDay === opt ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                    {t(`tasks.timeOfDayOptions.${opt}`)}
                  </button>
                ))}
              </div>
              {editTimeOfDay === "exact" && (
                <input type="time" value={editScheduledTime} onChange={(e) => setEditScheduledTime(e.target.value)} className="mt-2 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
              )}
            </div>
            {/* Energy */}
            <div>
              <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionEnergy")}</label>
              <div className="flex gap-1.5">
                {Object.entries(ENERGY_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setEditEnergyCost(key)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${editEnergyCost === key ? cfg.color + " ring-1 ring-current/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                    {t(`tasks.energy.${key}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Duration (T-shirt sizing) */}
            <div>
              <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionDuration")}</label>
              <div className="flex gap-1.5">
                {["quick", "short", "medium", "long"].map((key) => (
                  <button key={key} type="button" onClick={() => { setEditSizeCategory(key); setEditShowCustom(false); }} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${!editShowCustom && editSizeCategory === key ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                    {t(`tasks.size.${key}`)} <span className="opacity-50">~{sizeMappings[key]}{t("common.min")}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setEditShowCustom(!editShowCustom); if (!editCustomMinutes) setEditCustomMinutes(sizeMappings[editSizeCategory] || 25); }} className={`mt-1 text-[10px] transition-colors ${editShowCustom ? "text-accent font-medium" : "text-muted-light dark:text-muted-dark hover:text-accent"}`}>
                {editShowCustom ? t("tasks.sizeUsePreset") : t("tasks.sizeCustom")}
              </button>
              {editShowCustom && (
                <div className="flex items-center gap-2 mt-1 animate-fade-in">
                  <input type="range" min={5} max={240} step={5} value={editCustomMinutes || 25} onChange={(e) => setEditCustomMinutes(Number(e.target.value))} className="flex-1 accent-accent" />
                  <span className="text-xs font-mono text-accent w-12 text-right">{editCustomMinutes || 25}{t("common.min")}</span>
                </div>
              )}
            </div>
            {/* Details */}
            <div>
              <button type="button" onClick={() => setEditShowDetails(!editShowDetails)} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5">
                {editShowDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t("tasks.sectionDetails")}
              </button>
              {editShowDetails && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.hardDeadline")}</span>
                    <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    <button type="button" onClick={() => setEditCategory("")} className={`px-2.5 py-1 rounded-lg text-xs transition-all ${!editCategory ? "bg-gray-200 dark:bg-white/10 ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}>{t("tasks.noCategory")}</button>
                    {categories.map((cat) => {
                      const ck = resolveCatColorKey(cat.color);
                      const lc = LABEL_COLORS[ck] || LABEL_COLORS.gray;
                      return (
                        <button key={cat.id} type="button" onClick={() => setEditCategory(cat.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${editCategory === cat.id ? lc.bg + " " + lc.text + " ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lc.dot}`} />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    {editTags.map((tag) => (
                      <span key={tag} className={`badge text-[10px] ${LABEL_COLORS.gray.bg} ${LABEL_COLORS.gray.text} flex items-center gap-1`}>{tag}<button type="button" onClick={() => setEditTags(editTags.filter((x) => x !== tag))}><X className="w-2.5 h-2.5" /></button></span>
                    ))}
                    <input type="text" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={handleEditTagKeyDown} placeholder={t("tasks.addTag")} className="flex-1 min-w-[80px] text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs flex items-center gap-1.5 py-1.5 flex-1"><Check className="w-3.5 h-3.5" /> {t("common.save")}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5"><X className="w-3.5 h-3.5" /></button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const catColorKey = catObj ? resolveCatColorKey(catObj.color) : null;
  const catLabelColor = catColorKey ? (LABEL_COLORS[catColorKey] || LABEL_COLORS.gray) : null;

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); }}
      className={`group rounded-xl transition-all duration-200 border-l-[3px] ${catLabelColor ? catLabelColor.leftBorder : "border-l-transparent"} ${task.completed ? "opacity-60 scale-[0.98]" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"}`}
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
            <button onClick={() => setExpanded(!expanded)} className="text-muted-light dark:text-muted-dark hover:text-accent transition-colors" aria-label={expanded ? t("common.collapse") : t("common.expand")}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <p className={`text-sm font-medium truncate ${task.completed ? "line-through text-muted-light" : ""}`}>
              {task.text}
            </p>
          </div>
          {/* Collapsed badge row: priority dot, deadline, subtask counter, tags */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priority.dot}`} role="img" aria-label={t(`tasks.priority.${task.priority}`)} />
            {task.deadline && (
              <span className={`badge text-[10px] flex items-center gap-1 ${isOverdue ? "bg-danger/10 text-danger" : "bg-gray-100 dark:bg-white/5 text-muted-light dark:text-muted-dark"}`}>
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
                {new Date(task.deadline + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}
              </span>
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
                className={`badge text-[10px] ${LABEL_COLORS.gray.bg} ${LABEL_COLORS.gray.text} cursor-pointer hover:opacity-80 transition-opacity`}
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
            onClick={() => { setEditText(task.text); setEditPriority(task.priority); setEditEnergyCost(task.energyCost || "medium"); setEditDeadline(task.deadline || ""); setEditTimeOfDay(task.timeOfDay || ""); setEditScheduledTime(task.scheduledTime || ""); setEditScheduledDate(task.scheduledDate || ""); setEditCategory(task.category || ""); setEditTags(task.tags || []); setEditing(true); }}
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

      {/* Expanded: metadata + subtasks + add form */}
      {expanded && (
        <div className="pb-3 px-3">
          {/* Expanded metadata row */}
          <div className="flex items-center gap-2 pl-8 pb-2 flex-wrap">
            <span className={`badge text-[10px] ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} mr-1`} />
              {t(`tasks.priority.${task.priority}`)}
            </span>
            {task.energyCost && (
              <span className={`badge text-[10px] ${ENERGY_CONFIG[task.energyCost]?.color || "bg-gray-100 text-gray-700"}`}>
                {t(`tasks.energy.${task.energyCost}`)}
              </span>
            )}
            <span className="text-[10px] text-muted-light dark:text-muted-dark font-mono">
              ~{task.estimatedMinutes}{t("common.min")}
            </span>
            {task.timeOfDay && task.timeOfDay !== "exact" && (
              <span className="badge text-[10px] bg-accent/10 text-accent">
                {t(`tasks.timeOfDayOptions.${task.timeOfDay}`)}
              </span>
            )}
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
            {task.mailRef && (
              <Link to="/mail" className="badge text-[10px] bg-accent/10 text-accent flex items-center gap-1 hover:bg-accent/20 transition-colors">
                <Mail className="w-3 h-3" /> {t("tasks.fromMail")}
              </Link>
            )}
          </div>
          {task.mailRef && (
            <Link to="/mail" className="pl-8 pb-2 text-xs text-muted-light dark:text-muted-dark block hover:text-accent transition-colors">
              <Mail className="w-3 h-3 inline mr-1" />
              <span className="font-medium">{task.mailRef.subject}</span>
              {task.mailRef.from && <span className="ml-2">({task.mailRef.from})</span>}
            </Link>
          )}
          {subtasks.map((s) => (
            <SubtaskItem key={s.id} subtask={s} taskId={task.id} task={task} t={t} countdownStartEnabled={countdownStartEnabled} categories={categories} sizeMappings={sizeMappings} />
          ))}
          {!task.completed && (
            <div className="pl-8 mt-1">
              <button onClick={() => openQuickAdd({ mode: "subtask", parentTaskId: task.id, inheritedCategory: task.category })} className="flex items-center gap-1.5 text-xs text-muted-light dark:text-muted-dark hover:text-accent transition-colors py-1">
                <Plus className="w-3.5 h-3.5" />
                {t("tasks.addSubtask")}
              </button>
            </div>
          )}
        </div>
      )}
      {showCountdown && (
        <CountdownStart
          taskId={task.id}
          taskText={task.text}
          estimatedMinutes={task.estimatedMinutes || 25}
          sizeCategory={task.sizeCategory}
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
  const { openQuickAdd } = useQuickAdd();
  const countdownStartEnabled = settings.gamification?.countdownStartEnabled !== false;
  const sizeMappings = settings.estimation?.sizeMappings || { quick: 10, short: 25, medium: 45, long: 90 };
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [filterTag, setFilterTag] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("blue");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("blue");

  const categories = state.categories || [];

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

  // Helper: get display name for a category
  const getCatDisplayName = (cat) => {
    const key = `tasks.categories.${cat.name}`;
    const translated = t(key);
    if (translated !== key) return translated;
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
          {filterCategory && categories.find((c) => c.id === filterCategory) && (() => {
            const fc = categories.find((c) => c.id === filterCategory);
            const fck = resolveCatColorKey(fc.color);
            const flc = LABEL_COLORS[fck] || LABEL_COLORS.gray;
            return (
              <span className={`badge text-xs flex items-center gap-1 ${flc.bg} ${flc.text}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${flc.dot}`} />
                {getCatDisplayName(fc)}
                <button onClick={() => setFilterCategory(null)} className="ml-0.5 hover:text-danger"><X className="w-3 h-3" /></button>
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-light hover:text-accent hover:bg-accent/10 transition-all"
            title={t("tasks.category")}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => openQuickAdd({ mode: "task" })} className="btn-primary text-sm flex items-center gap-2">
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
              {categories.map((cat) => {
                const bck = resolveCatColorKey(cat.color);
                const blc = LABEL_COLORS[bck] || LABEL_COLORS.gray;
                return (
                  <div key={cat.id}>
                    {editingCatId === cat.id ? (
                      <div className="px-2 py-1.5 space-y-1.5">
                        <input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                        />
                        <div className="flex items-center gap-1 flex-wrap">
                          {LABEL_COLOR_KEYS.map((ck) => (
                            <button
                              key={ck}
                              type="button"
                              onClick={() => setEditCatColor(ck)}
                              className={`w-5 h-5 rounded-full ${LABEL_COLORS[ck].dot} transition-all ${editCatColor === ck ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800 scale-110" : "opacity-70 hover:opacity-100"}`}
                              title={ck}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { dispatch({ type: "UPDATE_CATEGORY", payload: { id: cat.id, name: editCatName, color: editCatColor, type: cat.type || "area" } }); setEditingCatId(null); }}
                            className="text-accent"
                          ><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingCatId(null)} className="text-muted-light"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                        onDragOver={(e) => handleCatDragOver(e, cat.id)}
                        onDragLeave={handleCatDragLeave}
                        onDrop={(e) => handleCatDrop(e, cat.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all group/cat ${
                          filterCategory === cat.id ? blc.bg + " " + blc.text + " font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                        } ${dragOverCatId === cat.id ? "ring-2 ring-accent/40 scale-[1.02]" : ""}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${blc.dot}`} />
                        <span className="flex-1 text-left truncate">{getCatDisplayName(cat)}</span>
                        <span className="text-xs font-mono opacity-60">{taskCountByCategory[cat.id] || 0}</span>
                        {managingCategories && (
                          <span className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                            <span
                              onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditCatName(cat.name); setEditCatColor(resolveCatColorKey(cat.color)); }}
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
                );
              })}

              {/* Add category (visible in manage mode) */}
              {managingCategories && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {LABEL_COLOR_KEYS.map((ck) => (
                      <button
                        key={ck}
                        type="button"
                        onClick={() => setNewCatColor(ck)}
                        className={`w-5 h-5 rounded-full ${LABEL_COLORS[ck].dot} transition-all ${newCatColor === ck ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800 scale-110" : "opacity-70 hover:opacity-100"}`}
                        title={ck}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder={t("tasks.categoryName")}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newCatName.trim()) return;
                        dispatch({ type: "ADD_CATEGORY", payload: { name: newCatName.trim(), color: newCatColor, type: "area" } });
                        setNewCatName("");
                        setNewCatColor("blue");
                      }}
                      className="text-accent"
                    ><Plus className="w-4 h-4" /></button>
                  </div>
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
            {categories.map((cat) => {
              const mck = resolveCatColorKey(cat.color);
              const mlc = LABEL_COLORS[mck] || LABEL_COLORS.gray;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                  onDragOver={(e) => handleCatDragOver(e, cat.id)}
                  onDragLeave={handleCatDragLeave}
                  onDrop={(e) => handleCatDrop(e, cat.id)}
                  className={`badge text-xs ${mlc.bg} ${mlc.text} transition-opacity ${filterCategory === cat.id ? "ring-1 ring-current/40" : "opacity-70 hover:opacity-100"} ${dragOverCatId === cat.id ? "ring-2 ring-accent/40" : ""}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mlc.dot} mr-1`} />
                  {getCatDisplayName(cat)} <span className="ml-0.5 font-mono">{taskCountByCategory[cat.id] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main task list */}
        <div className={sidebarOpen ? "lg:col-span-3" : "col-span-1"}>
          <div className="glass-card">
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
                    className={`badge text-xs ${LABEL_COLORS.gray.bg} ${LABEL_COLORS.gray.text} transition-opacity ${filterTag === tag ? "ring-1 ring-current/40" : "opacity-70 hover:opacity-100"}`}
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
                  sizeMappings={settings.estimation?.sizeMappings}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
