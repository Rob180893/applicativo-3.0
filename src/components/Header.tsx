import React, { useRef } from 'react';
import {
  Home,
  LayoutGrid,
  BookOpen,
  BarChart3,
  RefreshCw,
  Sun,
  Moon,
  Download,
  FileSpreadsheet,
  Upload,
  Menu,
  X,
  User as UserIcon,
  FolderArchive,
  LogOut,
  LogIn,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { User } from '../types';

export type TabKey = 'h' | 'q' | 'd' | 'c' | 'y';

interface HeaderProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (file: File) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenFiles: () => void;
  onOpenRegisterModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onToggleOpen,
  isDark,
  onToggleTheme,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  user,
  onOpenAuth,
  onLogout,
  onOpenFiles,
  onOpenRegisterModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'h', label: 'Início', icon: <Home className="w-4 h-4" /> },
    { key: 'q', label: 'Quadro Kanban', icon: <LayoutGrid className="w-4 h-4" /> },
    { key: 'd', label: 'Disciplinas', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'c', label: 'Comparar', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'y', label: 'Ciclo de Estudos', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Burger Button for Mobile & Toggle */}
      <div className="fixed left-3.5 top-3.5 z-40 flex items-center gap-2">
        <button
          onClick={onToggleOpen}
          aria-label="Abrir ou fechar menu de navegação"
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 shadow-md backdrop-blur-sm hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Quick Actions & User Status when sidebar is collapsed */}
        {!isOpen && (
          <div className="flex items-center gap-2">
            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                title="Registrar nova sessão de estudo"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span className="hidden sm:inline">Adicionar Estudo</span>
              </button>
            )}

            {user ? (
              <button
                onClick={onOpenFiles}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-emerald-500 cursor-pointer"
                title="Abrir meus materiais de estudo salvos"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <FolderArchive className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="truncate max-w-[120px]">{user.name}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-xs text-xs font-bold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Backdrop for closing when clicking outside (PC and mobile) */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-gradient-to-b from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] text-white flex flex-col justify-between p-4 shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between pb-4 pt-1 border-b border-white/20">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📋</span>
              <div>
                <h1 className="font-extrabold text-sm tracking-wider uppercase leading-tight">
                  Meu Quadro
                </h1>
                <p className="text-[10px] text-white/70">Plataforma de Estudos</p>
              </div>
            </div>
            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              title="Recolher menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Account Section */}
          <div className="mt-4 p-3 rounded-2xl bg-white/15 border border-white/20">
            {user ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50 shadow-xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-bold text-xs uppercase text-white shadow-xs">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-white/70 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={onOpenFiles}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition cursor-pointer"
                    title="Ver arquivos e materiais anexados"
                  >
                    <FolderArchive className="w-3 h-3" />
                    <span>Materiais</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-white text-[11px] font-semibold transition cursor-pointer"
                    title="Sair da conta"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold text-white/90">
                  Sincronização & Arquivos
                </p>
                <p className="text-[10px] text-white/70">
                  Crie sua conta para guardar apostilas e sincronizar entre dispositivos.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar / Cadastrar</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const active = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onSelectTab(item.key);
                    onToggleOpen();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    active
                      ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/30 font-bold'
                      : 'text-white/85 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-white/80'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3 pt-4 border-t border-white/20">
          {/* Theme switcher */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Tema
            </span>
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition cursor-pointer"
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" /> Claro
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-200" /> Escuro
                </>
              )}
            </button>
          </div>

          {/* Backup / Export Buttons */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/70 px-1">
              Backup & Dados
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onExportJSON}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
                title="Baixar backup completo em JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar</span>
              </button>
              <button
                onClick={onExportCSV}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
                title="Baixar planilha de tópicos em CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Planilha</span>
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
              title="Restaurar dados de um arquivo de backup"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* PWA Install Button */}
          <div className="pt-1">
            <PWAInstallButton />
          </div>
        </div>
      </aside>
    </>
  );
};
