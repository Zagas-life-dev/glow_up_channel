#!/usr/bin/env node
/**
 * Client for the UP maintenance endpoints (/api/uploads/maintenance/*).
 * Ships inside the /up-maintaining skill folder so it works on any laptop with
 * Node 18+; no repo checkout needed. Uses the same personal key as /up-uploading.
 *
 *   node maintain.mjs me                      which key/account this is
 *   node maintain.mjs overview                live / pending / hidden per kind, queue age, db ping
 *   node maintain.mjs cleanup                 live listings that look wrong + half-dead playlists
 *   node maintain.mjs links [limit]           live listings with apply links, most-viewed first (default 100)
 *   node maintain.mjs work-with-us            orders waiting on us
 *   node maintain.mjs analytics [days]        tracking, content, push/email, Stories (default 14 days)
 *   node maintain.mjs all                     every read above, saved to one folder
 *   node maintain.mjs check <plan.json>       dry run of a hide plan, writes nothing
 *   node maintain.mjs hide <plan.json>        move the plan's live listings to Hidden
 *   node maintain.mjs link check|apply <plan.json>       { items: [{ kind, id, url, note }] } - set a live listing's url
 *   node maintain.mjs playlists-clear check              list public playlists with no live item
 *   node maintain.mjs playlists-clear apply <plan.json>  { ids: [...] } - delete exactly those (each re-checked)
 *   node maintain.mjs orders-clear check|apply <plan.json>  { orderRefs, reason } - unpaid junk Work with us orders
 *
 * Reads are saved to ~/up-maintenance/<date>/<name>.json and summarised on stdout.
 * The key is read from UP_UPLOAD_KEY, or from ~/.up-uploader.env (UP_UPLOAD_KEY=upk_...).
 * Never put it in a plan, the skill files, or the chat.
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
const DIR = join(homedir(), 'up-maintenance', DAY);

function config() {
  const env = {};
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
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
    const hint = res.status === 404 ? ' (maintenance routes not deployed yet?)' : '';
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

/** What each read prints: the counts, never the whole payload. */
const SUMMARY = {
  overview: (d) => d,
  cleanup: (d) => ({
    liveTotal: d.liveTotal,
    pastDateStillLive: d.pastDate.count,
    duplicateGroups: d.duplicates.count,
    missingFields: d.missing.count,
    halfDeadPlaylists: d.playlists.halfDeadOrWorse,
  }),
  links: (d) => ({ total: d.total, saved: d.listings.length }),
  'work-with-us': (d) => ({ total: d.total, counts: d.counts, oldestWaitingDays: d.items[0]?.waitingDays ?? null }),
  analytics: (d) => ({
    days: d.days,
    zeroViewDays: d.tracking.zeroViewDays,
    openLive: d.content.openLive,
    zeroViewListings: d.content.zeroViews.count,
    topCountries: d.content.supplyByCountry.slice(0, 5),
    pushDevices: d.notifications.pushDevices,
    stories: d.stories?.error ? `error: ${d.stories.error}` : 'saved',
  }),
};

async function read(cfg, name, arg) {
  const path = {
    overview: '/api/uploads/maintenance/overview',
    cleanup: '/api/uploads/maintenance/cleanup',
    links: `/api/uploads/maintenance/links?limit=${Math.min(200, parseInt(arg, 10) || 100)}`,
    'work-with-us': '/api/uploads/maintenance/work-with-us',
    analytics: `/api/uploads/maintenance/analytics?days=${parseInt(arg, 10) || 14}`,
  }[name];
  const data = await call(cfg, path);
  const file = save(name, data);
  return { summary: SUMMARY[name](data), file };
}

function readItems(file) {
  const parsed = JSON.parse(readFileSync(resolve(file), 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  const reads = Object.keys(SUMMARY);
  const writes = ['link', 'playlists-clear', 'orders-clear'];
  if (![...reads, ...writes, 'me', 'all', 'check', 'hide'].includes(command) || (['check', 'hide'].includes(command) && !arg)) {
    console.error(`usage: node maintain.mjs me | all | ${reads.join(' | ')} | check <plan.json> | hide <plan.json>\n`
      + '       | link check|apply <plan.json> | playlists-clear check|apply | orders-clear check|apply <plan.json>');
    process.exit(2);
  }
  const cfg = config();

  if (writes.includes(command)) {
    const [mode, plan] = process.argv.slice(3);
    if (!['check', 'apply'].includes(mode) || (command !== 'playlists-clear' && !plan) || (command === 'playlists-clear' && mode === 'apply' && !plan)) {
      console.error(`usage: node maintain.mjs ${command} check|apply${command === 'playlists-clear' ? '' : ' <plan.json>'}`);
      process.exit(2);
    }
    const dryRun = mode === 'check';
    const body = command === 'link' ? { items: readItems(plan) }
      : command === 'orders-clear' ? JSON.parse(readFileSync(resolve(plan), 'utf8'))
      // Apply always names the exact lists (the ids a check returned), never "whatever is empty now".
      : plan ? { ids: JSON.parse(readFileSync(resolve(plan), 'utf8')).ids } : {};
    const path = { link: 'link', 'playlists-clear': 'playlists/clear', 'orders-clear': 'work-with-us/clear' }[command];
    const data = await call(cfg, `/api/uploads/maintenance/${path}`, { ...body, dryRun });
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nsaved: ${save(`${command}-${mode}`, data)}`);
    return;
  }

  if (command === 'me') {
    console.log(JSON.stringify(await call(cfg, '/api/uploads/me'), null, 2));
    return;
  }
  if (command === 'all') {
    const out = {};
    for (const name of reads) {
      try {
        out[name] = await read(cfg, name);
      } catch (error) {
        out[name] = { error: error.message };
      }
    }
    console.log(JSON.stringify({ dir: DIR, ...out }, null, 2));
    return;
  }
  if (reads.includes(command)) {
    console.log(JSON.stringify(await read(cfg, command, arg), null, 2));
    return;
  }

  const items = readItems(arg);
  const results = [];
  for (let at = 0; at < items.length; at += BATCH) {
    const data = await call(cfg, '/api/uploads/maintenance/hide', { items: items.slice(at, at + BATCH), dryRun: command === 'check' });
    for (const r of data.results) results.push({ ...r, index: r.index + at, ...(r.kind && PAGE[r.kind] && { page: `${SITE}/${PAGE[r.kind]}/${r.id}` }) });
  }
  const group = (outcome) => results.filter((r) => r.outcome === outcome);
  const report = {
    mode: command,
    hidden: group('hidden'),
    ready: group('ready'),
    invalid: group('invalid'),
    skipped: group('skipped'),
    failed: group('failed'),
  };
  const out = resolve(arg).replace(/\.json$/i, '') + `.${command}-report.json`;
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nreport: ${out}`);
  if (report.invalid.length || report.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
