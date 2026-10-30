#!/usr/bin/env node
/**
 * Client for the UP playlist endpoints (/api/uploads/catalog and /playlists).
 * Ships inside the /up-playlist skill folder so it works on any laptop with
 * Node 18+; no repo checkout needed. Uses the same personal key as /up-uploading.
 *
 *   node playlist.mjs me                    which key/account this is
 *   node playlist.mjs tags                  tag ids by facet
 *   node playlist.mjs catalog               save every live listing to ~/up-playlists/<date>/catalog.json + a summary
 *   node playlist.mjs mine                  save this account's lists + popular lists to ~/up-playlists/<date>/playlists.json
 *   node playlist.mjs check <plan.json>     server-side dry run, writes nothing
 *   node playlist.mjs apply <plan.json>     create / update / delete for real
 *
 * The key is read from UP_UPLOAD_KEY, or from the file ~/.up-uploader.env
 * (line: UP_UPLOAD_KEY=upk_...). Never put it in a plan, the skill files, or the chat.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_API = 'https://latest-glowup-channel-wwgopnyrjq-ew.a.run.app';
const SITE = 'https://www.glowupchannel.com';
const BATCH = 20;
const PAGE_SIZE = 500;
const ENV_FILE = join(homedir(), '.up-uploader.env');

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
    console.error(`${path} failed (${res.status}): ${data?.message || res.statusText}`);
    process.exit(1);
  }
  return data.data;
}

function outDir() {
  const dir = join(homedir(), 'up-playlists', new Date().toISOString().slice(0, 10));
  mkdirSync(dir, { recursive: true });
  return dir;
}

const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ');

async function catalog(cfg) {
  const listings = [];
  let total = 0;
  let counts = {};
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const data = await call(cfg, `/api/uploads/catalog?offset=${offset}&limit=${PAGE_SIZE}`);
    ({ total, counts } = data);
    listings.push(...data.listings);
    if (!data.hasMore) break;
  }
  const out = join(outDir(), 'catalog.json');
  writeFileSync(out, JSON.stringify({ listings }, null, 2));

  // A first look at where the volume and the attention are, so themes start from data.
  const tags = {};
  const countries = {};
  for (const l of listings) {
    for (const t of l.tags) tags[t] = (tags[t] || 0) + 1;
    const where = l.isRemote ? 'Remote' : l.countryCode || l.country || '?';
    countries[where] = (countries[where] || 0) + 1;
  }
  const weekAhead = Date.now() + 7 * 864e5;
  const engaged = [...listings].sort((a, b) => (b.saves * 3 + b.views + b.likes * 2) - (a.saves * 3 + a.views + a.likes * 2)).slice(0, 10);
  console.log(JSON.stringify({ total, counts, file: out }, null, 2));
  console.log(`\ncountries: ${top(countries, 15)}`);
  console.log(`tags: ${top(tags, 40)}`);
  console.log(`closing within 7 days: ${listings.filter((l) => l.closes && Date.parse(l.closes) < weekAhead).length}`);
  console.log('\nmost engaged:');
  for (const l of engaged) console.log(`  ${l.kind} ${l.id} ${l.title} (${l.countryCode || 'remote'}) views ${l.views} saves ${l.saves}`);
}

async function mine(cfg) {
  const data = await call(cfg, '/api/uploads/playlists');
  const out = join(outDir(), 'playlists.json');
  writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ limits: data.limits, file: out }, null, 2));
  console.log(`\nmine (${data.mine.length}):`);
  for (const p of data.mine) {
    const flag = p.liveCount === 0 ? ' EMPTY' : p.liveCount < data.limits.minItems ? ' LOW' : '';
    console.log(`  ${p.id} "${p.name}" live ${p.liveCount}/${p.itemCount} views ${p.views} saves ${p.saves}${flag}`);
  }
  console.log(`\npopular (top ${data.popular.length} by saves): ${data.popular.slice(0, 20).map((p) => `"${p.name}" ${p.saves}`).join(', ')}`);
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (!['me', 'tags', 'catalog', 'mine', 'check', 'apply'].includes(command) || (['check', 'apply'].includes(command) && !arg)) {
    console.error('usage: node playlist.mjs me | tags | catalog | mine | check <plan.json> | apply <plan.json>');
    process.exit(2);
  }
  const cfg = config();

  if (command === 'me') {
    console.log(JSON.stringify(await call(cfg, '/api/uploads/me'), null, 2));
    return;
  }
  if (command === 'tags') {
    const t = await call(cfg, '/api/uploads/taxonomy');
    for (const facet of t.facets) console.log(`${facet}: ${t.tags.filter((tag) => tag.facet === facet).map((tag) => tag.id).join(', ')}`);
    return;
  }
  if (command === 'catalog') return catalog(cfg);
  if (command === 'mine') return mine(cfg);

  const parsed = JSON.parse(readFileSync(resolve(arg), 'utf8'));
  const items = Array.isArray(parsed) ? parsed : parsed.items || [];
  const results = [];
  for (let at = 0; at < items.length; at += BATCH) {
    const data = await call(cfg, '/api/uploads/playlists', { items: items.slice(at, at + BATCH), dryRun: command === 'check' });
    for (const r of data.results) {
      const id = r.id;
      results.push({ ...r, ...(id && r.status !== 'deleted' && r.status !== 'invalid' && { page: `${SITE}/playlists/${id}` }) });
    }
  }
  const group = (status) => results.filter((r) => r.status === status);
  const report = {
    mode: command,
    created: group('created'),
    updated: group('updated'),
    deleted: group('deleted'),
    ok: group('ok'),
    invalid: group('invalid'),
  };
  const out = resolve(arg).replace(/\.json$/i, '') + `.${command}-report.json`;
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nreport: ${out}`);
  if (report.invalid.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
