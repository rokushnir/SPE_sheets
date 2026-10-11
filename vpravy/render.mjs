// Рендерить HTML зі збірки у PDF і перевіряє, що жодна вправа не вилазить за межі сторінки.
// Запуск: node render.mjs [--check] [--shots=12,15]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const shotsArg = process.argv.find(a => a.startsWith('--shots='));
const shots = shotsArg ? shotsArg.slice(8).split(',').map(Number) : [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1.5 });
let problems = 0;

for (const { file, pdf } of manifest) {
  await page.goto('file://' + path.join(dir, file));
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  const bad = await page.evaluate(() => {
    const out = [];
    for (const p of document.querySelectorAll('.page')) {
      const id = p.id || p.className;
      const issues = [];
      if (p.scrollHeight > p.clientHeight + 1) issues.push(`page +${p.scrollHeight - p.clientHeight}px`);
      for (const g of p.querySelectorAll('.work, .grow')) {
        if (g.scrollHeight > g.clientHeight + 2) issues.push(`${g.className.split(' ')[0]} +${g.scrollHeight - g.clientHeight}px`);
        if (g.classList.contains('grow') && g.clientHeight < 14) issues.push(`squashed ${g.className}`);
      }
      const foot = p.querySelector('.foot');
      if (foot && foot.getBoundingClientRect().bottom > p.getBoundingClientRect().bottom + 1) issues.push('footer off-page');
      if (issues.length) out.push(`${id}: ${[...new Set(issues)].join(', ')}`);
    }
    return out;
  });
  if (bad.length) { problems += bad.length; console.log(`✗ ${file}\n  ` + bad.join('\n  ')); }
  else console.log(`✓ ${file}`);

  if (file === 'vpravy.html') {
    for (const n of shots) {
      const el = await page.$(`#ex${n}`);
      if (el) await el.screenshot({ path: path.join(dir, `shot-${n}.png`) });
    }
  }
  if (!checkOnly) {
    await page.pdf({ path: path.join(dir, pdf), preferCSSPageSize: true, printBackground: true });
  }
}
await browser.close();
if (problems) { console.log(`Проблем: ${problems}`); process.exitCode = 1; }
