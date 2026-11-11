import React, { useEffect, useRef, useState } from 'react';
import { DiscState, StudyFile, User } from '../types';
import { apiDeleteFile, apiListFiles, apiUploadFile } from '../utils/auth';
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  X,
  File,
  CheckCircle2,
  Calendar,
  HardDrive,
} from 'lucide-react';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  discState: DiscState;
  user: User | null;
  onOpenLogin: () => void;
  onToast: (msg: string) => void;
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  discState,
  user,
  onOpenLogin,
  onToast,
}) => {
  if (!isOpen) return null;

  const [files, setFiles] = useState<StudyFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
  const disciplines = curEd?.list || [];

  const loadFiles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiListFiles(selectedDisciplineId || undefined);
      setFiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user, selectedDisciplineId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      onOpenLogin();
      return;
    }

    setUploading(true);
    try {
      await apiUploadFile(file, selectedDisciplineId || undefined);
      onToast(`Arquivo "${file.name}" anexado com sucesso.`);
      loadFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      onToast(err.message || 'Falha ao carregar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: StudyFile) => {
    if (window.confirm(`Deseja excluir o arquivo "${file.originalName}"?`)) {
      try {
        await apiDeleteFile(file.id);
        onToast('Arquivo excluído com sucesso.');
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch {
        onToast('Erro ao excluir arquivo.');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Meus Arquivos & Resumos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Armazene e consulte PDFs, mapas mentais e esquemas de estudo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Crie uma conta gratuita ou faça login para enviar e sincronizar seus próprios arquivos de estudo na nuvem.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Entrar ou Criar Conta
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden pt-4 space-y-4">
            {/* Filter and Upload Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <select
                value={selectedDisciplineId}
                onChange={(e) => setSelectedDisciplineId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold outline-none"
              >
                <option value="">Todas as disciplinas</option>
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Enviando...' : 'Carregar Arquivo'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400">Carregando arquivos...</div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <File className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium">Nenhum arquivo anexado ainda.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Envie resumos em PDF, mapas mentais ou anotações para consultar quando quiser.
                  </p>
                </div>
              ) : (
                files.map((file) => {
                  const disc = disciplines.find((d) => d.id === file.disciplineId);
                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {file.originalName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                            {disc && <span className="font-semibold text-blue-500">{disc.name}</span>}
                            {disc && <span>•</span>}
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.uploadDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Visualizar ou Baixar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Excluir arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
