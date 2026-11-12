// Собирает data/catalog.json из tools/raw/<класс>.txt
// Формат строки: путь|обложка|годы|ИИ|название|авторы
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUBJECTS = {
  eng: 'Английский', matematika: 'Математика', algebra: 'Алгебра', geometriya: 'Геометрия',
  russkijazik: 'Русский язык', fizika: 'Физика', ximiya: 'Химия', istoria: 'История',
  biologia: 'Биология', geograph: 'География', informatika: 'Информатика',
  obshestvo: 'Обществознание', literatura: 'Литература',
  okruzhaushiy_mir: 'Окружающий мир', chtenie: 'Литературное чтение',
};
const classes = readdirSync(join(root, 'tools/raw')).map(f => parseInt(f)).filter(Boolean).sort((a, b) => b - a);
const books = new Map();
const byClass = {};
for (const cl of classes) {
  byClass[cl] = [];
  const lines = readFileSync(join(root, `tools/raw/${cl}.txt`), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    const p = line.split('|');
    if (p.length !== 6) throw new Error(`Плохая строка в ${cl}.txt: ${line}`);
    const [path, cover, years, ai, title, authors] = p.map(s => s.trim());
    const m = path.match(/^reshebniki\/([^/]+)\//);
    const subject = m ? m[1] : 'eng';
    if (!SUBJECTS[subject]) throw new Error(`Неизвестный предмет: ${path}`);
    if (!books.has(path)) {
      books.set(path, { id: books.size, u: path, c: cover, y: years, ai: ai === '1' ? 1 : 0, t: title, a: authors, s: subject, cl: [] });
    }
    const b = books.get(path);
    if (!b.cl.includes(cl)) { b.cl.push(cl); byClass[cl].push(b.id); }
  }
}
const out = {
  source: 'https://reshak.ru/', coverBase: 'https://reshak.ru/pic/tag_original/',
  updated: new Date().toISOString().slice(0, 10),
  classes, subjects: SUBJECTS, books: [...books.values()], byClass,
};
writeFileSync(join(root, 'data/catalog.json'), JSON.stringify(out));
// Копия в виде скрипта: работает и при открытии index.html прямо с диска (file://), где fetch запрещён.
writeFileSync(join(root, 'data/catalog.js'), 'window.GDZ_CATALOG=' + JSON.stringify(out) + ';\n');
console.log(`Учебников: ${books.size}; по классам:`, Object.fromEntries(classes.map(c => [c, byClass[c].length])));
