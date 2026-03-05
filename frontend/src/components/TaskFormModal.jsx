import { useState } from "react";
import { X, ChevronDown, ChevronRight, AlertCircle, Folder, Tag } from "lucide-react";

const PRIORITY_CONFIG = {
  high: { color: "bg-danger/10 text-danger dark:bg-danger/20" },
  medium: { color: "bg-warn/10 text-amber-700 dark:bg-warn/20 dark:text-warn" },
  low: { color: "bg-success/10 text-success dark:bg-success/20" },
};
const ENERGY_CONFIG = {
  low: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  high: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};
const WHEN_OPTIONS = ["today", "tomorrow", "dayAfter", "nextWeek", "pickDate"];
const TIME_OF_DAY_OPTIONS = ["morning", "afternoon", "evening", "exact"];
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

const SIZE_KEYS = ["quick", "short", "medium", "long"];
const DEFAULT_SIZE_MAPPINGS = { quick: 10, short: 25, medium: 45, long: 90 };
const SIZE_COLORS = {
  quick: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  short: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  long: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function TaskFormModal({ t, onSubmit, onClose, isSubtask, inheritedCategory, categories = [], title, initialValues, sizeMappings }) {
  const iv = initialValues || {};
  const isEdit = !!initialValues;
  const mappings = sizeMappings || DEFAULT_SIZE_MAPPINGS;
  const [text, setText] = useState(iv.text || "");
  const [priority, setPriority] = useState(iv.priority || "medium");
  const [energyCost, setEnergyCost] = useState(iv.energyCost || "medium");
  const [scheduledDate, setScheduledDate] = useState(iv.scheduledDate || "");
  const [timeOfDay, setTimeOfDay] = useState(iv.timeOfDay || (iv.scheduledTime ? "exact" : ""));
  const [scheduledTime, setScheduledTime] = useState(iv.scheduledTime || "");
  const [deadline, setDeadline] = useState(iv.deadline || "");
  const [sizeCategory, setSizeCategory] = useState(iv.sizeCategory || "medium");
  const [customMinutes, setCustomMinutes] = useState(iv.sizeCategory ? null : (iv.estimatedMinutes || null));
  const [showCustom, setShowCustom] = useState(!!(iv.estimatedMinutes && !iv.sizeCategory && iv.estimatedMinutes !== 25));
  const [category, setCategory] = useState(inheritedCategory || iv.category || "");
  const [tags, setTags] = useState(iv.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [showDetails, setShowDetails] = useState(isEdit && !!(iv.deadline || iv.tags?.length));

  const effectiveMinutes = showCustom && customMinutes ? customMinutes : (mappings[sizeCategory] || 25);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const resolveDate = (opt) => {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      if (opt === "today") return d.toISOString().slice(0, 10);
      if (opt === "tomorrow") { d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
      if (opt === "dayAfter") { d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); }
      if (opt === "nextWeek") { d.setDate(d.getDate() + (8 - d.getDay()) % 7 || 7); return d.toISOString().slice(0, 10); }
      return opt;
    };
    onSubmit({
      text: text.trim(),
      priority,
      energyCost,
      estimatedMinutes: effectiveMinutes,
      sizeCategory: showCustom ? null : sizeCategory,
      scheduledDate: scheduledDate ? resolveDate(scheduledDate) : null,
      timeOfDay: timeOfDay && timeOfDay !== "exact" ? timeOfDay : null,
      scheduledTime: timeOfDay === "exact" && scheduledTime ? scheduledTime : null,
      deadline: deadline || null,
      category: isSubtask ? (inheritedCategory || null) : (category || null),
      tags,
    });
    onClose();
  };

  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = sanitizeTag(tagInput);
      if (tag && !tags.includes(tag)) setTags([...tags, tag]);
      setTagInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card p-6 max-w-lg w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{title || (isEdit ? (isSubtask ? t("tasks.editSubtask") : t("common.edit")) : (isSubtask ? t("tasks.createSubtask") : t("tasks.createTask")))}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* What */}
          <div>
            <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionWhat")}</label>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("tasks.addPlaceholder")} autoFocus className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all" />
          </div>

          {/* Importance */}
          <div>
            <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionImportance")}</label>
            <div className="flex gap-1.5">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setPriority(key)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${priority === key ? cfg.color + " ring-1 ring-current/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                  {t(`tasks.priority.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* When */}
          <div>
            <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionWhen")}</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {WHEN_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => { if (opt === "pickDate") { setScheduledDate(""); } else { setScheduledDate(scheduledDate === opt ? "" : opt); } }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${scheduledDate === opt ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                  {t(`tasks.whenOptions.${opt}`)}
                </button>
              ))}
            </div>
            {scheduledDate === "pickDate" && (
              <input type="date" onChange={(e) => setScheduledDate(e.target.value)} className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
            )}
            {scheduledDate && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {TIME_OF_DAY_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => setTimeOfDay(timeOfDay === opt ? "" : opt)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeOfDay === opt ? "bg-accent/10 text-accent ring-1 ring-accent/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                    {t(`tasks.timeOfDayOptions.${opt}`)}
                  </button>
                ))}
              </div>
            )}
            {timeOfDay === "exact" && (
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-2 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
            )}
          </div>

          {/* Energy */}
          <div>
            <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionEnergy")}</label>
            <div className="flex gap-1.5">
              {Object.entries(ENERGY_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setEnergyCost(key)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all text-center ${energyCost === key ? cfg.color + " ring-1 ring-current/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                  {t(`tasks.energy.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration (T-shirt sizing) */}
          <div>
            <label className="text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5 block">{t("tasks.sectionDuration")}</label>
            <div className="flex gap-1.5">
              {SIZE_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => { setSizeCategory(key); setShowCustom(false); }} className={`flex-1 px-2 py-2 rounded-xl text-xs font-medium transition-all text-center ${!showCustom && sizeCategory === key ? SIZE_COLORS[key] + " ring-1 ring-current/20" : "bg-gray-50 dark:bg-white/5 text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/10"}`}>
                  <span className="block">{t(`tasks.size.${key}`)}</span>
                  <span className="block text-[9px] opacity-60 mt-0.5">~{mappings[key]}{t("common.min")}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setShowCustom(!showCustom); if (!customMinutes) setCustomMinutes(mappings[sizeCategory] || 25); }} className={`mt-1.5 text-[10px] transition-colors ${showCustom ? "text-accent font-medium" : "text-muted-light dark:text-muted-dark hover:text-accent"}`}>
              {showCustom ? t("tasks.sizeUsePreset") : t("tasks.sizeCustom")}
            </button>
            {showCustom && (
              <div className="flex items-center gap-2 mt-1.5 animate-fade-in">
                <input type="range" min={5} max={240} step={5} value={customMinutes || 25} onChange={(e) => setCustomMinutes(Number(e.target.value))} className="flex-1 accent-accent" />
                <span className="text-xs font-mono text-accent w-12 text-right">{customMinutes || 25}{t("common.min")}</span>
              </div>
            )}
          </div>

          {/* Details (collapsible) */}
          <div>
            <button type="button" onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-light dark:text-muted-dark uppercase tracking-wider mb-1.5">
              {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {t("tasks.sectionDetails")}
            </button>
            {showDetails && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                  <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.hardDeadline")}</span>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30" />
                </div>
                {/* Category — inherited for subtasks, selectable for tasks */}
                {isSubtask && inheritedCategory ? (
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    <span className="text-xs text-muted-light dark:text-muted-dark">{t("tasks.subtaskCategoryInherited")}</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-white/10">{categories.find((c) => c.id === inheritedCategory)?.name || inheritedCategory}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Folder className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                    {categories.map((cat) => (
                      <button key={cat.id} type="button" onClick={() => setCategory(category === cat.id ? "" : cat.id)} className={`px-2.5 py-1 rounded-lg text-xs transition-all ${category === cat.id ? (cat.color || "bg-gray-100 text-gray-700") + " ring-1 ring-current/20" : "text-muted-light dark:text-muted-dark hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                        {cat.name || cat.emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-muted-light dark:text-muted-dark flex-shrink-0" />
                  {tags.map((tag) => (
                    <span key={tag} className={`badge text-[10px] ${getTagColor(tag)} flex items-center gap-1`}>
                      {tag}
                      <button type="button" onClick={() => setTags(tags.filter((x) => x !== tag))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={t("tasks.addTag")} className="flex-1 min-w-[80px] text-xs px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30" />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary text-sm w-full">
            {isEdit ? t("common.save") : (isSubtask ? t("tasks.createSubtask") : t("tasks.createTask"))}
          </button>
        </form>
      </div>
    </div>
  );
}
