import React, { useState } from 'react';
import { DiscState } from '../types';
import { addD, fmtH, fmtS, iso } from '../utils/formatters';
import {
  Clock,
  TrendingUp,
  BarChart2,
  Award,
  AlertTriangle,
  Target,
  CheckCircle2,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface CompareViewProps {
  discState: DiscState;
  currentElapsedSeconds: number;
}

export const CompareView: React.FC<CompareViewProps> = ({
  discState,
  currentElapsedSeconds,
}) => {
  const [selectedEditalId, setSelectedEditalId] = useState<string>(
    discState.edsel || discState.eds[0]?.id || ''
  );
  const [period, setPeriod] = useState<'d' | '7' | '30' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'hits' | 'topics'>('time');

  const curEd =
    discState.eds.find((e) => e.id === selectedEditalId) ||
    discState.eds.find((e) => e.id === discState.edsel) ||
    discState.eds[0];

  const disciplines = curEd?.list || [];
  const todayIso = iso(new Date());

  const periodLabel =
    period === 'd'
      ? 'Hoje'
      : period === '7'
      ? 'Últimos 7 dias'
      : period === '30'
      ? 'Últimos 30 dias'
      : 'Todo o período';

  // Calculate seconds in given period for a discipline
  const getSecondsInPeriod = (d: (typeof disciplines)[0], p: 'd' | '7' | '30' | 'all') => {
    const limitDate =
      p === 'd'
        ? addD(todayIso, -1)
        : p === '7'
        ? addD(todayIso, -7)
        : p === '30'
        ? addD(todayIso, -30)
        : '';

    let sec = 0;
    Object.entries(d.log || {}).forEach(([dayKey, val]) => {
      if (p === 'all' || dayKey > limitDate) {
        sec += val;
      }
    });

    if (discState.run?.start && discState.run.id === d.id && discState.edsel === curEd?.id) {
      sec += currentElapsedSeconds;
    }

    return sec;
  };

  // Compile detailed stats for each discipline
  const detailedRows = disciplines.map((d) => {
    const sec = getSecondsInPeriod(d, period);
    const totalTopics = d.topics.length;
    const studiedTopics = d.topics.filter((t) => t.studied).length;

    // Total questions and hits across topics and subtopics
    let totalHits = 0;
    let totalErrors = 0;
    let reviewsCompleted = 0;

    d.topics.forEach((t) => {
      totalHits += t.h || 0;
      totalErrors += t.e || 0;
      reviewsCompleted += Object.values(t.r || {}).filter(Boolean).length;

      // also include subtopics
      (t.subs || []).forEach((st) => {
        totalHits += st.h || 0;
        totalErrors += st.e || 0;
        reviewsCompleted += Object.values(st.r || {}).filter(Boolean).length;
      });
    });

    const totalQuestions = totalHits + totalErrors;
    const hitRate = totalQuestions > 0 ? Math.round((totalHits / totalQuestions) * 100) : 0;
    const coveragePct = totalTopics > 0 ? Math.round((studiedTopics / totalTopics) * 100) : 0;

    return {
      discipline: d,
      seconds: sec,
      totalTopics,
      studiedTopics,
      coveragePct,
      totalQuestions,
      totalHits,
      totalErrors,
      hitRate,
      reviewsCompleted,
    };
  });

  // Sort rows based on user preference
  const sortedRows = [...detailedRows].sort((a, b) => {
    if (sortBy === 'hits') {
      return b.hitRate - a.hitRate || b.totalQuestions - a.totalQuestions;
    }
    if (sortBy === 'topics') {
      return b.coveragePct - a.coveragePct;
    }
    return b.seconds - a.seconds;
  });

  const totalPeriodSeconds = detailedRows.reduce((acc, r) => acc + r.seconds, 0);
  const maxPeriodSeconds = Math.max(...detailedRows.map((r) => r.seconds), 1);
  const totalQuestionsAll = detailedRows.reduce((acc, r) => acc + r.totalQuestions, 0);
  const totalHitsAll = detailedRows.reduce((acc, r) => acc + r.totalHits, 0);
  const overallHitRate =
    totalQuestionsAll > 0 ? Math.round((totalHitsAll / totalQuestionsAll) * 100) : 0;
  const totalTopicsAll = detailedRows.reduce((acc, r) => acc + r.totalTopics, 0);
  const totalStudiedAll = detailedRows.reduce((acc, r) => acc + r.studiedTopics, 0);
  const overallCoverage =
    totalTopicsAll > 0 ? Math.round((totalStudiedAll / totalTopicsAll) * 100) : 0;

  // Best & attention disciplines
  const mostStudied = [...detailedRows].sort((a, b) => b.seconds - a.seconds)[0];
  const bestAccuracy = [...detailedRows]
    .filter((r) => r.totalQuestions >= 5)
    .sort((a, b) => b.hitRate - a.hitRate)[0];
  const needsAttention = [...detailedRows]
    .filter((r) => r.totalQuestions >= 3 && r.hitRate < 65)
    .sort((a, b) => a.hitRate - b.hitRate)[0];

  return (
    <div className="space-y-6">
      {/* Edital Selection Bar & Period Chips */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Painel Comparativo de Desempenho
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Análise aprofundada por edital: horas dedicadas, cobertura do conteúdo e assertividade em questões.
          </p>
        </div>

        {/* Controls: Edital Selector & Period Chips */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Edital selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Edital:</span>
            </label>
            <select
              value={selectedEditalId}
              onChange={(e) => setSelectedEditalId(e.target.value)}
              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {discState.eds.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} ({ed.list.length} disc.)
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
            {(
              [
                ['d', 'Hoje'],
                ['7', '7 Dias'],
                ['30', '30 Dias'],
                ['all', 'Geral'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  period === key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Time */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Tempo ({periodLabel})
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {fmtH(totalPeriodSeconds)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {disciplines.length} disciplinas no edital
            </div>
          </div>
        </div>

        {/* Global Hit Rate */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Taxa de Acertos</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {overallHitRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalHitsAll} acertos em {totalQuestionsAll} questões
            </div>
          </div>
        </div>

        {/* Edital Coverage */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Edital Vencido</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {overallCoverage}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalStudiedAll} de {totalTopicsAll} tópicos estudados
            </div>
          </div>
        </div>

        {/* Discipline Leader / Attention */}
        <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maior Foco</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 truncate">
              {mostStudied?.seconds ? mostStudied.discipline.name : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {mostStudied?.seconds ? fmtH(mostStudied.seconds) : 'Nenhum registro ainda'}
            </div>
          </div>
        </div>
      </div>

      {/* Focus & Attention Highlights */}
      {(bestAccuracy || needsAttention) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestAccuracy && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Melhor Desempenho em Questões
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {bestAccuracy.discipline.name} —{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {bestAccuracy.hitRate}% de acerto
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {bestAccuracy.totalHits} acertos de {bestAccuracy.totalQuestions} questões resolvidas.
                </p>
              </div>
            </div>
          )}

          {needsAttention && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Ponto de Atenção
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {needsAttention.discipline.name} —{' '}
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {needsAttention.hitRate}% de acerto
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Abaixo da média recomendada. Recomendamos reforçar a teoria e revisar os erros.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Dynamic Share Bars */}
      <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Distribuição de Horas por Disciplina ({curEd?.name})</span>
          </h3>

          {/* Sort tabs */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Ordenar por:
            </span>
            <button
              onClick={() => setSortBy('time')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                sortBy === 'time'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Horas
            </button>
            <button
              onClick={() => setSortBy('hits')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                sortBy === 'hits'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Acertos (%)
            </button>
            <button
              onClick={() => setSortBy('topics')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                sortBy === 'topics'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Tópicos
            </button>
          </div>
        </div>

        {/* Proportional Stacked Bar */}
        {totalPeriodSeconds > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden flex shadow-inner">
              {detailedRows
                .filter((r) => r.seconds > 0)
                .map((r, i) => {
                  const sharePct = ((r.seconds / totalPeriodSeconds) * 100).toFixed(1);
                  const colorHue = (i * 47 + 215) % 360;
                  return (
                    <div
                      key={r.discipline.id}
                      style={{
                        width: `${sharePct}%`,
                        backgroundColor: `hsl(${colorHue} 70% 55%)`,
                      }}
                      className="h-full hover:brightness-110 transition cursor-help relative group"
                      title={`${r.discipline.name}: ${sharePct}% (${fmtH(r.seconds)})`}
                    />
                  );
                })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
              <span>0%</span>
              <span>Distribuição proporcional do tempo total ({fmtH(totalPeriodSeconds)})</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Detailed Individual Discipline Bars */}
        <div className="space-y-3 pt-2">
          {sortedRows.map((r, i) => {
            const barPct = Math.max(2, (r.seconds / maxPeriodSeconds) * 100);
            const shareOfTotal =
              totalPeriodSeconds > 0 ? ((r.seconds / totalPeriodSeconds) * 100).toFixed(1) : '0';
            const colorHue = (i * 47 + 215) % 360;

            return (
              <div
                key={r.discipline.id}
                className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-800 transition"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: `hsl(${colorHue} 70% 55%)` }}
                    />
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 uppercase">
                      {r.discipline.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                      {shareOfTotal}% do tempo
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {r.totalQuestions > 0 && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          r.hitRate >= 80
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                            : r.hitRate >= 60
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        🎯 {r.hitRate}% acertos
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {fmtS(r.seconds)}
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="h-3.5 bg-slate-200/70 dark:bg-slate-700/60 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: `hsl(${colorHue} 65% 55%)`,
                    }}
                  />
                </div>

                {/* Submetrics */}
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Tópicos:{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {r.studiedTopics}/{r.totalTopics}
                    </strong>{' '}
                    ({r.coveragePct}%)
                  </span>
                  <span>
                    Questões:{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {r.totalQuestions}
                    </strong>{' '}
                    ({r.totalHits} acertos / {r.totalErrors} erros)
                  </span>
                  <span>
                    Revisões Concluídas:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {r.reviewsCompleted}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Matrix Table */}
      <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <span>Tabela Comparativa Geral ({curEd?.name})</span>
          </h3>
          <span className="text-xs text-slate-400">
            {disciplines.length} matérias cadastradas
          </span>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Disciplina</th>
                <th className="py-2.5 px-2 text-right">Hoje</th>
                <th className="py-2.5 px-2 text-right">7 Dias</th>
                <th className="py-2.5 px-2 text-right">30 Dias</th>
                <th className="py-2.5 px-2 text-right">Total</th>
                <th className="py-2.5 px-2 text-center">Tópicos Vencidos</th>
                <th className="py-2.5 px-2 text-center">Questões Feitas</th>
                <th className="py-2.5 px-2 text-center">Aproveitamento</th>
                <th className="py-2.5 px-2 text-center">Revisões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedRows.map((r) => {
                const d = r.discipline;
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-3 font-bold uppercase text-slate-900 dark:text-white">
                      {d.name}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                      {fmtH(getSecondsInPeriod(d, 'd'))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                      {fmtH(getSecondsInPeriod(d, '7'))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                      {fmtH(getSecondsInPeriod(d, '30'))}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      {fmtH(getSecondsInPeriod(d, 'all'))}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {r.studiedTopics}
                      </span>
                      /{r.totalTopics}{' '}
                      <span className="text-[10px] text-slate-400">({r.coveragePct}%)</span>
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      {r.totalQuestions > 0 ? (
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {r.totalQuestions}
                          </strong>{' '}
                          <span className="text-[10px] text-slate-400">
                            ({r.totalHits}A/{r.totalErrors}E)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      {r.totalQuestions > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.hitRate >= 80
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : r.hitRate >= 60
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {r.hitRate}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {r.reviewsCompleted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
