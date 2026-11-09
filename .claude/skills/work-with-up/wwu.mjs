#!/usr/bin/env node
/**
 * Client for the Work with us desk (/api/uploads/work-with-up/*).
 * Ships inside the /work-with-up skill folder; Node 18+, no repo checkout needed.
 * Uses the same personal key as /up-uploading.
 *
 *   node wwu.mjs me                         which key/account this is
 *   node wwu.mjs queue                      every item waiting on us -> queue.json
 *   node wwu.mjs leads [days]               organisations posting live on UP (default 90 days) -> leads.json
 *   node wwu.mjs all                        queue + leads
 *   node wwu.mjs check <plan.json>          dry run of a review plan, writes nothing
 *   node wwu.mjs apply <plan.json>          approve / clarify / reject free listings
 *   node wwu.mjs mail <to> <subject> <body-file>   prints a Gmail compose link (sends nothing)
 *
 * plan.json: { "items": [ { "ref", "action": "approve"|"clarify"|"reject", "note"?, "listing"? } ] }
 * Files go to ~/up-work-with-up/<date>/. The key is read from UP_UPLOAD_KEY or
 * ~/.up-uploader.env (UP_UPLOAD_KEY=upk_...). Never put it in a plan or the chat.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_API = 'https://latest-glowup-channel-wwgopnyrjq-ew.a.run.app';
const SITE = 'https://www.glowupchannel.com';
const PAGE = { job: 'jobs', opportunity: 'opportunities', event: 'events' };
const BATCH = 25;
const ENV_FILE = join(homedir(), '.up-uploader.env');
const DAY = new Date().toISOString().slice(0, 10);
const DIR = join(homedir(), 'up-work-with-up', DAY);

function config() {
  const env = {};
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const key = process.env.UP_UPLOAD_KEY || env.UP_UPLOAD_KEY;
  const api = (process.env.UP_API_URL || env.UP_API_URL || DEFAULT_API).replace(/\/+$/, '');
  if (!key) {
    console.error(`No upload key. Put a line UP_UPLOAD_KEY=upk_... in ${ENV_FILE} (ask the UP owner for your key).`);
    process.exit(1);
  }
  return { key, api };
}

async function call({ key, api }, path, json) {
  const res = await fetch(api + path, {
    method: json ? 'POST' : 'GET',
    headers: { 'x-up-upload-key': key, ...(json && { 'Content-Type': 'application/json' }) },
    ...(json && { body: JSON.stringify(json) }),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const hint = res.status === 404 ? ' (work-with-up routes not deployed yet?)' : '';
    throw new Error(`${path} failed (${res.status}): ${data?.message || res.statusText}${hint}`);
  }
  return data.data;
}

function save(name, data) {
  mkdirSync(DIR, { recursive: true });
  const out = join(DIR, `${name}.json`);
  writeFileSync(out, JSON.stringify(data, null, 2));
  return out;
}

async function queue(cfg) {
  const d = await call(cfg, '/api/uploads/work-with-up/queue');
  const out = save('queue', d);
  const free = d.items.filter((i) => i.reviewableHere).length;
  const paid = d.items.filter((i) => !i.order.free && i.status !== 'awaiting_payment').length;
  const unpaid = d.items.filter((i) => i.status === 'awaiting_payment').length;
  console.log(JSON.stringify({ saved: out, total: d.total, counts: d.counts, freeToReview: free, paidWaitingOnOwner: paid, awaitingPayment: unpaid }, null, 2));
}

async function leads(cfg, days = 90) {
  const d = await call(cfg, `/api/uploads/work-with-up/leads?days=${Number(days) || 90}`);
  const out = save('leads', d);
  console.log(JSON.stringify({ saved: out, days: d.days, organisations: d.total, top5: d.leads.slice(0, 5).map((l) => `${l.name}: ${l.listings} listings, ${l.views} views`) }, null, 2));
}

async function review(cfg, file, dryRun) {
  const plan = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const items = plan.items || [];
  if (!items.length) throw new Error('plan has no items');
  const results = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const d = await call(cfg, '/api/uploads/work-with-up/review', { items: items.slice(i, i + BATCH), dryRun });
    results.push(...d.results);
  }
  for (const r of results) {
    if (r.outcome === 'published' && r.id) {
      const kind = items.find((x) => x.ref === r.ref)?.listing?.kind;
      if (kind) r.page = `${SITE}/${PAGE[kind]}/${r.id}`;
    }
  }
  const counts = {};
  for (const r of results) counts[r.outcome] = (counts[r.outcome] || 0) + 1;
  const report = resolve(`${file}.${dryRun ? 'check' : 'apply'}-report.json`);
  writeFileSync(report, JSON.stringify({ dryRun, counts, results }, null, 2));
  console.log(JSON.stringify({ dryRun, counts, report, problems: results.filter((r) => !['published', 'ready', 'needs_clarification', 'rejected'].includes(r.outcome)) }, null, 2));
}

function mail(to, subject, bodyFile) {
  const body = readFileSync(resolve(bodyFile), 'utf8');
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body });
  console.log(`https://mail.google.com/mail/?${params.toString()}`);
}

const [cmd, a, b, c] = process.argv.slice(2);
try {
  if (cmd === 'mail') { mail(a, b, c); process.exit(0); }
  const cfg = config();
  if (cmd === 'me') console.log(JSON.stringify(await call(cfg, '/api/uploads/me'), null, 2));
  else if (cmd === 'queue') await queue(cfg);
  else if (cmd === 'leads') await leads(cfg, a);
  else if (cmd === 'all') { await queue(cfg); await leads(cfg, a); }
  else if (cmd === 'check' && a) await review(cfg, a, true);
  else if (cmd === 'apply' && a) await review(cfg, a, false);
  else {
    console.error('Usage: node wwu.mjs me | queue | leads [days] | all | check <plan> | apply <plan> | mail <to> <subject> <body-file>');
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
