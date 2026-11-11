import React, { useState } from 'react';
import { ActiveRun, DiscState, Discipline, SubTopic, Topic } from '../types';
import {
  addD,
  fmt,
  fmtH,
  fmtT,
  getNextRecurringReviewDate,
  iso,
  npg,
  shortT,
  titleCase,
  uid,
} from '../utils/formatters';
import {
  Clock,
  Play,
  Pause,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  HelpCircle,
  FileText,
  Video,
  ListPlus,
  RotateCcw,
  RotateCw,
  BookOpen,
} from 'lucide-react';

interface DisciplinesViewProps {
  discState: DiscState;
  onUpdateDiscState: (updater: (prev: DiscState) => DiscState) => void;
  activeRun: ActiveRun | null;
  onStartSession: (disciplineId: string) => void;
  onPauseSession: () => void;
  onCancelSession: () => void;
  onOpenRegisterModal: () => void;
  onToast: (msg: string) => void;
  currentElapsedSeconds: number;
}

export const DisciplinesView: React.FC<DisciplinesViewProps> = ({
  discState,
  onUpdateDiscState,
  activeRun,
  onStartSession,
  onPauseSession,
  onCancelSession,
  onOpenRegisterModal,
  onToast,
  currentElapsedSeconds,
}) => {
  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];
  const currentDiscipline =
    disciplines.find((d) => d.id === discState.sel) || disciplines[0];

  const todayIso = iso(new Date());
  const intervals = (discState.intv || [1, 15, 30, 45]).sort((a, b) => a - b);

  // View state: 'grid' (overview) vs 'det' (detailed discipline view)
  const [viewMode, setViewMode] = useState<'grid' | 'det'>('grid');

  // Calendar state
  const [calDate, setCalDate] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), sel: iso(now) };
  });

  // Bulk paste state
  const [showBulkPaste, setShowBulkPaste] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');

  // Subtopic adding state
  const [openSubtopicTopicId, setOpenSubtopicTopicId] = useState<string | null>(null);
  const [subtopicInputText, setSubtopicInputText] = useState<string>('');

  // Manual session adjust input
  const [manualMinutes, setManualMinutes] = useState<string>('');

  // Time stats for current discipline
  const isRunning = !!activeRun?.start;
  const isThisActive = activeRun?.id === currentDiscipline?.id;
  const runSeconds = isThisActive ? currentElapsedSeconds : 0;

  const getDisciplineStats = (d: Discipline) => {
    let studiedCount = 0;
    let hits = 0;
    let errors = 0;
    let totalItems = 0;

    d.topics.forEach((t) => {
      totalItems++;
      if (t.studied) studiedCount++;
      hits += t.h || 0;
      errors += t.e || 0;

      (t.subs || []).forEach((sb) => {
        totalItems++;
        if (sb.studied || sb.done) studiedCount++;
        hits += sb.h || 0;
        errors += sb.e || 0;
      });
    });

    let totalSec = 0;
    let weekSec = 0;
    let todaySec = 0;
    const weekAgo = addD(todayIso, -7);

    Object.entries(d.log || {}).forEach(([day, sec]) => {
      totalSec += sec;
      if (day === todayIso) todaySec += sec;
      if (day > weekAgo) weekSec += sec;
    });

    if (activeRun?.id === d.id) {
      totalSec += runSeconds;
      todaySec += runSeconds;
      weekSec += runSeconds;
    }

    return {
      studiedCount,
      totalTopics: totalItems,
      hits,
      errors,
      totalQuestions: hits + errors,
      totalSec,
      todaySec,
      weekSec,
    };
  };

  const currentDiscStats = currentDiscipline ? getDisciplineStats(currentDiscipline) : null;

  // Add new discipline strictly to the current edital
  const handleAddDiscipline = (name: string) => {
    const cleanName = titleCase(name);
    if (!cleanName) return;
    const newD: Discipline = {
      id: uid(),
      name: cleanName,
      topics: [],
      log: {},
    };

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel ? { ...ed, list: [...ed.list, newD] } : ed
      ),
      sel: newD.id,
    }));
    setViewMode('det');
    onToast(`Disciplina "${cleanName}" adicionada ao ${curEd.name}.`);
  };

  // Rename discipline
  const handleRenameDiscipline = (newName: string) => {
    const cleanName = titleCase(newName);
    if (!cleanName || !currentDiscipline) return;
    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id ? { ...d, name: cleanName } : d
              ),
            }
          : ed
      ),
    }));
  };

  // Delete discipline
  const handleDeleteDiscipline = () => {
    if (!currentDiscipline || disciplines.length <= 1) return;
    if (window.confirm(`Tem certeza que deseja excluir a disciplina "${currentDiscipline.name}"?`)) {
      onUpdateDiscState((prev) => {
        const remaining = disciplines.filter((d) => d.id !== currentDiscipline.id);
        return {
          ...prev,
          eds: prev.eds.map((ed) =>
            ed.id === prev.edsel ? { ...ed, list: remaining } : ed
          ),
          sel: remaining[0].id,
        };
      });
      setViewMode('grid');
      onToast('Disciplina excluída.');
    }
  };

  // Manual add minutes
  const handleApplyManualMinutes = () => {
    const mins = parseFloat(manualMinutes);
    if (!mins || isNaN(mins) || !currentDiscipline) return;
    const sec = mins * 60;

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) => {
                if (d.id !== currentDiscipline.id) return d;
                const newLog = { ...(d.log || {}) };
                newLog[todayIso] = Math.max(0, (newLog[todayIso] || 0) + sec);
                return { ...d, log: newLog };
              }),
            }
          : ed
      ),
    }));
    setManualMinutes('');
    onToast(`Ajuste de ${mins > 0 ? `+${mins}` : mins} minutos registrado.`);
  };

  // Add topic
  const handleAddTopic = (topicName: string) => {
    const cleanName = topicName.trim().toUpperCase();
    if (!cleanName || !currentDiscipline) return;

    const newTopic: Topic = {
      id: uid(),
      name: cleanName,
      studied: null,
      videoTime: '',
      q: false,
      r: {},
      h: 0,
      e: 0,
      subs: [],
    };

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id
                  ? { ...d, topics: [...d.topics, newTopic] }
                  : d
              ),
            }
          : ed
      ),
    }));
  };

  // Bulk paste topics
  const handleExecuteBulkPaste = () => {
    if (!currentDiscipline) return;
    const lines = bulkPasteText.split(/\r?\n/);
    let currentGroup = '';
    let count = 0;
    const existingTopicNames = new Set(currentDiscipline.topics.map((t) => t.name));
    const newTopics: Topic[] = [];

    lines.forEach((raw) => {
      let s = raw.trim();
      if (!s) return;
      if (/^#/.test(s) || /:$/.test(s)) {
        currentGroup = s
          .replace(/^#+\s*/, '')
          .replace(/:$/, '')
          .trim()
          .toUpperCase();
        return;
      }
      s = s.replace(/^(\d+(\.\d+)*[.)\-–]?\s+|[-•*]\s+)/, '').trim().toUpperCase();
      if (!s || existingTopicNames.has(s)) return;
      existingTopicNames.add(s);

      newTopics.push({
        id: uid(),
        name: s,
        g: currentGroup || undefined,
        studied: null,
        videoTime: '',
        q: false,
        r: {},
        h: 0,
        e: 0,
        subs: [],
      });
      count++;
    });

    if (count > 0) {
      onUpdateDiscState((prev) => ({
        ...prev,
        eds: prev.eds.map((ed) =>
          ed.id === prev.edsel
            ? {
                ...ed,
                list: ed.list.map((d) =>
                  d.id === currentDiscipline.id
                    ? { ...d, topics: [...d.topics, ...newTopics] }
                    : d
                ),
              }
            : ed
        ),
      }));
      setBulkPasteText('');
      setShowBulkPaste(false);
      onToast(`${count} ${count === 1 ? 'tópico adicionado' : 'tópicos adicionados'}.`);
    } else {
      onToast('Nenhum tópico novo encontrado para adicionar.');
    }
  };

  // Toggle topic studied
  const handleToggleStudied = (topic: Topic) => {
    const isNowStudied = !topic.studied;
    const newStudiedDate = isNowStudied ? todayIso : null;

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id
                  ? {
                      ...d,
                      topics: d.topics.map((t) =>
                        t.id === topic.id
                          ? {
                              ...t,
                              studied: newStudiedDate,
                              r: isNowStudied ? t.r || {} : {},
                            }
                          : t
                      ),
                    }
                  : d
              ),
            }
          : ed
      ),
      acts: isNowStudied
        ? [
            ...(prev.acts || []),
            {
              t: Date.now(),
              d: currentDiscipline.id,
              txt: `Tópico estudado: ${topic.name}`,
            },
          ]
        : prev.acts,
    }));
  };

  // Reorder topics via drag or up/down
  const handleMoveTopic = (fromIndex: number, toIndex: number) => {
    if (!currentDiscipline || toIndex < 0 || toIndex >= currentDiscipline.topics.length) return;

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) => {
                if (d.id !== currentDiscipline.id) return d;
                const newTopics = [...d.topics];
                const [moved] = newTopics.splice(fromIndex, 1);
                moved.g = newTopics[toIndex]?.g || moved.g;
                newTopics.splice(toIndex, 0, moved);
                return { ...d, topics: newTopics };
              }),
            }
          : ed
      ),
    }));
  };

  // Subtopic actions
  const handleAddSubtopic = (topicId: string, name: string) => {
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) return;

    const newSub: SubTopic = {
      id: uid(),
      name: cleanName,
      studied: null,
      done: false,
      videoTime: '',
      h: 0,
      e: 0,
      q: false,
      tp: {},
      r: {},
    };

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id
                  ? {
                      ...d,
                      topics: d.topics.map((t) =>
                        t.id === topicId
                          ? {
                              ...t,
                              subs: [...(t.subs || []), newSub],
                            }
                          : t
                      ),
                    }
                  : d
              ),
            }
          : ed
      ),
    }));
    setSubtopicInputText('');
    setOpenSubtopicTopicId(null);
  };

  const handleUpdateSubtopic = (
    topicId: string,
    subId: string,
    patch: Partial<SubTopic>
  ) => {
    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id
                  ? {
                      ...d,
                      topics: d.topics.map((t) =>
                        t.id === topicId
                          ? {
                              ...t,
                              subs: (t.subs || []).map((sb) =>
                                sb.id === subId ? { ...sb, ...patch } : sb
                              ),
                            }
                          : t
                      ),
                    }
                  : d
              ),
            }
          : ed
      ),
    }));
  };

  const handleDeleteSubtopic = (topicId: string, subId: string) => {
    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline.id
                  ? {
                      ...d,
                      topics: d.topics.map((t) =>
                        t.id === topicId
                          ? {
                              ...t,
                              subs: (t.subs || []).filter((s) => s.id !== subId),
                            }
                          : t
                      ),
                    }
                  : d
              ),
            }
          : ed
      ),
    }));
  };

  // Add/remove review interval
  const handleAddInterval = (daysVal: number) => {
    if (daysVal <= 0 || intervals.includes(daysVal)) return;
    onUpdateDiscState((prev) => ({
      ...prev,
      intv: [...(prev.intv || [1, 15, 30, 45]), daysVal].sort((a, b) => a - b),
    }));
  };

  const handleRemoveInterval = (daysVal: number) => {
    if (intervals.length <= 1) return;
    onUpdateDiscState((prev) => ({
      ...prev,
      intv: (prev.intv || [1, 15, 30, 45]).filter((x) => x !== daysVal),
    }));
  };

  // Set recurring interval after the 45d / max cycle
  const handleSetRecurringInterval = (daysVal: number) => {
    if (daysVal <= 0) return;
    onUpdateDiscState((prev) => ({
      ...prev,
      defaultRecurringDays: daysVal,
      recurringEnabled: true,
    }));
    onToast(`Revisão periódica configurada: a cada ${daysVal} dias.`);
  };

  const handleToggleRecurringReview = (topicId: string) => {
    const today = iso(new Date());
    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === currentDiscipline?.id
                  ? {
                      ...d,
                      topics: d.topics.map((t) => {
                        if (t.id === topicId) {
                          const existing = t.recurringDates || [];
                          return {
                            ...t,
                            recurringDates: [...existing, today],
                          };
                        }
                        if (t.subs?.some((s) => s.id === topicId)) {
                          return {
                            ...t,
                            subs: t.subs.map((s) =>
                              s.id === topicId
                                ? {
                                    ...s,
                                    recurringDates: [...(s.recurringDates || []), today],
                                  }
                                : s
                            ),
                          };
                        }
                        return t;
                      }),
                    }
                  : d
              ),
            }
          : ed
      ),
    }));
    onToast('Revisão periódica registrada! Próxima data agendada com sucesso. ✓');
  };

  // Spaced repetition calendar map calculation (including subtopics and recurring)
  const reviewMap: Record<
    string,
    Array<{
      topic: { id: string; name: string; r?: Record<number, number> };
      interval: number;
      dueDate: string;
      isRecurring?: boolean;
    }>
  > = {};

  const dueReviewsForDiscipline: Array<{
    item: { id: string; name: string; r?: Record<number, number> };
    interval: number;
    dueDate: string;
    isLate: boolean;
    isRecurring?: boolean;
    recurringCycle?: number;
  }> = [];

  if (currentDiscipline) {
    const checkItemForReviews = (
      item: { id: string; name: string; studied?: string | null; r?: Record<number, number>; recurringDays?: number; recurringDates?: string[] },
      displayName: string
    ) => {
      if (!item.studied) return;

      // 1. Standard intervals (1, 15, 30, 45, etc.)
      intervals.forEach((intervalDays) => {
        const dueDate = addD(item.studied!, intervalDays);
        if (!reviewMap[dueDate]) reviewMap[dueDate] = [];
        reviewMap[dueDate].push({
          topic: { id: item.id, name: displayName, r: item.r },
          interval: intervalDays,
          dueDate,
        });

        const isDone = Boolean(item.r && item.r[intervalDays]);
        if (!isDone && dueDate <= todayIso) {
          dueReviewsForDiscipline.push({
            item: { id: item.id, name: displayName, r: item.r },
            interval: intervalDays,
            dueDate,
            isLate: dueDate < todayIso,
          });
        }
      });

      // 2. Periodic Recurring review (after 45d / max interval)
      const effectiveRecDays =
        item.recurringDays ||
        (discState.recurringEnabled !== false ? discState.defaultRecurringDays || 30 : 0);

      if (effectiveRecDays > 0) {
        const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 45;
        const cycleEndDate = addD(item.studied!, maxInterval);
        const cycleDone = Boolean(item.r && item.r[maxInterval]) || todayIso >= cycleEndDate;

        if (cycleDone) {
          const nextDueDate = getNextRecurringReviewDate(
            item.studied!,
            intervals,
            effectiveRecDays,
            item.recurringDates || []
          );
          if (!reviewMap[nextDueDate]) reviewMap[nextDueDate] = [];
          reviewMap[nextDueDate].push({
            topic: { id: item.id, name: displayName, r: item.r },
            interval: effectiveRecDays,
            dueDate: nextDueDate,
            isRecurring: true,
          });

          if (nextDueDate <= todayIso) {
            dueReviewsForDiscipline.push({
              item: { id: item.id, name: displayName, r: item.r },
              interval: effectiveRecDays,
              dueDate: nextDueDate,
              isLate: nextDueDate < todayIso,
              isRecurring: true,
              recurringCycle: (item.recurringDates?.length || 0) + 1,
            });
          }
        }
      }
    };

    currentDiscipline.topics.forEach((t) => {
      checkItemForReviews(t, t.name);
      (t.subs || []).forEach((sb) => {
        checkItemForReviews(sb, `↳ ${sb.name}`);
      });
    });
  }

  dueReviewsForDiscipline.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-6">
      {/* 1. EDITAL SELECTOR BAR (Disciplinas strictly separated by Edital) */}
      <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Edital Ativo:</span>
          </span>
          {discState.eds.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                onUpdateDiscState((prev) => {
                  const targetEd = prev.eds.find((item) => item.id === e.id) || prev.eds[0];
                  return {
                    ...prev,
                    edsel: e.id,
                    sel: targetEd.list[0] ? targetEd.list[0].id : '',
                  };
                });
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                e.id === discState.edsel
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {e.name}
            </button>
          ))}
          <input
            type="text"
            placeholder="+ Novo edital (Enter)"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const clean = e.currentTarget.value.trim();
                const newEd = {
                  id: uid(),
                  name: clean,
                  list: [{ id: uid(), name: 'Disciplina 1', topics: [] }],
                  cycles: [{ id: uid(), name: 'Ciclo 1', items: [], base: {}, n: 0 }],
                };
                onUpdateDiscState((prev) => ({
                  ...prev,
                  eds: [...prev.eds, newEd],
                  edsel: newEd.id,
                  sel: newEd.list[0].id,
                }));
                e.currentTarget.value = '';
                onToast(`Edital "${clean}" cadastrado.`);
              }
            }}
            className="px-3 py-1.5 rounded-full text-xs border border-dashed border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 w-32"
          />
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          As disciplinas, tópicos e horas são computadas estritamente para o edital selecionado.
        </div>
      </div>

      {/* 2. Top Disciplines Bar (within the selected Edital) */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          ▦ Painel Geral
        </button>

        {disciplines.map((d) => {
          const isSelected = viewMode === 'det' && d.id === currentDiscipline?.id;
          const isStudyingThis = activeRun?.id === d.id && isRunning;
          return (
            <button
              key={d.id}
              onClick={() => {
                onUpdateDiscState((prev) => ({ ...prev, sel: d.id }));
                setViewMode('det');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isStudyingThis && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span>{d.name}</span>
            </button>
          );
        })}

        <input
          type="text"
          placeholder="+ Nova disciplina (Enter)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddDiscipline(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          className="px-3 py-1.5 rounded-full text-xs border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
        />
      </div>

      {/* GRID OVERVIEW VIEW */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {(() => {
            let totalSec = 0;
            let totalHits = 0;
            let totalErrors = 0;
            let totalTopics = 0;
            let completedTopics = 0;

            disciplines.forEach((d) => {
              const st = getDisciplineStats(d);
              totalSec += st.totalSec;
              totalHits += st.hits;
              totalErrors += st.errors;
              totalTopics += st.totalTopics;
              completedTopics += st.studiedCount;
            });

            const totalQ = totalHits + totalErrors;
            const perfPct = totalQ > 0 ? Math.round((totalHits / totalQ) * 100) : 0;
            const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {fmtH(totalSec)}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      Horas de Estudo ({curEd.name})
                    </div>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {totalQ}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      Questões Resolvidas
                    </div>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {perfPct}%
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      Desempenho Geral
                    </div>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {progressPct}%
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      {completedTopics} de {totalTopics} tópicos
                    </div>
                  </div>
                </div>

                <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Cards for each discipline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {disciplines.map((d, idx) => {
              const st = getDisciplineStats(d);
              const colorHue = (idx * 47 + 160) % 360;

              return (
                <div
                  key={d.id}
                  onClick={() => {
                    onUpdateDiscState((prev) => ({ ...prev, sel: d.id }));
                    setViewMode('det');
                  }}
                  className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between border-l-6"
                  style={{ borderLeftColor: `hsl(${colorHue} 60% 50%)` }}
                >
                  <h3 className="font-extrabold text-base uppercase text-slate-800 dark:text-slate-100 tracking-tight line-clamp-1 mb-4">
                    {d.name}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {st.studiedCount}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Estudados
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {st.totalTopics}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Totais
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {st.totalQuestions}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Questões
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED DISCIPLINE VIEW */}
      {viewMode === 'det' && currentDiscipline && currentDiscStats && (
        <div className="space-y-6">
          {/* Discipline Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <input
                type="text"
                defaultValue={currentDiscipline.name}
                onBlur={(e) => handleRenameDiscipline(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="text-2xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded-xl"
              />
              <button
                onClick={handleDeleteDiscipline}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                title="Excluir disciplina"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stopwatch Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Sessão de Estudo • {currentDiscipline.name}</span>
              </div>
              <div className="font-mono text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                {isThisActive ? fmtT(runSeconds) : '00:00:00'}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Hoje: {fmtH(currentDiscStats.todaySec)} • Últimos 7 dias:{' '}
                {fmtH(currentDiscStats.weekSec)} • Total: {fmtH(currentDiscStats.totalSec)}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isThisActive && isRunning) {
                    onPauseSession();
                  } else {
                    onStartSession(currentDiscipline.id);
                  }
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer ${
                  isThisActive && isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isThisActive && isRunning ? (
                  <>
                    <Pause className="w-4 h-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 ml-0.5" /> Continuar
                  </>
                )}
              </button>

              {isThisActive && (
                <>
                  <button
                    type="button"
                    onClick={onOpenRegisterModal}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja cancelar esta sessão?')) {
                        onCancelSession();
                      }
                    }}
                    className="px-3 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </>
              )}

              {/* Manual ± minutes */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="± min"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyManualMinutes();
                  }}
                  className="w-20 px-2.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-center outline-none"
                  title="Ajuste manual: digite minutos (ex: 30 ou -15) e tecle Enter"
                />
              </div>
            </div>
          </div>

          {/* Quick Checklist Section: Estudar & Questões */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estudar Box */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span>📖</span> Estudar
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {!currentDiscipline.topics.length && (
                  <div className="text-xs text-slate-400 italic">
                    Nenhum tópico adicionado. Adicione um abaixo.
                  </div>
                )}
                {currentDiscipline.topics.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                      t.studied
                        ? 'bg-emerald-500/10 text-slate-400 line-through'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!t.studied}
                      onChange={() => handleToggleStudied(t)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold flex-1 truncate">{t.name}</span>
                    {t.studied && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {fmt(t.studied)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="+ Adicionar assunto (Enter)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTopic(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="mt-3 w-full px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-xs outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            {/* Questões Box */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span>✍️</span> Questões Resolvidas
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {!currentDiscipline.topics.length && (
                  <div className="text-xs text-slate-400 italic">
                    Adicione assuntos em Estudar para monitorar questões.
                  </div>
                )}
                {currentDiscipline.topics.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                      t.q
                        ? 'bg-blue-500/10 text-slate-400'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!t.q}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onUpdateDiscState((prev) => ({
                          ...prev,
                          eds: prev.eds.map((ed) =>
                            ed.id === prev.edsel
                              ? {
                                  ...ed,
                                  list: ed.list.map((d) =>
                                    d.id === currentDiscipline.id
                                      ? {
                                          ...d,
                                          topics: d.topics.map((item) =>
                                            item.id === t.id ? { ...item, q: checked } : item
                                          ),
                                        }
                                      : d
                                  ),
                                }
                              : ed
                          ),
                        }));
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold flex-1 truncate">{t.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {(t.h || 0) + (t.e || 0)} questões
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EDITAL VERTICALIZADO TABLE */}
          <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  📋 Edital Verticalizado • {currentDiscStats.studiedCount} de{' '}
                  {currentDiscStats.totalTopics} itens concluídos (
                  {currentDiscStats.totalTopics > 0
                    ? Math.round(
                        (currentDiscStats.studiedCount / currentDiscStats.totalTopics) * 100
                      )
                    : 0}
                  %)
                </h3>
              </div>
              <button
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition hover:bg-blue-100 cursor-pointer flex items-center gap-1.5 w-fit"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Colar vários tópicos</span>
              </button>
            </div>

            {/* Bulk Paste Box */}
            {showBulkPaste && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Cole sua lista de tópicos (um por linha):
                </div>
                <p className="text-[11px] text-slate-400">
                  Dica: Linhas que terminam com ":" ou começam com "#" criam grupos/conteúdos.
                  Prefixos como "1.", "1.1", "-", "•" são removidos automaticamente.
                </p>
                <textarea
                  rows={6}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={'# DIREITO ADMINISTRATIVO\n1. Atos administrativos\n2. Poderes administrativos\n# LICITAÇÕES:\n1. Modalidades de licitação'}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowBulkPaste(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleExecuteBulkPaste}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Adicionar à Tabela
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-2 text-center w-8">✔</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Tópico / Assunto</th>
                    <th className="py-2.5 px-2 text-center">Tipo</th>
                    <th className="py-2.5 px-2 text-center text-blue-600 dark:text-blue-400 font-bold" title="Tempo onde pausou a videoaula">Vídeo Aula</th>
                    <th className="py-2.5 px-2 text-center">Pág. Ini</th>
                    <th className="py-2.5 px-2 text-center">Pág. Fim</th>
                    <th className="py-2.5 px-2 text-center">Págs</th>
                    <th className="py-2.5 px-2 text-center text-emerald-600">✓</th>
                    <th className="py-2.5 px-2 text-center text-rose-600">✗</th>
                    <th className="py-2.5 px-2 text-center">Total</th>
                    <th className="py-2.5 px-2 text-center">%</th>
                    <th className="py-2.5 px-2 text-center">Último Estudo</th>
                    <th className="py-2.5 px-2 text-center">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(() => {
                    let lastGroup = '';
                    const renderedRows: React.ReactNode[] = [];

                    currentDiscipline.topics.forEach((t, topicIdx) => {
                      // Check for group header
                      if ((t.g || '') !== lastGroup && t.g) {
                        lastGroup = t.g;
                        const groupTopics = currentDiscipline.topics.filter(
                          (item) => item.g === lastGroup
                        );
                        const groupDone = groupTopics.filter((item) => item.studied).length;

                        renderedRows.push(
                          <tr
                            key={`group-${lastGroup}-${topicIdx}`}
                            className="bg-blue-500/10 dark:bg-blue-900/20 font-bold"
                          >
                            <td colSpan={13} className="py-2 px-3 text-blue-700 dark:text-blue-300">
                              📂 {lastGroup} • {groupDone}/{groupTopics.length} tópicos
                            </td>
                          </tr>
                        );
                      }

                      const totalQ = (t.h || 0) + (t.e || 0);
                      const accPct = totalQ > 0 ? Math.round(((t.h || 0) / totalQ) * 100) : 0;
                      const pagesCount = npg(t);

                      renderedRows.push(
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            t.studied ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!t.studied}
                              onChange={() => handleToggleStudied(t)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Topic Name & Actions */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {/* Reorder Buttons */}
                              <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                                <button
                                  disabled={topicIdx === 0}
                                  onClick={() => handleMoveTopic(topicIdx, topicIdx - 1)}
                                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Mover para cima"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={topicIdx === currentDiscipline.topics.length - 1}
                                  onClick={() => handleMoveTopic(topicIdx, topicIdx + 1)}
                                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Mover para baixo"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <input
                                type="text"
                                defaultValue={t.name}
                                onBlur={(e) => {
                                  const val = e.target.value.trim().toUpperCase();
                                  if (val && val !== t.name) {
                                    onUpdateDiscState((prev) => ({
                                      ...prev,
                                      eds: prev.eds.map((ed) =>
                                        ed.id === prev.edsel
                                          ? {
                                              ...ed,
                                              list: ed.list.map((d) =>
                                                d.id === currentDiscipline.id
                                                  ? {
                                                      ...d,
                                                      topics: d.topics.map((item) =>
                                                        item.id === t.id
                                                          ? { ...item, name: val }
                                                          : item
                                                      ),
                                                    }
                                                  : d
                                              ),
                                            }
                                          : ed
                                      ),
                                    }));
                                  }
                                }}
                                className="font-bold text-xs uppercase bg-transparent outline-none flex-1 truncate px-1 rounded focus:bg-white dark:focus:bg-slate-800"
                              />

                              {/* Subtopics Count */}
                              {(t.subs || []).length > 0 && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {t.subs!.filter((s) => s.studied || s.done).length}/{t.subs!.length}
                                </span>
                              )}

                              {/* Add Subtopic Button */}
                              <button
                                onClick={() =>
                                  setOpenSubtopicTopicId(
                                    openSubtopicTopicId === t.id ? null : t.id
                                  )
                                }
                                className="p-0.5 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                                title="Adicionar subtópico"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Topic Button */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Excluir tópico "${t.name}"?`)) {
                                    onUpdateDiscState((prev) => ({
                                      ...prev,
                                      eds: prev.eds.map((ed) =>
                                        ed.id === prev.edsel
                                          ? {
                                              ...ed,
                                              list: ed.list.map((d) =>
                                                d.id === currentDiscipline.id
                                                  ? {
                                                      ...d,
                                                      topics: d.topics.filter((item) => item.id !== t.id),
                                                    }
                                                  : d
                                              ),
                                            }
                                          : ed
                                      ),
                                    }));
                                  }
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                title="Excluir tópico"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Tipo (V, P, Q) */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(
                                [
                                  ['v', '🎬', 'Videoaula'],
                                  ['p', '📄', 'PDF'],
                                  ['q', '❓', 'Questões'],
                                ] as const
                              ).map(([key, icon, label]) => {
                                const active = Boolean(t.tp && t.tp[key]);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      onUpdateDiscState((prev) => ({
                                        ...prev,
                                        eds: prev.eds.map((ed) =>
                                          ed.id === prev.edsel
                                            ? {
                                                ...ed,
                                                list: ed.list.map((d) =>
                                                  d.id === currentDiscipline.id
                                                    ? {
                                                        ...d,
                                                        topics: d.topics.map((item) =>
                                                          item.id === t.id
                                                            ? {
                                                                ...item,
                                                                tp: {
                                                                  ...(item.tp || {}),
                                                                  [key]: !active,
                                                                },
                                                              }
                                                            : item
                                                        ),
                                                      }
                                                    : d
                                                ),
                                              }
                                            : ed
                                        ),
                                      }));
                                    }}
                                    title={`${label} (${active ? 'marcado' : 'desmarcado'})`}
                                    className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                                      active
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'opacity-40 hover:opacity-100 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {icon}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Vídeo Aula (Tempo onde parou) */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="text"
                              defaultValue={t.videoTime || ''}
                              placeholder="00:00"
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id ? { ...item, videoTime: val } : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                              title="Tempo de parada da videoaula (ex: 45:20)"
                            />
                          </td>

                          {/* Initial Page */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.pi || ''}
                              placeholder="–"
                              onBlur={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id ? { ...item, pi: val } : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs"
                            />
                          </td>

                          {/* Final Page */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.pf || ''}
                              placeholder="–"
                              onBlur={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id ? { ...item, pf: val } : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs"
                            />
                          </td>

                          {/* Págs Total */}
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-500">
                            {pagesCount > 0 ? pagesCount : '–'}
                          </td>

                          {/* Acertos (✓) */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.h || 0}
                              onBlur={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id ? { ...item, h: val } : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                            />
                          </td>

                          {/* Erros (✗) */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              defaultValue={t.e || 0}
                              onBlur={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id ? { ...item, e: val } : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-bold text-rose-600 dark:text-rose-400 text-xs"
                            />
                          </td>

                          {/* Total Questions */}
                          <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {totalQ}
                          </td>

                          {/* % Badge */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                totalQ === 0
                                  ? 'bg-slate-400'
                                  : accPct >= 80
                                  ? 'bg-emerald-500'
                                  : accPct >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            >
                              {totalQ === 0 ? '–' : `${accPct}%`}
                            </span>
                          </td>

                          {/* Last Study Date */}
                          <td className="py-2.5 px-2 text-center">
                            {t.studied ? (
                              <input
                                type="date"
                                defaultValue={t.studied}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onUpdateDiscState((prev) => ({
                                    ...prev,
                                    eds: prev.eds.map((ed) =>
                                      ed.id === prev.edsel
                                        ? {
                                            ...ed,
                                            list: ed.list.map((d) =>
                                              d.id === currentDiscipline.id
                                                ? {
                                                    ...d,
                                                    topics: d.topics.map((item) =>
                                                      item.id === t.id
                                                        ? { ...item, studied: val }
                                                        : item
                                                    ),
                                                  }
                                                : d
                                            ),
                                          }
                                        : ed
                                    ),
                                  }));
                                }}
                                className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-[11px] font-mono"
                              />
                            ) : (
                              <span className="text-slate-400">–</span>
                            )}
                          </td>

                          {/* Link / URL */}
                          <td className="py-2.5 px-2 text-center">
                            {t.link ? (
                              <div className="flex items-center justify-center gap-1">
                                <a
                                  href={t.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold text-[11px]"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  onClick={() => {
                                    onUpdateDiscState((prev) => ({
                                      ...prev,
                                      eds: prev.eds.map((ed) =>
                                        ed.id === prev.edsel
                                          ? {
                                              ...ed,
                                              list: ed.list.map((d) =>
                                                d.id === currentDiscipline.id
                                                  ? {
                                                      ...d,
                                                      topics: d.topics.map((item) =>
                                                        item.id === t.id
                                                          ? { ...item, link: '' }
                                                          : item
                                                      ),
                                                    }
                                                  : d
                                              ),
                                            }
                                          : ed
                                      ),
                                    }));
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                  title="Remover link"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const url = window.prompt('Digite a URL do material (PDF, vídeo, etc.):');
                                  if (url) {
                                    let cleanUrl = url.trim();
                                    if (!/^https?:\/\//i.test(cleanUrl)) {
                                      cleanUrl = `https://${cleanUrl}`;
                                    }
                                    onUpdateDiscState((prev) => ({
                                      ...prev,
                                      eds: prev.eds.map((ed) =>
                                        ed.id === prev.edsel
                                          ? {
                                              ...ed,
                                              list: ed.list.map((d) =>
                                                d.id === currentDiscipline.id
                                                  ? {
                                                      ...d,
                                                      topics: d.topics.map((item) =>
                                                        item.id === t.id
                                                          ? { ...item, link: cleanUrl }
                                                          : item
                                                      ),
                                                    }
                                                  : d
                                              ),
                                            }
                                          : ed
                                      ),
                                    }));
                                  }
                                }}
                                className="text-[11px] font-bold text-slate-400 hover:text-blue-500 transition cursor-pointer"
                              >
                                + Link
                              </button>
                            )}
                          </td>
                        </tr>
                      );

                      // Subtopics rows - NOW WITH THE SAME FULL OPTIONS AS TOPICS!
                      (t.subs || []).forEach((sb) => {
                        const sbTotalQ = (sb.h || 0) + (sb.e || 0);
                        const sbAccPct = sbTotalQ > 0 ? Math.round(((sb.h || 0) / sbTotalQ) * 100) : 0;
                        const sbPages = npg(sb);
                        const isSbStudied = Boolean(sb.studied || sb.done);

                        renderedRows.push(
                          <tr
                            key={`sub-${sb.id}`}
                            className={`bg-slate-50/70 dark:bg-slate-900/40 text-xs border-l-2 border-l-blue-400/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition ${
                              isSbStudied ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            {/* Subtopic Checkbox */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSbStudied}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleUpdateSubtopic(t.id, sb.id, {
                                    studied: checked ? todayIso : null,
                                    done: checked,
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Subtopic Title (indented) & Delete */}
                            <td className="py-2 px-3 pl-8">
                              <div className="flex items-center gap-1.5">
                                <span className="text-blue-500 font-bold">↳</span>
                                <input
                                  type="text"
                                  defaultValue={sb.name}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim().toUpperCase();
                                    if (val && val !== sb.name) {
                                      handleUpdateSubtopic(t.id, sb.id, { name: val });
                                    }
                                  }}
                                  className={`text-xs uppercase bg-transparent outline-none flex-1 truncate px-1 rounded focus:bg-white dark:focus:bg-slate-800 ${
                                    isSbStudied ? 'text-slate-400 line-through' : 'font-medium text-slate-700 dark:text-slate-300'
                                  }`}
                                />
                                <button
                                  onClick={() => handleDeleteSubtopic(t.id, sb.id)}
                                  className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                  title="Excluir subtópico"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Subtopic Tipo (V, P, Q) */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(
                                  [
                                    ['v', '🎬', 'Videoaula'],
                                    ['p', '📄', 'PDF'],
                                    ['q', '❓', 'Questões'],
                                  ] as const
                                ).map(([key, icon, label]) => {
                                  const active = Boolean(sb.tp && sb.tp[key]);
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateSubtopic(t.id, sb.id, {
                                          tp: {
                                            ...(sb.tp || {}),
                                            [key]: !active,
                                          },
                                        });
                                      }}
                                      title={`Subtópico ${label} (${active ? 'marcado' : 'desmarcado'})`}
                                      className={`px-1 py-0.5 rounded text-[10px] transition cursor-pointer ${
                                        active
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'opacity-40 hover:opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {icon}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Subtopic Vídeo Aula (Tempo) */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="text"
                                defaultValue={sb.videoTime || ''}
                                placeholder="00:00"
                                onBlur={(e) => {
                                  handleUpdateSubtopic(t.id, sb.id, {
                                    videoTime: e.target.value.trim(),
                                  });
                                }}
                                className="w-16 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                title="Tempo onde parou a videoaula do subtópico"
                              />
                            </td>

                            {/* Subtopic Initial Page */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={sb.pi || ''}
                                placeholder="–"
                                onBlur={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateSubtopic(t.id, sb.id, { pi: val });
                                }}
                                className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs"
                              />
                            </td>

                            {/* Subtopic Final Page */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={sb.pf || ''}
                                placeholder="–"
                                onBlur={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateSubtopic(t.id, sb.id, { pf: val });
                                }}
                                className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-mono text-xs"
                              />
                            </td>

                            {/* Subtopic Págs Total */}
                            <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-500">
                              {sbPages > 0 ? sbPages : '–'}
                            </td>

                            {/* Subtopic Acertos */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={sb.h || 0}
                                onBlur={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateSubtopic(t.id, sb.id, { h: val, q: val + (sb.e || 0) > 0 });
                                }}
                                className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                              />
                            </td>

                            {/* Subtopic Erros */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={sb.e || 0}
                                onBlur={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateSubtopic(t.id, sb.id, { e: val, q: (sb.h || 0) + val > 0 });
                                }}
                                className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-bold text-rose-600 dark:text-rose-400 text-xs"
                              />
                            </td>

                            {/* Subtopic Total Questions */}
                            <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {sbTotalQ}
                            </td>

                            {/* Subtopic % Badge */}
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                  sbTotalQ === 0
                                    ? 'bg-slate-400'
                                    : sbAccPct >= 80
                                    ? 'bg-emerald-500'
                                    : sbAccPct >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              >
                                {sbTotalQ === 0 ? '–' : `${sbAccPct}%`}
                              </span>
                            </td>

                            {/* Subtopic Date */}
                            <td className="py-2 px-2 text-center">
                              {sb.studied ? (
                                <input
                                  type="date"
                                  defaultValue={sb.studied}
                                  onChange={(e) => {
                                    handleUpdateSubtopic(t.id, sb.id, {
                                      studied: e.target.value,
                                      done: Boolean(e.target.value),
                                    });
                                  }}
                                  className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-[10px] font-mono"
                                />
                              ) : (
                                <span className="text-slate-400">–</span>
                              )}
                            </td>

                            {/* Subtopic Link */}
                            <td className="py-2 px-2 text-center">
                              {sb.link ? (
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={sb.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold text-[11px]"
                                  >
                                    <span>Abrir</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button
                                    onClick={() => handleUpdateSubtopic(t.id, sb.id, { link: '' })}
                                    className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const url = window.prompt('URL do material do subtópico:');
                                    if (url) {
                                      let clean = url.trim();
                                      if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
                                      handleUpdateSubtopic(t.id, sb.id, { link: clean });
                                    }
                                  }}
                                  className="text-[10px] font-bold text-slate-400 hover:text-blue-500"
                                >
                                  + Link
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });

                      // Inline Subtopic Add Input
                      if (openSubtopicTopicId === t.id) {
                        renderedRows.push(
                          <tr key={`add-sub-${t.id}`} className="bg-blue-50/50 dark:bg-blue-950/20">
                            <td />
                            <td colSpan={12} className="py-2 px-3 pl-8">
                              <input
                                type="text"
                                autoFocus
                                value={subtopicInputText}
                                onChange={(e) => setSubtopicInputText(e.target.value)}
                                placeholder="Novo subtópico (Enter para salvar, Esc para cancelar)"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubtopic(t.id, subtopicInputText);
                                  if (e.key === 'Escape') setOpenSubtopicTopicId(null);
                                }}
                                className="w-full px-2.5 py-1 rounded-lg border border-dashed border-blue-400 bg-white dark:bg-slate-800 text-xs uppercase outline-none"
                              />
                            </td>
                          </tr>
                        );
                      }
                    });

                    return renderedRows;
                  })()}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-extrabold text-slate-800 dark:text-slate-100">
                    <td />
                    <td className="py-3 px-3 uppercase text-xs">Total Geral</td>
                    <td />
                    <td />
                    <td />
                    <td />
                    <td className="py-3 px-2 text-center font-mono text-xs">
                      {currentDiscipline.topics.reduce((acc, t) => {
                        let pages = npg(t);
                        (t.subs || []).forEach((s) => (pages += npg(s)));
                        return acc + pages;
                      }, 0) || '–'}
                    </td>
                    <td className="py-3 px-2 text-center text-emerald-600 text-xs">
                      {currentDiscStats.hits}
                    </td>
                    <td className="py-3 px-2 text-center text-rose-600 text-xs">
                      {currentDiscStats.errors}
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      {currentDiscStats.totalQuestions}
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          currentDiscStats.totalQuestions === 0
                            ? 'bg-slate-400'
                            : currentDiscStats.hits / currentDiscStats.totalQuestions >= 0.8
                            ? 'bg-emerald-500'
                            : currentDiscStats.hits / currentDiscStats.totalQuestions >= 0.6
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      >
                        {currentDiscStats.totalQuestions > 0
                          ? `${Math.round(
                              (currentDiscStats.hits / currentDiscStats.totalQuestions) * 100
                            )}%`
                          : '–'}
                      </span>
                    </td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Quick Add Topic Input */}
            <input
              type="text"
              placeholder="+ Adicionar tópico à tabela (Enter)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTopic(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-xs font-semibold uppercase text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* REVISÃO ESPAÇADA & CALENDÁRIO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Review intervals config + Pills per topic (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-blue-500" />
                  <span>
                    Revisões Espaçadas ({intervals.map((n) => (n === 1 ? '24h' : `${n}d`)).join(' • ')})
                  </span>
                </h3>
              </div>

              {/* Intervals configuration chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Intervalos:</span>
                {intervals.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleRemoveInterval(n)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
                    title="Clique para remover este intervalo"
                  >
                    <span>{n === 1 ? '24h' : `${n} dias`}</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  placeholder="+ dias (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddInterval(parseInt(e.currentTarget.value) || 0);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-24 px-2 py-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-xs text-center font-bold outline-none"
                />
              </div>

              {/* Opção Adicional: Revisão Recorrente Periódica (após os 45 dias) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                      <RotateCw className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                        Revisão Periódica Contínua
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Após o ciclo de {intervals[intervals.length - 1] || 45} dias, continuar revisando a cada:
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 20, 30, 45, 60].map((daysCount) => (
                      <button
                        key={daysCount}
                        type="button"
                        onClick={() => handleSetRecurringInterval(daysCount)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                          (discState.defaultRecurringDays || 30) === daysCount &&
                          discState.recurringEnabled !== false
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {daysCount}d
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      placeholder="+ dias"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt(e.currentTarget.value) || 0;
                          if (val > 0) {
                            handleSetRecurringInterval(val);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      className="w-20 px-2 py-1 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-xs text-center font-bold outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Mantém a matéria fresca a longo prazo após os 45 dias, sem desativar os intervalos regulares já cadastrados.
                </p>
              </div>

              {/* Spaced repetition review list per topic */}
              <div className="space-y-3 pt-2 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {!currentDiscipline.topics.some((t) => t.studied || (t.subs || []).some((s) => s.studied)) && (
                  <div className="text-xs text-slate-400 italic">
                    Marque um assunto como estudado para programar automaticamente as revisões espaçadas.
                  </div>
                )}
                {currentDiscipline.topics
                  .filter((t) => t.studied)
                  .map((t) => (
                    <div key={t.id} className="pt-2 first:pt-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium">
                        Estudado em {fmt(t.studied!)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {intervals.map((n) => {
                          const dueDate = addD(t.studied!, n);
                          const isDone = Boolean(t.r && t.r[n]);
                          const isLate = !isDone && dueDate < todayIso;
                          const isToday = !isDone && dueDate === todayIso;

                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                onUpdateDiscState((prev) => ({
                                  ...prev,
                                  eds: prev.eds.map((ed) =>
                                    ed.id === prev.edsel
                                      ? {
                                          ...ed,
                                          list: ed.list.map((d) =>
                                            d.id === currentDiscipline.id
                                              ? {
                                                  ...d,
                                                  topics: d.topics.map((item) =>
                                                    item.id === t.id
                                                      ? {
                                                          ...item,
                                                          r: {
                                                            ...(item.r || {}),
                                                            [n]: isDone ? 0 : 1,
                                                          },
                                                        }
                                                      : item
                                                  ),
                                                }
                                              : d
                                          ),
                                        }
                                      : ed
                                  ),
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : isLate
                                  ? 'border border-rose-500 text-rose-500 bg-rose-500/10'
                                  : isToday
                                  ? 'border border-blue-500 text-blue-600 bg-blue-500/10 font-extrabold'
                                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3" />}
                              <span>
                                {n === 1 ? '24h' : `${n}d`} • {fmt(dueDate)}
                              </span>
                            </button>
                          );
                        })}

                        {/* Periodic Recurring review pill */}
                        {(() => {
                          const effectiveRecDays =
                            t.recurringDays || discState.defaultRecurringDays || 30;
                          const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 45;
                          const isPastMax =
                            Boolean(t.r && t.r[maxInterval]) ||
                            todayIso >= addD(t.studied!, maxInterval);

                          if (!isPastMax) return null;

                          const nextDueDate = getNextRecurringReviewDate(
                            t.studied!,
                            intervals,
                            effectiveRecDays,
                            t.recurringDates || []
                          );
                          const cycleNum = (t.recurringDates?.length || 0) + 1;
                          const isLate = nextDueDate < todayIso;
                          const isToday = nextDueDate === todayIso;

                          return (
                            <button
                              key={`rec-${t.id}`}
                              type="button"
                              onClick={() => handleToggleRecurringReview(t.id)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                                isLate
                                  ? 'border-rose-500 text-rose-500 bg-rose-500/10 font-extrabold'
                                  : isToday
                                  ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10 font-black'
                                  : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              }`}
                              title={`Registrar conclusão da revisão periódica #${cycleNum} e agendar próxima`}
                            >
                              <RotateCw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>
                                Recorrente #{cycleNum} (a cada {effectiveRecDays}d) • {fmt(nextDueDate)}
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right: Revisões do dia + Monthly Calendar (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Revisões do dia Box */}
              <div className="p-5 rounded-3xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                    📌 Revisões do Dia • {fmt(todayIso)}
                  </h3>
                  {dueReviewsForDiscipline.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                      {dueReviewsForDiscipline.length} pendentes
                    </span>
                  )}
                </div>

                {!dueReviewsForDiscipline.length ? (
                  <div className="text-xs text-blue-600/80 dark:text-blue-300/80 italic">
                    Nada para revisar nesta disciplina hoje! 🎉
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {dueReviewsForDiscipline.map((rev, idx) => (
                      <div
                        key={`${rev.item.id}-${rev.interval}-${idx}`}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-2.5 shadow-xs"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(rev.item.r && rev.item.r[rev.interval])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            onUpdateDiscState((prev) => ({
                              ...prev,
                              eds: prev.eds.map((ed) =>
                                ed.id === prev.edsel
                                  ? {
                                      ...ed,
                                      list: ed.list.map((d) =>
                                        d.id === currentDiscipline.id
                                          ? {
                                              ...d,
                                              topics: d.topics.map((item) => {
                                                if (item.id === rev.item.id) {
                                                  return {
                                                    ...item,
                                                    r: { ...(item.r || {}), [rev.interval]: checked ? 1 : 0 },
                                                  };
                                                }
                                                return {
                                                  ...item,
                                                  subs: (item.subs || []).map((sb) =>
                                                    sb.id === rev.item.id
                                                      ? {
                                                          ...sb,
                                                          r: { ...(sb.r || {}), [rev.interval]: checked ? 1 : 0 },
                                                        }
                                                      : sb
                                                  ),
                                                };
                                              }),
                                            }
                                          : d
                                      ),
                                    }
                                  : ed
                              ),
                            }));
                          }}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase truncate">
                            {rev.item.name}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              rev.isLate ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {rev.interval === 1 ? '24h' : `${rev.interval} dias`}
                            {rev.isLate ? ` • atrasada desde ${fmt(rev.dueDate)}` : ' • hoje'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Calendar */}
              <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                {(() => {
                  const firstDay = new Date(calDate.y, calDate.m, 1);
                  const monthName = firstDay.toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  });

                  return (
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      <button
                        onClick={() =>
                          setCalDate((prev) => {
                            const newM = prev.m - 1;
                            return newM < 0
                              ? { ...prev, m: 11, y: prev.y - 1 }
                              : { ...prev, m: newM };
                          })
                        }
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4 -rotate-90" />
                      </button>
                      <span>{monthName}</span>
                      <button
                        onClick={() =>
                          setCalDate((prev) => {
                            const newM = prev.m + 1;
                            return newM > 11
                              ? { ...prev, m: 0, y: prev.y + 1 }
                              : { ...prev, m: newM };
                          })
                        }
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                  );
                })()}

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((wd, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-400 py-1">
                      {wd}
                    </span>
                  ))}

                  {Array.from(
                    { length: new Date(calDate.y, calDate.m, 1).getDay() },
                    (_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    )
                  )}

                  {Array.from(
                    { length: new Date(calDate.y, calDate.m + 1, 0).getDate() },
                    (_, i) => {
                      const dayNum = i + 1;
                      const dateStr = iso(new Date(calDate.y, calDate.m, dayNum));
                      const reviewsOnDay = reviewMap[dateStr] || [];
                      const pendingCount = reviewsOnDay.filter(
                        (item) => !Boolean(item.topic.r && item.topic.r[item.interval])
                      ).length;

                      const isSelected = dateStr === calDate.sel;
                      const isToday = dateStr === todayIso;

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => setCalDate((prev) => ({ ...prev, sel: dateStr }))}
                          className={`aspect-square rounded-xl text-xs font-bold relative flex items-center justify-center transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isToday
                              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{dayNum}</span>
                          {reviewsOnDay.length > 0 && (
                            <span
                              className={`absolute bottom-0.5 text-[9px] font-extrabold ${
                                isSelected
                                  ? 'text-white'
                                  : pendingCount > 0
                                  ? dateStr < todayIso
                                    ? 'text-rose-500'
                                    : 'text-blue-500'
                                  : 'text-emerald-500'
                              }`}
                            >
                              {pendingCount > 0 ? pendingCount : '✓'}
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Selected Day Details */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Revisões em {fmt(calDate.sel)}:
                  </div>
                  {!(reviewMap[calDate.sel] && reviewMap[calDate.sel].length) ? (
                    <div className="text-slate-400 italic">Nenhuma revisão neste dia.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {reviewMap[calDate.sel].map((rev, idx) => {
                        const isDone = Boolean(rev.topic.r && rev.topic.r[rev.interval]);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800"
                          >
                            <span
                              className={`truncate flex-1 font-semibold ${
                                isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {rev.topic.name} ({rev.interval === 1 ? '24h' : `${rev.interval}d`})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
