import React, { useState } from 'react';
import { DiscState, Discipline, StudyReminder } from '../types';
import {
  addD,
  fmt,
  getDailyVerse,
  hm,
  iso,
  shortT,
  uid,
} from '../utils/formatters';
import {
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Calendar,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit2,
  Check,
  Trash2,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HomeViewProps {
  discState: DiscState;
  onUpdateDiscState: (updater: (prev: DiscState) => DiscState) => void;
  onNavigateToDiscipline: (disciplineId: string) => void;
  onToast: (msg: string) => void;
  currentElapsedSeconds: number;
  onOpenRegisterModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  discState,
  onUpdateDiscState,
  onNavigateToDiscipline,
  onToast,
  currentElapsedSeconds,
  onOpenRegisterModal,
}) => {
  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];
  const todayIso = iso(new Date());

  const [homeWeekOffset, setHomeWeekOffset] = useState<number>(0);
  const [chartMetric, setChartMetric] = useState<'t' | 'q'>('t'); // 't' = tempo, 'q' = questões
  const [isEditingGoals, setIsEditingGoals] = useState<boolean>(false);
  const [showStreakDetails, setShowStreakDetails] = useState<boolean>(true);
  const [newReminderText, setNewReminderText] = useState<string>('');

  // Daily quote
  const dailyVerse = getDailyVerse();

  // Calculate day seconds
  const getDaySeconds = (dayKey: string) => {
    let total = 0;
    disciplines.forEach((d) => {
      total += (d.log && d.log[dayKey]) || 0;
    });
    if (discState.run?.start && dayKey === todayIso) {
      total += currentElapsedSeconds;
    }
    return total;
  };

  const getDayQuestions = (dayKey: string) => {
    return (discState.qlog && discState.qlog[dayKey]) || 0;
  };

  // Aggregate stats across current edital
  let totalSeconds = 0;
  let totalTopics = 0;
  let completedTopics = 0;
  let totalHits = 0;
  let totalErrors = 0;

  disciplines.forEach((d) => {
    d.topics.forEach((t) => {
      totalTopics++;
      if (t.studied) completedTopics++;
      totalHits += t.h || 0;
      totalErrors += t.e || 0;

      (t.subs || []).forEach((sb) => {
        totalTopics++;
        if (sb.studied || sb.done) completedTopics++;
        totalHits += sb.h || 0;
        totalErrors += sb.e || 0;
      });
    });

    Object.values(d.log || {}).forEach((s) => {
      totalSeconds += s;
    });
  });

  if (discState.run?.start) {
    totalSeconds += currentElapsedSeconds;
  }

  const totalQuestions = totalHits + totalErrors;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalHits / totalQuestions) * 100) : 0;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // 30 Days Streak Calculation
  const streakDays: string[] = [];
  for (let i = 29; i >= 0; i--) {
    streakDays.push(addD(todayIso, -i));
  }

  let currentStreak = 0;
  for (let i = streakDays.length - 1; i >= 0; i--) {
    const s = getDaySeconds(streakDays[i]);
    if (s > 0) {
      currentStreak++;
    } else if (streakDays[i] === todayIso) {
      continue;
    } else {
      break;
    }
  }

  // Weekly Goal Calculation
  const getMonday = (offset: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7) + offset * 7);
    return iso(dt);
  };

  const currentWeekDays = Array.from({ length: 7 }, (_, i) => addD(getMonday(0), i));
  const weekTotalSeconds = currentWeekDays.reduce((acc, k) => acc + getDaySeconds(k), 0);
  const weekTotalQuestions = currentWeekDays.reduce((acc, k) => acc + getDayQuestions(k), 0);

  const goals = discState.goals || { h: 20, q: 100 };
  const weekHoursPct = Math.min(100, (weekTotalSeconds / 3600 / goals.h) * 100);
  const weekQuestionsPct = Math.min(100, (weekTotalQuestions / goals.q) * 100);

  // Weekly Chart Data
  const chartWeekDays = Array.from({ length: 7 }, (_, i) =>
    addD(getMonday(homeWeekOffset), i)
  );
  const chartValues = chartWeekDays.map((k) =>
    chartMetric === 't' ? getDaySeconds(k) : getDayQuestions(k)
  );
  const maxChartVal = Math.max(
    ...chartValues,
    chartMetric === 't' ? 3600 : 1
  );
  const WEEKDAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Handlers for Edital Management
  const handleSelectEdital = (editalId: string) => {
    onUpdateDiscState((prev) => {
      const targetEd = prev.eds.find((e) => e.id === editalId) || prev.eds[0];
      return {
        ...prev,
        edsel: editalId,
        sel: targetEd.list[0] ? targetEd.list[0].id : '',
      };
    });
  };

  const handleAddEdital = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newEd: any = {
      id: uid(),
      name: cleanName,
      list: [{ id: uid(), name: 'Disciplina 1', topics: [] }],
      cycles: [
        {
          id: uid(),
          name: 'Ciclo 1',
          items: [],
          base: {},
          n: 0,
        },
      ],
    };
    newEd.csel = newEd.cycles[0].id;

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: [...prev.eds, newEd],
      edsel: newEd.id,
      sel: newEd.list[0].id,
    }));
    onToast(`Edital "${cleanName}" criado.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions (Matching Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Home
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe seu desempenho, constância e metas
          </p>
        </div>

        {/* Top Right: "Adicionar Estudo" + Edital Selector (Matching Image 1) */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenRegisterModal && (
            <button
              onClick={onOpenRegisterModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Estudo</span>
            </button>
          )}

          {/* Edital Selector Dropdown / Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-emerald-600 ml-1.5" />
            <select
              value={discState.edsel}
              onChange={(e) => handleSelectEdital(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent pr-2 py-1 outline-none cursor-pointer"
            >
              {discState.eds.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid (Matching Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TEMPO DE ESTUDO */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[125px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Tempo de Estudo
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-auto">
            {hm(totalSeconds)}
          </div>
        </div>

        {/* DESEMPENHO */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[125px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Desempenho
          </span>
          <div className="flex items-end justify-between mt-auto">
            <div className="space-y-0.5 text-xs font-semibold">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                {totalHits} Acertos
              </div>
              <div className="text-rose-600 dark:text-rose-400 font-bold">
                {totalErrors} Erros
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {overallAccuracy}%
            </div>
          </div>
        </div>

        {/* PROGRESSO NO EDITAL */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[125px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Progresso no Edital
          </span>
          <div className="flex items-end justify-between mt-auto">
            <div className="space-y-0.5 text-xs font-semibold">
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                {completedTopics} Tópicos Concluídos
              </div>
              <div className="text-slate-400">
                {Math.max(0, totalTopics - completedTopics)} Tópicos Pendentes
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {overallProgress}%
            </div>
          </div>
        </div>

        {/* Quote Card (Matching Image 1) */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[125px]">
          <p className="text-xs italic text-slate-700 dark:text-slate-200 line-clamp-3 leading-relaxed">
            "{dailyVerse[0]}"
          </p>
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 text-right">
            — {dailyVerse[1]}
          </div>
        </div>
      </div>

      {/* CONSTÂNCIA NOS ESTUDOS (Matching Image 1) */}
      <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Constância nos Estudos
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Você está há{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
              </span>{' '}
              sem falhar!
            </div>
          </div>
          <button
            onClick={() => setShowStreakDetails(!showStreakDetails)}
            className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition cursor-pointer"
            title="Mostrar / ocultar sequência"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Heatmap / Streak Grid */}
        {showStreakDetails && (
          <div className="grid grid-cols-15 sm:grid-cols-30 gap-1.5 pt-1">
            {streakDays.map((k) => {
              const sec = getDaySeconds(k);
              const hasStudied = sec > 0;
              const isToday = k === todayIso;

              return (
                <div
                  key={k}
                  title={`${fmt(k)}${hasStudied ? ` • ${shortT(sec)}` : ' • sem estudo'}`}
                  className={`h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                    hasStudied
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isToday
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 border border-dashed border-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-300 dark:text-slate-600'
                  }`}
                >
                  {hasStudied ? '✓' : ''}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: PAINEL on Left + METAS & ESTUDO SEMANAL on Right (Matching Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PAINEL DE DISCIPLINAS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-3.5">
              Painel
            </h3>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Disciplinas</th>
                    <th className="py-2.5 px-2 text-right">Tempo</th>
                    <th className="py-2.5 px-2 text-center text-emerald-600">✓</th>
                    <th className="py-2.5 px-2 text-center text-rose-600">✗</th>
                    <th className="py-2.5 px-2 text-center">📝</th>
                    <th className="py-2.5 px-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {disciplines.map((d) => {
                    let dSec = 0;
                    let dHits = 0;
                    let dErrors = 0;

                    Object.values(d.log || {}).forEach((s) => (dSec += s));
                    if (discState.run?.start && discState.run.id === d.id) {
                      dSec += currentElapsedSeconds;
                    }

                    d.topics.forEach((t) => {
                      dHits += t.h || 0;
                      dErrors += t.e || 0;
                      (t.subs || []).forEach((sb) => {
                        dHits += sb.h || 0;
                        dErrors += sb.e || 0;
                      });
                    });

                    const dTotalQ = dHits + dErrors;
                    const dAcc = dTotalQ > 0 ? Math.round((dHits / dTotalQ) * 100) : 0;

                    return (
                      <tr
                        key={d.id}
                        onClick={() => onNavigateToDiscipline(d.id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          {d.name}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                          {dSec > 0 ? hm(dSec) : '–'}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-600">
                          {dHits}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-rose-600">
                          {dErrors}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                          {dTotalQ}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              dTotalQ === 0
                                ? 'text-slate-400'
                                : dAcc >= 80
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : dAcc >= 60
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            }`}
                          >
                            {dTotalQ === 0 ? '0' : `${dAcc}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: METAS & ESTUDO SEMANAL (5 cols) (Matching Image 1) */}
        <div className="lg:col-span-5 space-y-6">
          {/* METAS DE ESTUDO SEMANAL */}
          <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Metas de Estudo Semanal
              </h3>
              <button
                onClick={() => setIsEditingGoals(!isEditingGoals)}
                className="p-1 rounded text-slate-400 hover:text-emerald-600"
                title="Editar metas"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingGoals ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Meta de Horas:</span>
                  <input
                    type="number"
                    min="1"
                    defaultValue={goals.h}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 20;
                      onUpdateDiscState((prev) => ({
                        ...prev,
                        goals: { ...(prev.goals || { h: 20, q: 100 }), h: val },
                      }));
                    }}
                    className="w-16 p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Meta de Questões:</span>
                  <input
                    type="number"
                    min="1"
                    defaultValue={goals.q}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 100;
                      onUpdateDiscState((prev) => ({
                        ...prev,
                        goals: { ...(prev.goals || { h: 20, q: 100 }), q: val },
                      }));
                    }}
                    className="w-16 p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                  />
                </div>
              </div>
            ) : null}

            {/* Hours Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-mono text-slate-500">
                  {hm(weekTotalSeconds)} / {goals.h}h00min
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Horas de Estudo
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${weekHoursPct}%` }}
                />
              </div>
            </div>

            {/* Questions Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-mono text-slate-500">
                  {weekTotalQuestions} / {goals.q}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Questões
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${weekQuestionsPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ESTUDO SEMANAL (Chart with [TEMPO] / [QUESTÕES] toggle) */}
          <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Estudo Semanal
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                <button
                  onClick={() => setHomeWeekOffset((prev) => prev - 1)}
                  className="p-1 hover:text-slate-700 dark:hover:text-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {fmt(chartWeekDays[0])} – {fmt(chartWeekDays[6])}
                </span>
                <button
                  onClick={() => setHomeWeekOffset((prev) => prev + 1)}
                  className="p-1 hover:text-slate-700 dark:hover:text-white"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toggle TEMPO / QUESTÕES */}
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setChartMetric('t')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 't'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Tempo
              </button>
              <button
                onClick={() => setChartMetric('q')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 'q'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Questões
              </button>
            </div>

            {/* Bar Chart */}
            <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
              {chartWeekDays.map((day, idx) => {
                const val = chartValues[idx];
                const heightPct = Math.max(8, (val / maxChartVal) * 100);
                const isToday = day === todayIso;

                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {chartMetric === 't'
                        ? val > 0
                          ? shortT(val)
                          : ''
                        : val > 0
                        ? val
                        : ''}
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg h-28 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isToday
                            ? 'bg-emerald-500'
                            : 'bg-emerald-400/80 dark:bg-emerald-600/80'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {WEEKDAY_NAMES[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
