/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  ActiveRun,
  BoardsState,
  DiscState,
  Discipline,
  User,
} from './types';
import {
  exportAllDataJSON,
  exportAllTopicsCSV,
  KEY_NAV,
  KEY_THEME,
  loadBoardsFromStorage,
  loadDiscFromStorage,
  normalizeDiscState,
  saveBoardsToStorage,
  saveDiscToStorage,
} from './utils/storage';
import { iso } from './utils/formatters';
import {
  apiGetMe,
  apiLogout,
  apiPullCloudData,
  apiSyncData,
  getStoredUser,
} from './utils/auth';
import {
  onFirebaseAuthStateChanged,
  signOutFirebase,
  saveStudyDataToFirestore,
  loadStudyDataFromFirestore,
} from './services/firebase';
import { Header, TabKey } from './components/Header';
import { HomeView } from './components/HomeView';
import { KanbanView } from './components/KanbanView';
import { DisciplinesView } from './components/DisciplinesView';
import { CycleView } from './components/CycleView';
import { CompareView } from './components/CompareView';
import { FocusModal } from './components/FocusModal';
import { StudyRegisterModal } from './components/StudyRegisterModal';
import { FloatingReviewsWidget } from './components/FloatingReviewsWidget';
import { LoginModal } from './components/LoginModal';
import { FileManagerModal } from './components/FileManagerModal';
import { Toast } from './components/Toast';

export default function App() {
  // Navigation & Theme State (starts collapsed on all devices including PC)
  const [currentTab, setCurrentTab] = useState<TabKey>('h');
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(KEY_THEME);
      if (stored) return stored === 'dark';
      return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    } catch {
      return false;
    }
  });

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isFileManagerModalOpen, setIsFileManagerModalOpen] = useState<boolean>(false);

  // Data State
  const [boardsState, setBoardsState] = useState<BoardsState>(() => loadBoardsFromStorage());
  const [discState, setDiscState] = useState<DiscState>(() => loadDiscFromStorage());

  // Timer Tick State
  const [timerNow, setTimerNow] = useState<number>(Date.now());

  // Modals & Notifications
  const [isFocusModalOpen, setIsFocusModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check user session on initial mount & listen to Firebase Auth
  useEffect(() => {
    // 1. Firebase Auth listener (supports Google Sign-In)
    const unsubscribeFb = onFirebaseAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        const fsData = await loadStudyDataFromFirestore(fbUser.id);
        if (fsData?.boards && fsData?.disc) {
          setBoardsState(fsData.boards);
          setDiscState(normalizeDiscState(fsData.disc));
        }
      }
    });

    // 2. Local token check
    apiGetMe().then(async (user) => {
      if (user) {
        setCurrentUser(user);
        const fsData = await loadStudyDataFromFirestore(user.id);
        if (fsData?.boards && fsData?.disc) {
          setBoardsState(fsData.boards);
          setDiscState(normalizeDiscState(fsData.disc));
        } else {
          const cloudData = await apiPullCloudData();
          if (cloudData?.boards && cloudData?.disc) {
            setBoardsState(cloudData.boards);
            setDiscState(normalizeDiscState(cloudData.disc));
          }
        }
      }
    });

    return () => {
      unsubscribeFb();
    };
  }, []);

  // Sync theme attribute on documentElement
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem(KEY_THEME, isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  // Sync nav state to localStorage
  const handleToggleNav = () => {
    setIsNavOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY_NAV, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  // Save changes to localStorage & Debounced Cloud Sync (Firestore & Backend)
  const syncTimeoutRef = useRef<any>(null);

  useEffect(() => {
    saveBoardsToStorage(boardsState);
    if (currentUser) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        saveStudyDataToFirestore(currentUser.id, boardsState, discState);
        apiSyncData(boardsState, discState);
      }, 1500);
    }
  }, [boardsState, currentUser]);

  useEffect(() => {
    saveDiscToStorage(discState);
    if (currentUser) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        saveStudyDataToFirestore(currentUser.id, boardsState, discState);
        apiSyncData(boardsState, discState);
      }, 1500);
    }
  }, [discState, currentUser]);

  // Timer ticker every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (discState.run?.start) {
        setTimerNow(Date.now());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [discState.run?.start]);

  // Calculate current elapsed seconds for active run
  const activeRun = discState.run || null;
  const currentElapsedSeconds = activeRun
    ? Math.max(
        0,
        (activeRun.acc || 0) +
          (activeRun.start ? (timerNow - activeRun.start) / 1000 : 0)
      )
    : 0;

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOutFirebase();
    } catch {}
    await apiLogout();
    setCurrentUser(null);
    showToast('Você saiu da sua conta.');
  };

  // Handle Login success
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    showToast(`Bem-vindo(a), ${user.name}!`);

    // 1. Check Firestore cloud data first
    const fsData = await loadStudyDataFromFirestore(user.id);
    if (fsData?.boards && fsData?.disc) {
      setBoardsState(fsData.boards);
      setDiscState(normalizeDiscState(fsData.disc));
      showToast('Dados sincronizados do Firebase com sucesso! ☁️');
      return;
    }

    // 2. Check local backend sync data
    const cloudRes = await apiPullCloudData();
    if (cloudRes?.boards && cloudRes?.disc) {
      setBoardsState(cloudRes.boards);
      setDiscState(normalizeDiscState(cloudRes.disc));
      // Also copy to Firestore
      await saveStudyDataToFirestore(user.id, cloudRes.boards, cloudRes.disc);
      showToast('Dados sincronizados da sua conta com sucesso!');
    } else {
      // First time login: preserve existing study data to Firestore
      await saveStudyDataToFirestore(user.id, boardsState, discState);
      await apiSyncData(boardsState, discState);
    }
  };

  // Timer actions
  const handleStartSession = (disciplineId: string) => {
    setDiscState((prev) => {
      if (prev.run && prev.run.id === disciplineId) {
        if (!prev.run.start) {
          return {
            ...prev,
            run: { ...prev.run, start: Date.now() },
          };
        }
        return prev;
      }

      // If another session was running, accumulate it into its discipline log
      let updatedEds = prev.eds;
      if (prev.run) {
        const oldRun = prev.run;
        const totalOldSec =
          (oldRun.acc || 0) + (oldRun.start ? (Date.now() - oldRun.start) / 1000 : 0);
        const curDay = oldRun.day || iso(new Date());

        updatedEds = prev.eds.map((ed) => ({
          ...ed,
          list: ed.list.map((d) => {
            if (d.id !== oldRun.id) return d;
            const newLog = { ...(d.log || {}) };
            newLog[curDay] = (newLog[curDay] || 0) + totalOldSec;
            return { ...d, log: newLog };
          }),
        }));
      }

      const newRun: ActiveRun = {
        id: disciplineId,
        start: Date.now(),
        acc: 0,
        day: iso(new Date()),
      };

      return {
        ...prev,
        eds: updatedEds,
        run: newRun,
      };
    });
  };

  const handlePauseSession = () => {
    setDiscState((prev) => {
      if (!prev.run || !prev.run.start) return prev;
      const additional = (Date.now() - prev.run.start) / 1000;
      return {
        ...prev,
        run: {
          ...prev.run,
          acc: (prev.run.acc || 0) + additional,
          start: null,
        },
      };
    });
  };

  const handleCancelSession = () => {
    setDiscState((prev) => ({ ...prev, run: null }));
    showToast('Sessão cancelada.');
  };

  // Save session record (from modal)
  const handleSaveSessionData = (data: {
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
  }) => {
    const curEd = discState.eds.find((e) => e.id === discState.edsel) || discState.eds[0];
    const targetDiscipline = curEd?.list.find((d) => d.id === data.disciplineId);

    const parts: string[] = [data.category];
    if (data.topicId && targetDiscipline) {
      const topic = targetDiscipline.topics.find((t) => t.id === data.topicId);
      if (topic) parts.push(topic.name);
    }
    if (data.material) parts.push(`Material: ${data.material}`);
    if (data.correctQuestions || data.wrongQuestions) {
      parts.push(`${data.correctQuestions} acertos / ${data.wrongQuestions} erros`);
    }
    if (data.initialPage || data.finalPage) {
      parts.push(`págs. ${data.initialPage}–${data.finalPage}`);
    }
    if (data.videoTitle) {
      parts.push(`${data.videoTitle} (${data.videoStart || '00:00'}–${data.videoEnd || '00:00'})`);
    }
    if (data.comments) {
      parts.push(`“${data.comments}”`);
    }

    setDiscState((prev) => {
      const updatedEds = prev.eds.map((ed) => {
        if (ed.id !== prev.edsel) return ed;
        return {
          ...ed,
          list: ed.list.map((d) => {
            if (d.id !== data.disciplineId) return d;
            const newLog = { ...(d.log || {}) };
            newLog[data.date] = (newLog[data.date] || 0) + data.seconds;

            let updatedTopics = [...d.topics];
            if (data.topicId) {
              updatedTopics = d.topics.map((t) => {
                if (t.id !== data.topicId) return t;
                const newHits = (t.h || 0) + data.correctQuestions;
                const newErrors = (t.e || 0) + data.wrongQuestions;
                const shouldMarkStudied =
                  (data.finishTheory || data.scheduleReviews) && !t.studied
                    ? data.date
                    : t.studied;

                return {
                  ...t,
                  h: newHits,
                  e: newErrors,
                  q: (newHits + newErrors > 0) || t.q,
                  pi: data.initialPage > 0 ? data.initialPage : t.pi,
                  pf: data.finalPage > 0 ? data.finalPage : t.pf,
                  studied: shouldMarkStudied,
                };
              });
            }

            return {
              ...d,
              log: newLog,
              topics: updatedTopics,
            };
          }),
        };
      });

      const newQlog = { ...(prev.qlog || {}) };
      if (data.correctQuestions || data.wrongQuestions) {
        newQlog[data.date] =
          (newQlog[data.date] || 0) + data.correctQuestions + data.wrongQuestions;
      }

      const newActivity = {
        t: Date.now(),
        d: data.disciplineId,
        txt: parts.join(' • '),
        s: data.seconds,
      };

      return {
        ...prev,
        eds: updatedEds,
        qlog: newQlog,
        acts: [...(prev.acts || []), newActivity],
        run: null,
      };
    });

    showToast('Estudo registrado com sucesso!');
  };

  // Check off review from floating widget or panel
  const handleCheckReview = (
    disciplineId: string,
    topicId: string,
    intervalDays: number,
    isRecurring?: boolean
  ) => {
    const today = iso(new Date());
    setDiscState((prev) => ({
      ...prev,
      eds: prev.eds.map((ed) =>
        ed.id === prev.edsel
          ? {
              ...ed,
              list: ed.list.map((d) =>
                d.id === disciplineId
                  ? {
                      ...d,
                      topics: d.topics.map((t) => {
                        if (t.id === topicId) {
                          if (isRecurring) {
                            return {
                              ...t,
                              recurringDates: [...(t.recurringDates || []), today],
                            };
                          }
                          return {
                            ...t,
                            r: { ...(t.r || {}), [intervalDays]: 1 },
                          };
                        }
                        // Also check subtopics
                        if (t.subs?.some((s) => s.id === topicId)) {
                          return {
                            ...t,
                            subs: t.subs.map((s) => {
                              if (s.id !== topicId) return s;
                              if (isRecurring) {
                                return {
                                  ...s,
                                  recurringDates: [...(s.recurringDates || []), today],
                                };
                              }
                              return {
                                ...s,
                                r: { ...(s.r || {}), [intervalDays]: 1 },
                              };
                            }),
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
    showToast(
      isRecurring
        ? `Revisão periódica de ${intervalDays} dias concluída! ✓`
        : 'Revisão marcada como concluída! ✓'
    );
  };

  // Import JSON Backup
  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (
          !parsed ||
          parsed.app !== 'quadro-estudos' ||
          !parsed.boards ||
          !parsed.disc
        ) {
          throw new Error('Formato inválido');
        }

        const normalizedBoards = parsed.boards;
        const normalizedDisc = normalizeDiscState(parsed.disc);

        setBoardsState(normalizedBoards);
        setDiscState(normalizedDisc);
        showToast('Backup importado com sucesso!');
      } catch (err) {
        showToast('Arquivo inválido. Certifique-se de usar um backup exportado por este aplicativo.');
      }
    };
    reader.readAsText(file);
  };

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex text-slate-800 dark:text-slate-100 transition-colors">
      {/* Sidebar Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isNavOpen}
        onToggleOpen={handleToggleNav}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onExportJSON={() => exportAllDataJSON(boardsState, discState)}
        onExportCSV={() => exportAllTopicsCSV(discState)}
        onImportJSON={handleImportJSON}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenFiles={() => setIsFileManagerModalOpen(true)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 transition-all duration-300 min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-24 pt-16 sm:pt-16">
        <div className="max-w-7xl mx-auto">
          {currentTab === 'h' && (
            <HomeView
              discState={discState}
              onUpdateDiscState={setDiscState}
              onNavigateToDiscipline={(dId) => {
                setDiscState((prev) => ({ ...prev, sel: dId }));
                setCurrentTab('d');
              }}
              onToast={showToast}
              currentElapsedSeconds={currentElapsedSeconds}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            />
          )}

          {currentTab === 'q' && (
            <KanbanView
              boardsState={boardsState}
              onUpdateBoards={setBoardsState}
              onToast={showToast}
            />
          )}

          {currentTab === 'd' && (
            <DisciplinesView
              discState={discState}
              onUpdateDiscState={setDiscState}
              activeRun={activeRun}
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onCancelSession={handleCancelSession}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
              onToast={showToast}
              currentElapsedSeconds={currentElapsedSeconds}
            />
          )}

          {currentTab === 'y' && (
            <CycleView
              discState={discState}
              onUpdateDiscState={setDiscState}
              activeRun={activeRun}
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onToast={showToast}
              currentElapsedSeconds={currentElapsedSeconds}
            />
          )}

          {currentTab === 'c' && (
            <CompareView
              discState={discState}
              currentElapsedSeconds={currentElapsedSeconds}
            />
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB ⏱) for Focus & Stopwatch */}
      <button
        onClick={() => setIsFocusModalOpen(true)}
        className="fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center text-2xl font-bold cursor-pointer"
        title="Abrir cronômetro de estudo e modo foco"
      >
        ⏱
      </button>

      {/* Floating Spaced Reviews Widget (🔔) */}
      <FloatingReviewsWidget
        discState={discState}
        onCheckReview={handleCheckReview}
        onNavigateToDiscipline={(dId) => {
          setDiscState((prev) => ({ ...prev, sel: dId }));
          setCurrentTab('d');
        }}
      />

      {/* Focus / Pomodoro Modal */}
      <FocusModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        discState={discState}
        activeRun={activeRun}
        onStartSession={handleStartSession}
        onPauseSession={handlePauseSession}
        onCancelSession={handleCancelSession}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        currentElapsedSeconds={currentElapsedSeconds}
      />

      {/* Study Register Modal */}
      <StudyRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        discState={discState}
        activeRun={activeRun}
        onSaveSession={handleSaveSessionData}
      />

      {/* Login & Register Modal */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onToast={showToast}
      />

      {/* Study File Storage & Attachment Manager Modal */}
      <FileManagerModal
        isOpen={isFileManagerModalOpen}
        onClose={() => setIsFileManagerModalOpen(false)}
        discState={discState}
        user={currentUser}
        onOpenLogin={() => {
          setIsFileManagerModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onToast={showToast}
      />

      {/* Toast Feedback Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
