#!/usr/bin/env node
// Надсилає змінені файли на study.spe.org.ua (/api/sync). Запускається з GitHub Actions після push у main.
//
//   STUDY_SYNC_TOKEN=… [STUDY_URL=https://study.spe.org.ua] [BEFORE=<sha>] [AFTER=<sha>] [FULL=1] node tools/study-sync.mjs
//
// Які файли куди йдуть — у study-sync.json поруч із репозиторієм:
//   { "rules": [ { "from": "<regex>", "to": "<шлях на сайті з $1…>" | null } ], "pages": { "when": "<regex>", "cmd": "…", "file": "…" } }
// Перше правило, що збіглося, вирішує; "to": null — пропустити. Сторінки-переадресації (meta refresh) пропускаються.
import fs from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';

const URL_ = (process.env.STUDY_URL || 'https://study.spe.org.ua').replace(/\/$/, '');
const TOKEN = process.env.STUDY_SYNC_TOKEN;
if (!TOKEN) { console.log('::warning::Немає секрету STUDY_SYNC_TOKEN — синхронізацію пропущено. Створіть ключ в адмінці сайту.'); process.exit(0); }
const cfg = JSON.parse(fs.readFileSync('study-sync.json', 'utf8'));
const rules = cfg.rules.map((r) => ({ re: new RegExp(r.from), to: r.to }));
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim();

const zero = /^0+$/;
const { BEFORE, AFTER = 'HEAD' } = process.env;
let full = process.env.FULL === '1' || process.env.FULL === 'true' || !BEFORE || zero.test(BEFORE);
const up = new Set(), del = new Set();
if (!full) {
  try {
    for (const line of git('diff', '--name-status', '--no-renames', BEFORE, AFTER).split('\n').filter(Boolean)) {
      const [st, f] = line.split('\t');
      (st === 'D' ? del : up).add(f);
    }
  } catch { full = true; }
}
if (full) for (const f of git('ls-files').split('\n').filter(Boolean)) up.add(f);

const map = (f) => { for (const r of rules) { const m = f.match(r.re); if (m) return r.to === null ? null : r.to.replace(/\$(\d)/g, (_, i) => m[i] || ''); } return null; };
const isStub = (f) => { try { const s = fs.statSync(f); if (s.size > 3000) return false; return /http-equiv=["']refresh/i.test(fs.readFileSync(f, 'utf8')); } catch { return false; } };

async function call(q, body, type = 'application/octet-stream') {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${URL_}/api/sync?${q}`, { method: 'POST', headers: { 'X-Sync-Token': TOKEN, 'Content-Type': type }, body });
      const j = await r.json().catch(() => ({ error: 'HTTP ' + r.status }));
      if (r.ok) return j;
      if (r.status < 500) throw Object.assign(new Error(j.error || 'HTTP ' + r.status), { fatal: true });
    } catch (e) { if (e.fatal || i === 2) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
  }
}

let sent = 0, failed = 0;
const created = [];
for (const f of [...up].sort()) {
  const to = map(f);
  if (!to || !fs.existsSync(f) || isStub(f)) continue;
  try {
    const j = await call('path=' + encodeURIComponent(to), fs.readFileSync(f));
    sent++; console.log(`✓ ${f} → ${to}${j.created ? `  (нова сторінка «${j.page}» у Нерозподілених)` : ''}`);
    if (j.created) created.push(j.page);
  } catch (e) { failed++; console.log(`::error::${f} → ${to}: ${e.message}`); }
}
for (const f of [...del].sort()) {
  const to = map(f);
  if (!to) continue;
  try { await call('delete=' + encodeURIComponent(to), ''); console.log(`✗ ${to} прибрано`); } catch (e) { failed++; console.log(`::error::видалення ${to}: ${e.message}`); }
}
if (cfg.pages && [...up, ...del].some((f) => new RegExp(cfg.pages.when).test(f))) {
  try {
    execSync(cfg.pages.cmd, { stdio: 'inherit' });
    const j = await call('pages=1', fs.readFileSync(cfg.pages.file), 'application/json');
    console.log(`✓ перелік сторінок оновлено (${j.pages})`);
  } catch (e) { failed++; console.log(`::error::перелік сторінок: ${e.message}`); }
}
console.log(`Готово: надіслано ${sent}, помилок ${failed}${full ? ' (повна синхронізація)' : ''}.`);
if (created.length) console.log(`::notice::Нові сторінки в «Нерозподілених»: ${created.join(', ')} — перетягніть у розділ в адмінці.`);
process.exit(failed ? 1 : 0);
