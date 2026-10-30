// Збирає сторінки платформи курсів: node kursy/build.mjs
// kursy/engine.html + kursy/author.js + kursy/courses/<курс>.js → <file> у корені репозиторію,
// kursy/akademiia.html → akademiia.html (каталог курсів).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const ORDER = ['taim', 'finansy', 'oratorstvo', 'biznes', 'kolektyv'];
const engine = readFileSync(join(here, 'engine.html'), 'utf8');
const author = readFileSync(join(here, 'author.js'), 'utf8');
const scenes = readFileSync(join(here, 'scenes.js'), 'utf8');
const { SCENE_CSS, REVEAL_CSS } = new Function(`${scenes}; return { SCENE_CSS, REVEAL_CSS };`)();
const css = SCENE_CSS + REVEAL_CSS;
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const fill = (tpl, map) => Object.entries(map).reduce((s, [k, v]) => s.split(k).join(v), tpl);

const meta = [];
for (const name of ORDER) {
  const path = join(here, 'courses', `${name}.js`);
  const C = (await import(pathToFileURL(path).href)).default;
  const code = readFileSync(path, 'utf8').replace('export default', 'const COURSE =');
  const steps = C.lessons.flatMap((l) => l.steps);
  if (steps.length !== 30 || C.lessons.length !== 10) console.warn(`${name}: ${C.lessons.length} уроків, ${steps.length} підуроків`);
  const q = steps.reduce((a, s) => a + (s.task.type === 'quiz' ? s.task.qs.length : 0), 0);
  meta.push({ key: C.key, file: C.file, title: C.title, emoji: C.emoji, scene: C.scene, photo: C.photo, accent: C.accent, card: C.card, hook: C.hook, outcomes: C.outcomes.slice(0, 3),
    lessons: C.lessons.length, steps: steps.length, q, lessonTitles: C.lessons.map((l) => l.t) });
  writeFileSync(join(root, C.file), fill(engine, {
    '{{TITLE}}': `Курс «${C.title}» — SPE Академія`,
    '{{DESC}}': attr(`Інтерактивний курс Романа Кушніра «${C.title}». ${C.card} 10 уроків, ${steps.length} відео-підуроків. Обираєш термін від 2 до 20 днів: встигнеш — гроші повертаються.`),
    '{{ACCENT}}': C.accent,
    '/*{{AUTHOR}}*/': author,
    '/*{{SCENES}}*/': scenes,
    '/*{{SCENE_CSS}}*/': css,
    '/*{{COURSE}}*/': code,
  }));
  console.log(`✓ ${C.file}`);
}
writeFileSync(join(root, 'akademiia.html'), fill(readFileSync(join(here, 'akademiia.html'), 'utf8'), {
  '/*{{AUTHOR}}*/': author,
  '/*{{SCENES}}*/': scenes,
  '/*{{SCENE_CSS}}*/': css,
  '/*{{COURSES}}*/': `const COURSES = ${JSON.stringify(meta, null, 1)};`,
}));
console.log('✓ akademiia.html');
