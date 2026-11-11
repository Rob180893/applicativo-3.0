import React, { useState } from 'react';
import { ActiveRun, DiscState, Discipline } from '../types';
import { fmtH, fmtT } from '../utils/formatters';
import { X, Play, Pause, Square, Plus, RotateCcw } from 'lucide-react';

interface FocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  discState: DiscState;
  activeRun: ActiveRun | null;
  onStartSession: (disciplineId: string) => void;
  onPauseSession: () => void;
  onCancelSession: () => void;
  onOpenRegisterModal: () => void;
  currentElapsedSeconds: number;
}

export const FocusModal: React.FC<FocusModalProps> = ({
  isOpen,
  onClose,
  discState,
  activeRun,
  onStartSession,
  onPauseSession,
  onCancelSession,
  onOpenRegisterModal,
  currentElapsedSeconds,
}) => {
  if (!isOpen) return null;

  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(
    activeRun?.id || discState.sel || (disciplines[0] ? disciplines[0].id : '')
  );
  const [mode, setMode] = useState<'sw' | 'tm'>('sw'); // 'sw' = stopwatch, 'tm' = timer
  const [goalMin, setGoalMin] = useState<number>(60);

  const isRunning = !!activeRun?.start;
  const isCurrentActive = activeRun?.id === selectedDisciplineId;

  const elapsed = isCurrentActive ? currentElapsedSeconds : 0;
  const goalSeconds = goalMin * 60;
  const remainingSeconds = Math.max(0, goalSeconds - elapsed);

  const displayTime = mode === 'tm' ? fmtT(remainingSeconds) : fmtT(elapsed);
  const progressPct = Math.min(100, goalSeconds > 0 ? (elapsed / goalSeconds) * 100 : 0);

  const handleToggleTimer = () => {
    if (isRunning && isCurrentActive) {
      onPauseSession();
    } else {
      onStartSession(selectedDisciplineId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 text-white backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col items-center text-center relative py-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-2 right-0 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          title="Fechar tela de foco"
        >
          <X className="w-6 h-6" />
        </button>

        <span className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">
          Modo Foco & Produtividade
        </span>
        <h2 className="text-xl font-extrabold tracking-tight mb-4">
          Contabilize e registre seus estudos
        </h2>

        {/* Discipline selector */}
        <div className="w-full max-w-xs mb-4">
          <select
            value={selectedDisciplineId}
            onChange={(e) => setSelectedDisciplineId(e.target.value)}
            disabled={!!activeRun}
            className="w-full px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center cursor-pointer disabled:opacity-60"
          >
            {disciplines.map((d) => (
              <option key={d.id} value={d.id} className="text-slate-900 bg-white">
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Toggle (Cronômetro / Timer) */}
        <div className="flex rounded-xl bg-white/10 p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode('sw')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition ${
              mode === 'sw' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cronômetro
          </button>
          <button
            type="button"
            onClick={() => setMode('tm')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition ${
              mode === 'tm' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Timer Regressivo
          </button>
        </div>

        {/* Session Goal selector */}
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-300">
          <span>Meta da sessão:</span>
          <input
            type="number"
            min="1"
            value={goalMin}
            onChange={(e) => setGoalMin(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-center font-bold text-white text-xs outline-none"
          />
          <span>min</span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm h-3 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs font-medium text-slate-400 mb-6">
          {fmtH(elapsed)} / {fmtH(goalSeconds)} ({Math.round(progressPct)}%)
        </div>

        {/* Giant Monospace Timer */}
        <div className="font-mono text-6xl sm:text-7xl font-black tracking-tight text-white select-none mb-3 tabular-nums drop-shadow-md">
          {displayTime}
        </div>

        {mode === 'tm' && elapsed >= goalSeconds && (
          <div className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-full mb-4 animate-pulse">
            ⏰ Tempo concluído! Salve a sessão ou adicione mais tempo.
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4 mt-2 mb-6">
          <button
            type="button"
            onClick={handleToggleTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer ${
              isRunning && isCurrentActive
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title={isRunning && isCurrentActive ? 'Pausar' : 'Iniciar'}
          >
            {isRunning && isCurrentActive ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>

          <button
            type="button"
            disabled={!isCurrentActive || elapsed === 0}
            onClick={() => {
              onOpenRegisterModal();
              onClose();
            }}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:pointer-events-none text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Parar e Salvar Registro"
          >
            <Square className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Quick Add Minutes */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Adicione mais tempo à meta:</div>
          <div className="flex items-center justify-center gap-2">
            {[1, 5, 15, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setGoalMin((prev) => prev + mins)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                +{mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Cancel option */}
        {isCurrentActive && elapsed > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Tem certeza que deseja cancelar esta sessão de estudo?')) {
                onCancelSession();
              }
            }}
            className="mt-6 text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
          >
            Cancelar sessão atual
          </button>
        )}
      </div>
    </div>
  );
};
