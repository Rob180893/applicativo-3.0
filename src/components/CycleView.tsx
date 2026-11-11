import React, { useRef, useState } from 'react';
import { ActiveRun, DiscState, Discipline, StudyCycle, StudyCycleItem } from '../types';
import { fmtH, titleCase, uid } from '../utils/formatters';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Sparkles,
  GripVertical,
  X,
  Edit2,
  Settings,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface CycleViewProps {
  discState: DiscState;
  onUpdateDiscState: (updater: (prev: DiscState) => DiscState) => void;
  activeRun: ActiveRun | null;
  onStartSession: (disciplineId: string) => void;
  onPauseSession: () => void;
  onToast: (msg: string) => void;
  currentElapsedSeconds: number;
}

export const CycleView: React.FC<CycleViewProps> = ({
  discState,
  onUpdateDiscState,
  activeRun,
  onStartSession,
  onPauseSession,
  onToast,
  currentElapsedSeconds,
}) => {
  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];
  const cycles = curEd?.cycles || [];
  const currentCycle = cycles.find((c) => c.id === curEd?.csel) || cycles[0];

  const [isEditingCycle, setIsEditingCycle] = useState<boolean>(false);
  const [newDiscName, setNewDiscName] = useState<string>('');
  const [newHours, setNewHours] = useState<number>(1);
  const [newMinutes, setNewMinutes] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!currentCycle) {
    return <div className="text-center p-8 text-slate-400">Nenhum ciclo encontrado.</div>;
  }

  // Move item in cycle (reorder)
  const handleMoveCycleItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= validItems.length || toIndex >= validItems.length) return;

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              cycles: (ed.cycles || []).map((c) => {
                if (c.id !== currentCycle.id) return c;
                const newItems = [...c.items];
                const [movedItem] = newItems.splice(fromIndex, 1);
                newItems.splice(toIndex, 0, movedItem);
                return { ...c, items: newItems };
              }),
            }
          : ed
      ),
    }));
  };

  // Calculate completed time for an item in the cycle
  const getItemCompletedSeconds = (item: StudyCycleItem) => {
    const d = disciplines.find((x) => x.id === item.id);
    if (!d) return 0;

    let totalDisciplineSeconds = 0;
    Object.values(d.log || {}).forEach((s) => {
      totalDisciplineSeconds += s;
    });

    if (activeRun?.id === item.id && activeRun.start) {
      totalDisciplineSeconds += currentElapsedSeconds;
    }

    const baseline = currentCycle.base[item.id] || 0;
    return Math.max(0, totalDisciplineSeconds - baseline);
  };

  // State of all items in cycle
  const validItems = currentCycle.items.filter((it) =>
    disciplines.some((d) => d.id === it.id)
  );
  const itemsCompleted = validItems.map(
    (it) => getItemCompletedSeconds(it) >= it.min * 60
  );
  const currentItemIndex = itemsCompleted.findIndex((done) => !done);

  // Total duration of cycle
  const totalCycleTargetSeconds = validItems.reduce((acc, it) => acc + it.min * 60, 0);
  const totalCycleCompletedSeconds = validItems.reduce(
    (acc, it) => acc + Math.min(getItemCompletedSeconds(it), it.min * 60),
    0
  );

  const cycleProgressPct =
    totalCycleTargetSeconds > 0
      ? Math.round((totalCycleCompletedSeconds / totalCycleTargetSeconds) * 100)
      : 0;

  // Add new cycle
  const handleAddCycle = (name: string) => {
    const cleanName = titleCase(name) || `Ciclo ${cycles.length + 1}`;
    const newCycle: StudyCycle = {
      id: uid(),
      name: cleanName,
      items: [],
      base: {},
      n: 0,
    };

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              cycles: [...(ed.cycles || []), newCycle],
              csel: newCycle.id,
            }
          : ed
      ),
    }));
    onToast(`Ciclo "${cleanName}" criado.`);
  };

  // Delete current cycle
  const handleDeleteCycle = () => {
    if (cycles.length <= 1) return;
    if (window.confirm(`Deseja excluir o ciclo "${currentCycle.name}"?`)) {
      onUpdateDiscState((prev) => {
        const remaining = (curEd.cycles || []).filter((c) => c.id !== currentCycle.id);
        return {
          ...prev,
          eds: prev.eds.map((ed) =>
            ed.id === prev.edsel
              ? {
                  ...ed,
                  cycles: remaining,
                  csel: remaining[0].id,
                }
              : ed
          ),
        };
      });
      onToast('Ciclo excluído.');
    }
  };

  // Reset cycle progress
  const handleResetCycle = (incrementCount: boolean) => {
    const newBase: Record<string, number> = {};
    validItems.forEach((it) => {
      const d = disciplines.find((x) => x.id === it.id);
      if (d) {
        let tot = 0;
        Object.values(d.log || {}).forEach((s) => (tot += s));
        newBase[it.id] = tot;
      }
    });

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              cycles: (ed.cycles || []).map((c) =>
                c.id === currentCycle.id
                  ? {
                      ...c,
                      base: newBase,
                      n: incrementCount ? c.n + 1 : c.n,
                    }
                  : c
              ),
            }
          : ed
      ),
    }));

    if (incrementCount) {
      onToast(`Parabéns! Ciclo nº ${currentCycle.n + 1} concluído com sucesso! 🎉`);
    } else {
      onToast('Contagem do ciclo reiniciada.');
    }
  };

  // Add discipline to cycle
  const handleAddItemToCycle = (disciplineIdOrName: string) => {
    let cleanName = titleCase(disciplineIdOrName);
    if (!cleanName) return;

    let targetDiscipline = disciplines.find(
      (d) => d.id === disciplineIdOrName || d.name.toLowerCase() === cleanName.toLowerCase()
    );

    let updatedDisciplines = [...disciplines];
    if (!targetDiscipline) {
      targetDiscipline = {
        id: uid(),
        name: cleanName,
        topics: [],
        log: {},
      };
      updatedDisciplines.push(targetDiscipline);
    }

    if (validItems.some((it) => it.id === targetDiscipline!.id)) {
      onToast('Esta disciplina já está no ciclo.');
      return;
    }

    const targetMinutes = Math.max(1, newHours * 60 + newMinutes);

    let currentTot = 0;
    Object.values(targetDiscipline.log || {}).forEach((s) => (currentTot += s));

    const newItem: StudyCycleItem = {
      id: targetDiscipline.id,
      min: targetMinutes,
    };

    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: updatedDisciplines,
              cycles: (ed.cycles || []).map((c) =>
                c.id === currentCycle.id
                  ? {
                      ...c,
                      items: [...c.items, newItem],
                      base: { ...c.base, [targetDiscipline!.id]: currentTot },
                    }
                  : c
              ),
            }
          : ed
      ),
    }));

    setNewDiscName('');
    onToast(`Disciplina "${targetDiscipline.name}" adicionada ao ciclo.`);
  };

  // Remove item from cycle
  const handleRemoveItem = (index: number) => {
    onUpdateDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              cycles: (ed.cycles || []).map((c) => {
                if (c.id !== currentCycle.id) return c;
                const newItems = [...c.items];
                newItems.splice(index, 1);
                return { ...c, items: newItems };
              }),
            }
          : ed
      ),
    }));
  };

  // Available disciplines not yet in cycle
  const availableDisciplines = disciplines.filter(
    (d) => !validItems.some((it) => it.id === d.id)
  );

  // SVG Circular Donut Chart (matching Image 2)
  const renderSvgDonut = () => {
    const cx = 200;
    const cy = 200;
    const R = 150;
    const r0 = 95;
    const gap = 2;
    const n = validItems.length;
    const totalMinutes = validItems.reduce((acc, it) => acc + it.min, 0);

    const P = (deg: number): [number, number] => [
      cx + R * Math.cos((deg * Math.PI) / 180),
      cy + R * Math.sin((deg * Math.PI) / 180),
    ];
    const P0 = (deg: number): [number, number] => [
      cx + r0 * Math.cos((deg * Math.PI) / 180),
      cy + r0 * Math.sin((deg * Math.PI) / 180),
    ];

    let currentAngle = -90;

    return (
      <svg viewBox="0 0 400 400" className="w-full max-w-[340px] mx-auto select-none">
        {validItems.map((item, idx) => {
          const disc = disciplines.find((d) => d.id === item.id);
          const name = disc ? disc.name : 'Disciplina';
          const sliceFraction = totalMinutes > 0 ? item.min / totalMinutes : 1 / n;
          const sweep = sliceFraction * 360;

          const startA = currentAngle + gap / 2;
          const endA = currentAngle + sweep - gap / 2;
          currentAngle += sweep;

          const [x1, y1] = P(startA);
          const [x2, y2] = P(endA);
          const [x3, y3] = P0(endA);
          const [x4, y4] = P0(startA);

          const largeArc = sweep - gap > 180 ? 1 : 0;
          const pathD = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 ${largeArc} 0 ${x4} ${y4} Z`;

          const colorHue = (idx * 45 + 160) % 360;
          const isCurrent = idx === currentItemIndex;
          const isDone = itemsCompleted[idx];
          const isHovered = hoveredIndex === idx;

          return (
            <g
              key={item.id}
              className="transition-all cursor-pointer group"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (activeRun?.id === item.id && activeRun.start) {
                  onPauseSession();
                } else {
                  onStartSession(item.id);
                }
              }}
            >
              <path
                d={pathD}
                fill={`hsl(${colorHue} ${isCurrent || isHovered ? '85%' : '70%'} ${
                  isDone ? '55%' : '65%'
                })`}
                className={`transition-all duration-200 ${
                  isCurrent || isHovered ? 'brightness-110 filter drop-shadow-md' : 'opacity-90'
                }`}
              />
              <title>{`${name}: ${Math.floor(item.min / 60)}h${String(
                item.min % 60
              ).padStart(2, '0')}min`}</title>
            </g>
          );
        })}

        {/* Center Text displaying total hours */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fontSize={28}
          fontWeight={900}
          className="fill-slate-900 dark:fill-white font-mono tracking-tight"
        >
          {fmtH(totalCycleTargetSeconds)}
        </text>

        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          className="fill-slate-400 dark:fill-slate-500 uppercase tracking-wider"
        >
          {hoveredIndex !== null && validItems[hoveredIndex]
            ? disciplines.find((d) => d.id === validItems[hoveredIndex].id)?.name
            : 'Total Planejado'}
        </text>

        {hoveredIndex !== null && validItems[hoveredIndex] && (
          <text
            x={cx}
            y={cy + 34}
            textAnchor="middle"
            fontSize={12}
            fontWeight={800}
            className="fill-emerald-600 dark:fill-emerald-400 font-mono"
          >
            {fmtH(validItems[hoveredIndex].min * 60)}
          </text>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Title, Edital Switcher & Action Buttons (Matching Image 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
            Planejamento
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ciclo de estudos contínuo e equilibrado por disciplinas
          </p>
        </div>

        {/* Action Buttons: Recomeçar Ciclo & Editar Planejamento (Image 2) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('Deseja recomeçar a contagem deste ciclo de estudos?')) {
                handleResetCycle(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition hover:bg-emerald-100 cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recomeçar Ciclo</span>
          </button>

          <button
            onClick={() => setIsEditingCycle(!isEditingCycle)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEditingCycle ? 'Concluir Ajuste' : 'Editar Planejamento'}</span>
          </button>
        </div>
      </div>

      {/* Top Cards: CICLOS COMPLETOS & PROGRESSO (Matching Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* CICLOS COMPLETOS */}
        <div className="sm:col-span-3 p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ciclos Completos
          </span>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-500 flex items-center justify-center font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
              {currentCycle.n}
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              {currentCycle.n === 1 ? '1 volta dada' : `${currentCycle.n} voltas concluídas`}
            </div>
          </div>
        </div>

        {/* PROGRESSO */}
        <div className="sm:col-span-9 p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-slate-400">Progresso</span>
            <span className="text-slate-800 dark:text-slate-100 font-mono">
              {fmtH(totalCycleCompletedSeconds)} / {fmtH(totalCycleTargetSeconds)}
            </span>
          </div>

          <div className="mt-3">
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, cycleProgressPct))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium mt-1.5">
              <span>{cycleProgressPct}% do tempo concluído</span>
              <span>
                {validItems.filter((_, idx) => itemsCompleted[idx]).length} de{' '}
                {validItems.length} matérias estudadas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editing Form (if toggled) */}
      {isEditingCycle && (
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>Gerenciar Disciplinas do Ciclo</span>
            </h3>
            <button
              onClick={() => setIsEditingCycle(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Disciplina
              </label>
              {availableDisciplines.length > 0 ? (
                <select
                  value={newDiscName}
                  onChange={(e) => setNewDiscName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                >
                  <option value="">Selecione da lista ou digite...</option>
                  {availableDisciplines.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome da disciplina"
                  value={newDiscName}
                  onChange={(e) => setNewDiscName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
                />
              )}
            </div>

            <div className="sm:col-span-4 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Horas
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={newHours}
                  onChange={(e) => setNewHours(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Minutos
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => handleAddItemToCycle(newDiscName)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout (Matching Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: SEQUÊNCIA DOS ESTUDOS (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Sequência dos Estudos</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Arraste ou use as setas para organizar
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {validItems.map((item, idx) => {
              const disc = disciplines.find((d) => d.id === item.id);
              const name = disc ? disc.name : 'Disciplina';
              const completedSec = getItemCompletedSeconds(item);
              const targetSec = item.min * 60;
              const isDone = itemsCompleted[idx];
              const isCurrent = idx === currentItemIndex;
              const isRunning = activeRun?.id === item.id && activeRun.start;
              const colorHue = (idx * 45 + 160) % 360;
              const isBeingDragged = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== idx) setDragOverIndex(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === idx) setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      handleMoveCycleItem(draggedIndex, idx);
                      onToast(`"${name}" movida para posição ${idx + 1}.`);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 relative overflow-hidden select-none ${
                    isBeingDragged
                      ? 'opacity-40 scale-[0.98] border-dashed border-emerald-400 bg-emerald-50/40'
                      : isDragOver
                      ? 'ring-2 ring-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 shadow-md'
                      : isDone
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                      : isCurrent
                      ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Colored Left Stripe (Matching Image 2) */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: `hsl(${colorHue} 75% 50%)` }}
                  />

                  {/* Drag Handle & Reorder Up/Down Controls */}
                  <div className="flex items-center gap-1 pl-1 text-slate-400">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Clique e arraste para organizar a ordem da disciplina"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx > 0) {
                            handleMoveCycleItem(idx, idx - 1);
                            onToast(`"${name}" movida para cima.`);
                          }
                        }}
                        disabled={idx === 0}
                        className={`p-0.5 rounded transition ${
                          idx === 0
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                        }`}
                        title="Mover para cima"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < validItems.length - 1) {
                            handleMoveCycleItem(idx, idx + 1);
                            onToast(`"${name}" movida para baixo.`);
                          }
                        }}
                        disabled={idx === validItems.length - 1}
                        className={`p-0.5 rounded transition ${
                          idx === validItems.length - 1
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                        }`}
                        title="Mover para baixo"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Discipline Name & Progress */}
                  <div className="pl-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
                        {name}
                      </span>
                      {isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          ✓ Concluído
                        </span>
                      )}
                      {isCurrent && !isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                          Atual
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                      <span>⏱ {fmtH(completedSec)} / {fmtH(targetSec)}</span>
                    </div>
                  </div>

                  {/* Actions: Play/Pause button and Delete if editing */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRunning) {
                          onPauseSession();
                        } else {
                          onStartSession(item.id);
                        }
                      }}
                      className={`p-2.5 rounded-xl font-bold transition flex items-center justify-center cursor-pointer ${
                        isRunning
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={isRunning ? 'Pausar estudo' : 'Iniciar estudo agora'}
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    {isEditingCycle && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Remover do ciclo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: CICLO Donut Chart (5 cols) (Matching Image 2) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Ciclo</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">{currentCycle.name}</span>
          </div>

          {/* SVG Donut */}
          <div className="py-2">{renderSvgDonut()}</div>

          {/* Bottom Button: Ajustar Ciclo (Matching Image 2) */}
          <button
            onClick={() => setIsEditingCycle(!isEditingCycle)}
            className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Ajustar Ciclo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
