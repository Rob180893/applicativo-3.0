export const uid = () => Math.random().toString(36).slice(2, 9);

export const iso = (d: Date): string =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0');

export const addD = (s: string, n: number): string => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return iso(dt);
};

export const fmt = (s: string): string => {
  if (!s || s.length < 10) return s || '';
  return s.slice(8, 10) + '/' + s.slice(5, 7);
};

export const getNextRecurringReviewDate = (
  studiedDate: string,
  intervals: number[] = [1, 15, 30, 45],
  recurringDays: number = 30,
  recurringDates: string[] = []
): string => {
  if (recurringDates && recurringDates.length > 0) {
    const sorted = [...recurringDates].sort();
    const lastDate = sorted[sorted.length - 1];
    return addD(lastDate, recurringDays);
  }
  const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 45;
  const cycleEndDate = addD(studiedDate, maxInterval);
  return addD(cycleEndDate, recurringDays);
};

export const fmtT = (s: number): string => {
  const sec = Math.max(0, Math.floor(s));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(rem).padStart(2, '0')
  );
};

export const fmtH = (s: number): string => {
  const m = Math.round(s / 60);
  return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0');
};

export const fmtS = (s: number): string => {
  const sec = Math.max(0, Math.floor(s));
  return (
    Math.floor(sec / 3600) +
    'h ' +
    String(Math.floor((sec % 3600) / 60)).padStart(2, '0') +
    'min ' +
    String(sec % 60).padStart(2, '0') +
    's'
  );
};

export const hm = (s: number): string => {
  const m = Math.floor(s / 60);
  return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') + 'min';
};

export const shortT = (s: number): string => {
  const m = Math.round(s / 60);
  return m < 60 ? m + 'min' : Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0');
};

export const npg = (x: { pi?: number; pf?: number }): number => {
  if (x.pi && x.pf && x.pi > 0 && x.pf >= x.pi) {
    return x.pf - x.pi + 1;
  }
  return 0;
};

const SMALL_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'na', 'no',
  'nas', 'nos', 'para', 'por', 'com', 'ao', 'aos', 'ou'
]);

export const titleCase = (s: string): string => {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
};

export const parseTimeToSeconds = (s: string): number => {
  const parts = String(s)
    .split(':')
    .map((x) => parseInt(x, 10) || 0);
  while (parts.length < 3) parts.unshift(0);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

export const VERSES: [string, string][] = [
  [
    'Confia no Senhor de todo o coração e não te apoies na tua própria inteligência. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.',
    'Provérbios 3,5-6',
  ],
  ['Tudo posso naquele que me fortalece.', 'Filipenses 4,13'],
  [
    'Sê forte e corajoso! Não tenhas medo nem desanimes, pois o Senhor teu Deus está contigo por onde quer que andes.',
    'Josué 1,9',
  ],
  ['A tua palavra é lâmpada para os meus passos e luz para o meu caminho.', 'Salmo 119,105'],
  [
    'É o Senhor quem dá a sabedoria; de sua boca vêm o conhecimento e a inteligência.',
    'Provérbios 2,6',
  ],
  [
    'Se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá com generosidade, e ela lhe será dada.',
    'Tiago 1,5',
  ],
  [
    'Filho, desde a juventude procura a instrução, e até os cabelos brancos encontrarás a sabedoria.',
    'Eclesiástico 6,18',
  ],
  [
    'Orei, e a inteligência me foi dada; supliquei, e veio a mim o espírito de sabedoria.',
    'Sabedoria 7,7',
  ],
  [
    'Os que esperam no Senhor renovam as suas forças, sobem com asas como águias, correm sem se cansar, caminham sem desfalecer.',
    'Isaías 40,31',
  ],
  ['Tudo o que tua mão encontrar para fazer, faze-o com todas as tuas forças.', 'Eclesiastes 9,10'],
  [
    'Tudo o que fizerdes, fazei-o de coração, como para o Senhor e não para os homens.',
    'Colossenses 3,23',
  ],
  [
    'Não nos cansemos de fazer o bem, pois, se não desanimarmos, colheremos a seu tempo.',
    'Gálatas 6,9',
  ],
  ['Entrega o teu caminho ao Senhor, confia nele, e ele agirá.', 'Salmo 37,5'],
  [
    'Eu bem sei os planos que tenho para vós: planos de paz, e não de desgraça, para vos dar um futuro e uma esperança.',
    'Jeremias 29,11',
  ],
  ['Pedi, e vos será dado; buscai, e achareis; batei, e vos será aberto.', 'Mateus 7,7'],
  [
    'Deus não nos deu um espírito de covardia, mas de fortaleza, de amor e de equilíbrio.',
    '2 Timóteo 1,7',
  ],
  ['Sede alegres na esperança, pacientes na tribulação, perseverantes na oração.', 'Romanos 12,12'],
  ['Que a bondade do Senhor nosso Deus esteja sobre nós; confirma a obra das nossas mãos.', 'Salmo 90,17'],
  ['Confia ao Senhor as tuas obras, e os teus projetos se realizarão.', 'Provérbios 16,3'],
  [
    'O coração inteligente adquire conhecimento, e o ouvido dos sábios procura a ciência.',
    'Provérbios 18,15',
  ],
  ['O temor do Senhor é o princípio da sabedoria.', 'Provérbios 1,7'],
  [
    'Eu te instruirei e te mostrarei o caminho que deves seguir; com os olhos fixos em ti, te darei conselho.',
    'Salmo 32,8',
  ],
  [
    'Sede firmes e inabaláveis, progredindo sempre na obra do Senhor, pois sabeis que o vosso esforço não é vão no Senhor.',
    '1 Coríntios 15,58',
  ],
  ['Corro para a meta, rumo ao prêmio da vocação que Deus nos faz em Cristo Jesus.', 'Filipenses 3,14'],
  ['Corramos com perseverança a corrida que nos é proposta.', 'Hebreus 12,1'],
  ['Para Deus nada é impossível.', 'Lucas 1,37'],
  [
    'Levanto os olhos para os montes: de onde virá o meu socorro? O meu socorro vem do Senhor, que fez o céu e a terra.',
    'Salmo 121,1-2',
  ],
  [
    'O começo da sabedoria é adquirir a sabedoria; com tudo o que possuis, adquire a inteligência.',
    'Provérbios 4,7',
  ],
  ['A explicação das tuas palavras ilumina e dá entendimento aos simples.', 'Salmo 119,130'],
  ['Os sábios brilharão como o esplendor do firmamento.', 'Daniel 12,3'],
];

export const getDailyVerse = () => {
  const dayNumber = Math.floor(
    (Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000
  );
  return VERSES[dayNumber % VERSES.length];
};
