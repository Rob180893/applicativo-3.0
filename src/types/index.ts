export interface KanbanCard {
  id: string;
  text: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  name: string;
  cols: KanbanColumn[];
}

export interface BoardsState {
  list: KanbanBoard[];
  sel: string;
}

export interface TopicTypes {
  v?: boolean; // Videoaula
  p?: boolean; // PDF
  q?: boolean; // Questões
}

export interface SubTopic {
  id: string;
  name: string;
  studied?: string | null;
  done?: boolean; // backwards compatibility
  videoTime?: string; // Tempo em que parou a vídeo aula (ex: "45:20" ou "01:15:00")
  pi?: number; // página inicial
  pf?: number; // página final
  h?: number; // acertos
  e?: number; // erros
  q?: boolean;
  tp?: TopicTypes;
  link?: string;
  r?: Record<number, number>; // revisões espaçadas
  recurringDays?: number; // Revisão periódica a cada tantos dias após 45d (ex: 30)
  recurringDates?: string[]; // Histórico de datas das revisões periódicas concluídas
}

export interface Topic {
  id: string;
  name: string;
  g?: string; // Group / Conteúdo
  studied: string | null; // ISO Date YYYY-MM-DD
  videoTime?: string; // Tempo em que parou a vídeo aula (ex: "45:20" ou "01:15:00")
  q?: boolean;
  r?: Record<number, number>; // reviews: interval -> 1 if done
  h?: number; // hits / acertos
  e?: number; // errors / erros
  pi?: number; // pagina inicial
  pf?: number; // pagina final
  link?: string;
  tp?: TopicTypes;
  subs?: SubTopic[];
  recurringDays?: number; // Revisão periódica a cada tantos dias após 45d (ex: 30)
  recurringDates?: string[]; // Histórico de datas das revisões periódicas concluídas
}

export interface Discipline {
  id: string;
  name: string;
  topics: Topic[];
  log?: Record<string, number>; // date (YYYY-MM-DD) -> seconds
  pdfs?: Array<{
    id: string;
    name: string;
    total: number;
    reads: Array<{ id: string; a: number; b: number; date: string }>;
  }>;
}

export interface StudyCycleItem {
  id: string; // discipline ID
  min: number; // target minutes
}

export interface StudyCycle {
  id: string;
  name: string;
  items: StudyCycleItem[];
  base: Record<string, number>; // discipline ID -> baseline seconds
  n: number; // completed cycles count
}

export interface Edital {
  id: string;
  name: string;
  list: Discipline[];
  cycles?: StudyCycle[];
  csel?: string;
}

export interface StudyActivity {
  t: number; // timestamp
  d: string; // discipline ID
  txt: string;
  s?: number; // duration in seconds
}

export interface StudyGoals {
  h: number; // weekly hours
  q: number; // weekly questions
}

export interface StudyReminder {
  id: string;
  text: string;
  date?: string;
  done: boolean;
}

export interface ActiveRun {
  id: string; // discipline ID
  start: number | null; // timestamp when running, null if paused
  acc: number; // accumulated seconds
  day: string; // ISO date
}

export interface DiscState {
  eds: Edital[];
  edsel: string;
  sel: string; // current discipline ID
  intv?: number[]; // spaced repetition intervals, e.g. [1, 15, 30, 45]
  defaultRecurringDays?: number; // default periodic interval after 45d, e.g. 30
  recurringEnabled?: boolean; // whether periodic review after 45d is enabled
  run?: ActiveRun | null;
  acts?: StudyActivity[];
  goals?: StudyGoals;
  rem?: StudyReminder[];
  qlog?: Record<string, number>; // date -> questions count
  // backward-compatibility getters/setters when active
  list?: Discipline[];
  cycles?: StudyCycle[];
  csel?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface StudyFile {
  id: string;
  userId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  disciplineId?: string;
  topicId?: string;
  url?: string;
}

export interface ExportBackupData {
  app: string;
  version: number;
  exported: string;
  boards: BoardsState;
  disc: {
    eds: Edital[];
    edsel: string;
    sel: string;
    intv?: number[];
    acts?: StudyActivity[];
    goals?: StudyGoals;
    rem?: StudyReminder[];
    qlog?: Record<string, number>;
  };
}
