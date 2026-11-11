import React, { useState } from 'react';
import { User } from '../types';
import { apiLogin, apiRegister } from '../utils/auth';
import { signInWithGoogle } from '../services/firebase';
import {
  LayoutGrid,
  BookOpen,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onToast: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onToast,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
      onToast(`Bem-vindo, ${user.name}! Login com Google realizado com sucesso.`);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }
        if (!email.trim() || !password) {
          throw new Error('Preencha seu email e crie uma senha.');
        }
        const data = await apiRegister(name, email, password);
        onLoginSuccess(data.user);
        onToast(`Bem-vindo, ${data.user.name}! Conta criada com sucesso.`);
        onClose();
      } else {
        if (!email.trim() || !password) {
          throw new Error('Preencha seu email e sua senha.');
        }
        const data = await apiLogin(email, password);
        onLoginSuccess(data.user);
        onToast(`Olá novamente, ${data.user.name}!`);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const platformTools = [
    {
      icon: <LayoutGrid className="w-4 h-4 text-blue-500" />,
      title: 'Quadro Kanban',
      desc: 'Organize suas tarefas, matérias e rotina em cartões visuais',
    },
    {
      icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
      title: 'Edital Verticalizado',
      desc: 'Marque tópicos, subtópicos e o tempo exato de parada das videoaulas',
    },
    {
      icon: <RefreshCw className="w-4 h-4 text-indigo-500" />,
      title: 'Ciclo de Estudos',
      desc: 'Rotação inteligente de matérias com anel visual dinâmico',
    },
    {
      icon: <RotateCcw className="w-4 h-4 text-amber-500" />,
      title: 'Revisões Espaçadas',
      desc: 'Método 24h, 15d, 30d para reter o conteúdo até o dia da prova',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 text-slate-800 dark:text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Dynamic Highlights of Tools */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide backdrop-blur-xs mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Meu Quadro de Estudos</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Sua aprovação planejada com método e foco.
            </h2>
            <p className="text-xs text-white/80 mt-2 leading-relaxed">
              Sincronize seus editais, tarefas e anotações em qualquer dispositivo.
            </p>

            {/* Platform Highlights */}
            <div className="mt-6 space-y-3">
              {platformTools.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 transition border border-white/10"
                >
                  <div className="p-1.5 rounded-xl bg-white text-slate-800 shrink-0 mt-0.5">
                    {tool.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {tool.title}
                    </div>
                    <div className="text-[11px] text-white/80 leading-tight mt-0.5">
                      {tool.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 text-[11px] text-white/70">
            ✓ Seus dados ficam salvos com segurança na nuvem.
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          {/* Quick Google Sign In */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs tracking-wide shadow-xs transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 hover:border-slate-300 dark:hover:border-slate-600"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z" />
                <path fill="#34A853" d="M12 24c3.3 0 6.08-1.1 8.1-2.97l-3.88-3.03c-1.1.74-2.5 1.18-4.22 1.18-3.24 0-5.98-2.18-6.96-5.12H1.05v3.13C3.13 21.3 7.27 24 12 24z" />
                <path fill="#FBBC05" d="M5.04 14.06c-.25-.74-.39-1.53-.39-2.36s.14-1.62.39-2.36V6.21H1.05C.38 7.55 0 9.07 0 10.7c0 1.63.38 3.15 1.05 4.49l3.99-3.13z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.2 0 12 0 7.27 0 3.13 2.7 1.05 6.21l3.99 3.13c.98-2.94 3.72-5.12 6.96-5.12z" />
              </svg>
              <span>Entrar com o Google</span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200 dark:border-slate-700" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                ou continue com email
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:border-slate-700" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Seu Nome
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Emerson Silva"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Cadastrar e Começar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Guest option */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium cursor-pointer"
            >
              Continuar como Convidado (Modo Local Offline)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
