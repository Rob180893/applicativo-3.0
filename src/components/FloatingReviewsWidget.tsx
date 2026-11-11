import React, { useState } from 'react';
import { DiscState } from '../types';
import { addD, fmt, getNextRecurringReviewDate, iso } from '../utils/formatters';
import { Bell, ChevronDown, ChevronUp, Check, RotateCw } from 'lucide-react';

interface FloatingReviewsWidgetProps {
  discState: DiscState;
  onCheckReview: (
    disciplineId: string,
    topicId: string,
    intervalDays: number,
    isRecurring?: boolean
  ) => void;
  onNavigateToDiscipline: (disciplineId: string) => void;
}

export const FloatingReviewsWidget: React.FC<FloatingReviewsWidgetProps> = ({
  discState,
  onCheckReview,
  onNavigateToDiscipline,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kanban-rem-open') !== '0';
    } catch {
      return true;
    }
  });

  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];
  const intervals = discState.intv || [1, 15, 30, 45];
  const todayIso = iso(new Date());

  const dueReviews: Array<{
    disciplineId: string;
    disciplineName: string;
    topicId: string;
    topicName: string;
    intervalDays: number;
    dueDate: string;
    isLate: boolean;
    isRecurring?: boolean;
    recurringCycle?: number;
  }> = [];

  const checkItem = (
    dId: string,
    dName: string,
    itemId: string,
    itemName: string,
    studiedDate: string | null | undefined,
    rMap: Record<number, number> | undefined,
    itemRecurringDays?: number,
    itemRecurringDates?: string[]
  ) => {
    if (!studiedDate) return;

    // 1. Standard intervals (1, 15, 30, 45, etc.)
    intervals.forEach((intervalDays) => {
      const dueDate = addD(studiedDate, intervalDays);
      const isDone = Boolean(rMap && rMap[intervalDays]);
      if (!isDone && dueDate <= todayIso) {
        dueReviews.push({
          disciplineId: dId,
          disciplineName: dName,
          topicId: itemId,
          topicName: itemName,
          intervalDays,
          dueDate,
          isLate: dueDate < todayIso,
        });
      }
    });

    // 2. Periodic Recurring review (after 45d / max interval)
    const effectiveRecurringDays =
      itemRecurringDays ||
      (discState.recurringEnabled ? discState.defaultRecurringDays || 30 : 0);

    if (effectiveRecurringDays > 0) {
      const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 45;
      const cycleEndDate = addD(studiedDate, maxInterval);
      const cycleDone = Boolean(rMap && rMap[maxInterval]) || todayIso >= cycleEndDate;

      if (cycleDone) {
        const nextDueDate = getNextRecurringReviewDate(
          studiedDate,
          intervals,
          effectiveRecurringDays,
          itemRecurringDates || []
        );

        if (nextDueDate <= todayIso) {
          dueReviews.push({
            disciplineId: dId,
            disciplineName: dName,
            topicId: itemId,
            topicName: itemName,
            intervalDays: effectiveRecurringDays,
            dueDate: nextDueDate,
            isLate: nextDueDate < todayIso,
            isRecurring: true,
            recurringCycle: (itemRecurringDates?.length || 0) + 1,
          });
        }
      }
    }
  };

  disciplines.forEach((d) => {
    d.topics.forEach((t) => {
      checkItem(
        d.id,
        d.name,
        t.id,
        t.name,
        t.studied,
        t.r,
        t.recurringDays,
        t.recurringDates
      );

      (t.subs || []).forEach((s) => {
        checkItem(
          d.id,
          d.name,
          s.id,
          `${t.name} › ${s.name}`,
          s.studied,
          s.r,
          s.recurringDays,
          s.recurringDates
        );
      });
    });
  });

  dueReviews.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (!dueReviews.length) {
    return null;
  }

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem('kanban-rem-open', next ? '1' : '0');
    } catch {}
  };

  const getIntervalLabel = (days: number) => (days === 1 ? '24h' : `${days} dias`);

  return (
    <div className="fixed right-4 bottom-20 z-40 w-84 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200">
      {/* Header */}
      <div
        onClick={toggleOpen}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white cursor-pointer select-none shadow-xs"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 animate-bounce" />
          <span className="text-xs font-black uppercase tracking-wider">
            Revisões do Dia
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white text-emerald-700 shadow-xs">
            {dueReviews.length}
          </span>
        </div>
        <button
          type="button"
          className="p-1 rounded-lg hover:bg-white/20 text-white/90 hover:text-white"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Review List */}
      {isOpen && (
        <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {dueReviews.map((rev) => (
            <div
              key={`${rev.topicId}-${rev.intervalDays}-${rev.isRecurring ? 'rec' : 'std'}`}
              className="pt-1.5 first:pt-0 flex items-start gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <button
                type="button"
                onClick={() =>
                  onCheckReview(
                    rev.disciplineId,
                    rev.topicId,
                    rev.intervalDays,
                    rev.isRecurring
                  )
                }
                className="mt-0.5 w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center text-white hover:border-emerald-500 hover:bg-emerald-500/20 transition cursor-pointer"
                title="Marcar como revisada"
              >
                <Check className="w-3 h-3 text-transparent hover:text-emerald-500" />
              </button>

              <div
                onClick={() => onNavigateToDiscipline(rev.disciplineId)}
                className="flex-1 cursor-pointer min-w-0"
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {rev.topicName}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="truncate">{rev.disciplineName}</span>
                  <span>•</span>
                  {rev.isRecurring ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>
                        Recorrente #{rev.recurringCycle} (a cada {rev.intervalDays}d)
                      </span>
                    </span>
                  ) : (
                    <span
                      className={
                        rev.isLate
                          ? 'text-rose-500 font-bold'
                          : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      }
                    >
                      {getIntervalLabel(rev.intervalDays)}{' '}
                      {rev.isLate ? `(atrasada ${fmt(rev.dueDate)})` : '• hoje'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
