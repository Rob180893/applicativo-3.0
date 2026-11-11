import React, { useState } from 'react';
import { ActiveRun, DiscState } from '../types';
import { addD, fmtT, iso, parseTimeToSeconds } from '../utils/formatters';
import { X, CheckCircle, BookOpen, HelpCircle, FileText, Video } from 'lucide-react';

interface StudyRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  discState: DiscState;
  activeRun: ActiveRun | null;
  onSaveSession: (data: {
    disciplineId: string;
    topicId: string;
    date: string;
    seconds: number;
    category: string;
    material: string;
    correctQuestions: number;
    wrongQuestions: number;
    initialPage: number;
    finalPage: number;
    videoTitle: string;
    videoStart: string;
    videoEnd: string;
    comments: string;
    finishTheory: boolean;
    scheduleReviews: boolean;
  }) => void;
}

export const StudyRegisterModal: React.FC<StudyRegisterModalProps> = ({
  isOpen,
  onClose,
  discState,
  activeRun,
  onSaveSession,
}) => {
  if (!isOpen) return null;

  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];

  const initialDisciplineId =
    activeRun?.id || discState.sel || (disciplines[0] ? disciplines[0].id : '');

  const accumulatedSeconds = Math.round(activeRun?.acc || 0);

  const todayIso = iso(new Date());
  const yesterdayIso = addD(todayIso, -1);

  const [dateSelection, setDateSelection] = useState<'Hoje' | 'Ontem' | 'Outro'>('Hoje');
  const [customDate, setCustomDate] = useState<string>(todayIso);
  const [category, setCategory] = useState<string>('Teoria');
  const [disciplineId, setDisciplineId] = useState<string>(initialDisciplineId);
  const [topicId, setTopicId] = useState<string>('');
  const [timeFormatted, setTimeFormatted] = useState<string>(fmtT(accumulatedSeconds));
  const [material, setMaterial] = useState<string>('');
  const [finishTheory, setFinishTheory] = useState<boolean>(false);
  const [scheduleReviews, setScheduleReviews] = useState<boolean>(false);

  const [correctQuestions, setCorrectQuestions] = useState<number>(0);
  const [wrongQuestions, setWrongQuestions] = useState<number>(0);

  const [initialPage, setInitialPage] = useState<number>(0);
  const [finalPage, setFinalPage] = useState<number>(0);

  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoStart, setVideoStart] = useState<string>('');
  const [videoEnd, setVideoEnd] = useState<string>('');

  const [comments, setComments] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedDisc = disciplines.find((d) => d.id === disciplineId);
  const topics = selectedDisc?.topics || [];

  const handleSave = () => {
    setErrorMessage('');
    const targetDate =
      dateSelection === 'Hoje'
        ? todayIso
        : dateSelection === 'Ontem'
        ? yesterdayIso
        : customDate || todayIso;

    const totalSeconds = parseTimeToSeconds(timeFormatted);

    if ((correctQuestions > 0 || wrongQuestions > 0) && !topicId) {
      setErrorMessage('Selecione um tópico para vincular as questões resolvidas.');
      return;
    }

    onSaveSession({
      disciplineId,
      topicId,
      date: targetDate,
      seconds: totalSeconds,
      category,
      material: material.trim(),
      correctQuestions: Math.max(0, correctQuestions),
      wrongQuestions: Math.max(0, wrongQuestions),
      initialPage: Math.max(0, initialPage),
      finalPage: Math.max(0, finalPage),
      videoTitle: videoTitle.trim(),
      videoStart: videoStart.trim(),
      videoEnd: videoEnd.trim(),
      comments: comments.trim(),
      finishTheory,
      scheduleReviews,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Registro de Estudo</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grave seu tempo, páginas lidas, videoaulas e questões
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selection */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
            Data:
          </span>
          {(['Hoje', 'Ontem', 'Outro'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateSelection(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                dateSelection === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
          {dateSelection === 'Outro' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            />
          )}
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mt-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Teoria">Teoria</option>
              <option value="Videoaula">Videoaula</option>
              <option value="Questões">Questões</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Tempo de Estudo (HH:MM:SS)
            </label>
            <input
              type="text"
              value={timeFormatted}
              onChange={(e) => setTimeFormatted(e.target.value)}
              placeholder="00:00:00"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Disciplina
            </label>
            <select
              value={disciplineId}
              onChange={(e) => {
                setDisciplineId(e.target.value);
                setTopicId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Tópico / Assunto
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">— Nenhum —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Material (opcional)
            </label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Ex.: Aula 01 - PDF Gran Cursos / Livro Cap. 3"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Checkbox options */}
        <div className="flex flex-wrap gap-4 sm:gap-6 mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={finishTheory}
              onChange={(e) => setFinishTheory(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Marcar Teoria como Finalizada</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={scheduleReviews}
              onChange={(e) => setScheduleReviews(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Programar Revisões Espaçadas</span>
          </label>
        </div>

        {/* Detailed Study Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {/* Questões */}
          <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Questões</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">
                  ✓ Acertos
                </span>
                <input
                  type="number"
                  min="0"
                  value={correctQuestions}
                  onChange={(e) => setCorrectQuestions(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold block mb-0.5">
                  ✗ Erros
                </span>
                <input
                  type="number"
                  min="0"
                  value={wrongQuestions}
                  onChange={(e) => setWrongQuestions(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Páginas */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Páginas</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-0.5">
                  Início
                </span>
                <input
                  type="number"
                  min="0"
                  value={initialPage}
                  onChange={(e) => setInitialPage(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block mb-0.5">
                  Fim
                </span>
                <input
                  type="number"
                  min="0"
                  value={finalPage}
                  onChange={(e) => setFinalPage(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Videoaulas */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              <Video className="w-3.5 h-3.5" />
              <span>Videoaula</span>
            </div>
            <input
              type="text"
              placeholder="Ex.: Bloco 02"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mb-1.5"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Início 00:00"
                value={videoStart}
                onChange={(e) => setVideoStart(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono text-center"
              />
              <input
                type="text"
                placeholder="Fim 30:00"
                value={videoEnd}
                onChange={(e) => setVideoEnd(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono text-center"
              />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Comentários & Anotações
          </label>
          <textarea
            rows={2}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Ex.: Fixar prazo prescricional de 5 anos; rever jurisprudência do STJ..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition cursor-pointer"
          >
            Salvar Registro
          </button>
        </div>
      </div>
    </div>
  );
};
