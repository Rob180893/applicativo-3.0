import {
  BoardsState,
  DiscState,
  Discipline,
  Edital,
  ExportBackupData,
  KanbanBoard,
  Topic,
} from '../types';
import { iso, uid, addD } from './formatters';

export const KEY_BOARDS = 'kanban-v1';
export const KEY_DISC = 'kanban-disc-v1';
export const KEY_THEME = 'kanban-theme';
export const KEY_NAV = 'kanban-nav';
export const KEY_REM_OPEN = 'kanban-rem-open';

export const getDefaultBoards = (): BoardsState => {
  const defaultCols = [
    {
      id: uid(),
      title: 'A fazer',
      cards: [
        { id: uid(), text: 'Pesquisar referências' },
        { id: uid(), text: 'Definir escopo do projeto' },
        { id: uid(), text: 'Montar cronograma' },
      ],
    },
    {
      id: uid(),
      title: 'Em andamento',
      cards: [{ id: uid(), text: 'Desenhar telas' }],
    },
    {
      id: uid(),
      title: 'Concluído',
      cards: [{ id: uid(), text: 'Reunião de kickoff' }],
    },
  ];

  const firstBoard: KanbanBoard = {
    id: uid(),
    name: 'Quadro 1',
    cols: defaultCols,
  };

  return {
    list: [firstBoard],
    sel: firstBoard.id,
  };
};

export const getDefaultDisc = (): DiscState => {
  const defaultTopic: Topic = {
    id: uid(),
    name: 'ATOS ADMINISTRATIVOS',
    studied: null,
    q: false,
    r: {},
    h: 0,
    e: 0,
  };

  const defaultDisc: Discipline = {
    id: uid(),
    name: 'Direito Administrativo',
    topics: [defaultTopic],
    log: {},
  };

  const defaultEdital: Edital = {
    id: uid(),
    name: 'Edital 1',
    list: [defaultDisc],
    cycles: [
      {
        id: uid(),
        name: 'Ciclo 1',
        items: [{ id: defaultDisc.id, min: 60 }],
        base: {},
        n: 0,
      },
    ],
    csel: '',
  };
  defaultEdital.csel = defaultEdital.cycles![0].id;

  return {
    eds: [defaultEdital],
    edsel: defaultEdital.id,
    sel: defaultDisc.id,
    intv: [1, 15, 30, 45],
    acts: [],
    goals: { h: 20, q: 100 },
    rem: [],
    qlog: {},
    run: null,
  };
};

export const normalizeDiscState = (raw: any): DiscState => {
  const state: DiscState = raw && typeof raw === 'object' ? { ...raw } : getDefaultDisc();

  if (!state.eds || !Array.isArray(state.eds) || !state.eds.length) {
    const list = Array.isArray(raw?.list) ? raw.list : [];
    const cycles = Array.isArray(raw?.cycles) ? raw.cycles : [];
    const ed: Edital = {
      id: uid(),
      name: 'Edital 1',
      list: list.length ? list : [{ id: uid(), name: 'Direito Administrativo', topics: [] }],
      cycles: cycles.length ? cycles : undefined,
      csel: raw?.csel,
    };
    state.eds = [ed];
    state.edsel = ed.id;
  }

  if (!state.eds.some((e) => e.id === state.edsel)) {
    state.edsel = state.eds[0].id;
  }

  state.eds.forEach((ed) => {
    if (!ed.list || !Array.isArray(ed.list) || !ed.list.length) {
      ed.list = [{ id: uid(), name: 'Disciplina 1', topics: [] }];
    }
    ed.list.forEach((d) => {
      d.topics = d.topics || [];
      d.topics.forEach((t) => {
        t.name = String(t.name || '').toUpperCase();
        if (Array.isArray(t.r)) {
          const robj: Record<number, number> = {};
          [1, 7, 15, 30, 45].forEach((n, idx) => {
            if ((t.r as any)[idx]) robj[n] = 1;
          });
          t.r = robj;
        } else if (!t.r) {
          t.r = {};
        }
        t.subs = (t.subs || []).map((sb: any) => ({
          id: sb.id || uid(),
          name: String(sb.name || '').toUpperCase(),
          studied: sb.studied ?? (sb.done ? iso(new Date()) : null),
          done: Boolean(sb.done || sb.studied),
          videoTime: sb.videoTime || '',
          pi: sb.pi,
          pf: sb.pf,
          h: sb.h || 0,
          e: sb.e || 0,
          q: Boolean(sb.q || (sb.h || 0) + (sb.e || 0) > 0),
          tp: sb.tp || {},
          link: sb.link || '',
          r: sb.r || {},
        }));
      });
      d.log = d.log || {};
    });

    if (!ed.cycles || !ed.cycles.length) {
      ed.cycles = [
        {
          id: uid(),
          name: 'Ciclo 1',
          items: ed.list.slice(0, 3).map((d) => ({ id: d.id, min: 60 })),
          base: {},
          n: 0,
        },
      ];
      ed.csel = ed.cycles[0].id;
    }
    if (!ed.csel || !ed.cycles.some((c) => c.id === ed.csel)) {
      ed.csel = ed.cycles[0].id;
    }
  });

  const curEd = state.eds.find((e) => e.id === state.edsel) || state.eds[0];
  if (!curEd.list.some((d) => d.id === state.sel)) {
    state.sel = curEd.list[0].id;
  }

  state.intv = (state.intv && state.intv.length ? state.intv.slice() : [1, 15, 30, 45]).sort(
    (a, b) => a - b
  );
  state.acts = state.acts || [];
  state.goals = state.goals || { h: 20, q: 100 };
  state.rem = state.rem || [];
  state.qlog = state.qlog || {};

  return state;
};

export const loadBoardsFromStorage = (): BoardsState => {
  try {
    const raw = localStorage.getItem(KEY_BOARDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const b = { id: uid(), name: 'Quadro 1', cols: parsed };
        return { list: [b], sel: b.id };
      }
      if (parsed && Array.isArray(parsed.list) && parsed.list.length) {
        if (!parsed.list.some((b: KanbanBoard) => b.id === parsed.sel)) {
          parsed.sel = parsed.list[0].id;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading boards:', e);
  }
  return getDefaultBoards();
};

export const saveBoardsToStorage = (boards: BoardsState) => {
  try {
    localStorage.setItem(KEY_BOARDS, JSON.stringify(boards));
  } catch (e) {
    console.error('Error saving boards:', e);
  }
};

export const loadDiscFromStorage = (): DiscState => {
  try {
    const raw = localStorage.getItem(KEY_DISC);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeDiscState(parsed);
    }
  } catch (e) {
    console.error('Error loading disciplines:', e);
  }
  return getDefaultDisc();
};

export const saveDiscToStorage = (disc: DiscState) => {
  try {
    localStorage.setItem(KEY_DISC, JSON.stringify(disc));
  } catch (e) {
    console.error('Error saving disciplines:', e);
  }
};

export const downloadBlob = (content: string, fileName: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const exportAllDataJSON = (boards: BoardsState, disc: DiscState) => {
  const exportPayload: ExportBackupData = {
    app: 'quadro-estudos',
    version: 1,
    exported: new Date().toISOString(),
    boards,
    disc: {
      eds: disc.eds,
      edsel: disc.edsel,
      sel: disc.sel,
      intv: disc.intv,
      acts: disc.acts,
      goals: disc.goals,
      rem: disc.rem,
      qlog: disc.qlog,
    },
  };

  downloadBlob(
    JSON.stringify(exportPayload, null, 2),
    `backup-estudos-${iso(new Date())}.json`,
    'application/json'
  );
};

export const exportAllTopicsCSV = (disc: DiscState) => {
  const rows: (string | number)[][] = [
    [
      'Edital',
      'Disciplina',
      'Conteúdo',
      'Nível',
      'Tópico/Assunto',
      'Tipo',
      'Tempo Vídeo',
      'Pág. inicial',
      'Pág. final',
      'Acertos',
      'Erros',
      'Último estudo',
      'Link',
    ],
  ];

  disc.eds.forEach((ed) => {
    ed.list.forEach((d) => {
      d.topics.forEach((t) => {
        const types: string[] = [];
        if (t.tp?.v) types.push('Videoaula');
        if (t.tp?.p) types.push('PDF');
        if (t.tp?.q) types.push('Questões');

        rows.push([
          ed.name,
          d.name,
          t.g || '',
          'Tópico',
          t.name,
          types.join('+'),
          t.videoTime || '',
          t.pi || '',
          t.pf || '',
          t.h || 0,
          t.e || 0,
          t.studied || '',
          t.link || '',
        ]);

        (t.subs || []).forEach((sb) => {
          const subTypes: string[] = [];
          if (sb.tp?.v) subTypes.push('Videoaula');
          if (sb.tp?.p) subTypes.push('PDF');
          if (sb.tp?.q) subTypes.push('Questões');

          rows.push([
            ed.name,
            d.name,
            t.g || '',
            'Subtópico',
            `  ↳ ${sb.name}`,
            subTypes.join('+'),
            sb.videoTime || '',
            sb.pi || '',
            sb.pf || '',
            sb.h || 0,
            sb.e || 0,
            sb.studied || '',
            sb.link || '',
          ]);
        });
      });
    });
  });

  const csv =
    '\ufeff' +
    rows
      .map((r) =>
        r
          .map((c) => '"' + String(c).replace(/"/g, '""') + '"')
          .join(';')
      )
      .join('\r\n');

  downloadBlob(csv, `planilha-estudos-${iso(new Date())}.csv`, 'text/csv;charset=utf-8');
};
