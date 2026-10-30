#!/usr/bin/env node
/**
 * Client for the UP approval endpoints (/api/uploads/pending and /review).
 * Ships inside the /up-approving skill folder so it works on any laptop with
 * Node 18+; no repo checkout needed. Uses the same personal key as /up-uploading.
 *
 *   node approve.mjs me                     which key/account this is
 *   node approve.mjs tags                   tag ids by facet, limits, required facets
 *   node approve.mjs pending [kind]         save every not-live listing to ~/up-approvals/<date>/queue-NN.json
 *   node approve.mjs check <plan.json>      server-side dry run, writes nothing
 *   node approve.mjs apply <plan.json>      approve / delete for real
 *
 * The key is read from UP_UPLOAD_KEY, or from the file ~/.up-uploader.env
 * (line: UP_UPLOAD_KEY=upk_...). Never put it in a plan, the skill files, or the chat.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_API = 'https://latest-glowup-channel-wwgopnyrjq-ew.a.run.app';
const SITE = 'https://www.glowupchannel.com';
const PAGE = { job: 'jobs', opportunity: 'opportunities', event: 'events' };
const BATCH = 25;
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

function readItems(file) {
  const parsed = JSON.parse(readFileSync(resolve(file), 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

async function pending(cfg, kind) {
  const day = new Date().toISOString().slice(0, 10);
  const dir = join(homedir(), 'up-approvals', day);
  mkdirSync(dir, { recursive: true });
  const query = kind ? `&kind=${encodeURIComponent(kind)}` : '';
  let offset = 0;
  let file = 0;
  let total = 0;
  let counts = {};
  let withDuplicates = 0;
  for (;;) {
    const data = await call(cfg, `/api/uploads/pending?offset=${offset}&limit=${BATCH}${query}`);
    ({ total, counts } = data);
    if (data.listings.length) {
      file += 1;
      const out = join(dir, `queue-${String(file).padStart(2, '0')}.json`);
      writeFileSync(out, JSON.stringify({ listings: data.listings }, null, 2));
      withDuplicates += data.listings.filter((l) => l.duplicates.length).length;
    }
    if (!data.hasMore) break;
    offset += BATCH;
  }
  console.log(JSON.stringify({ total, counts, withDuplicates, files: file, dir }, null, 2));
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (!['me', 'tags', 'pending', 'check', 'apply'].includes(command) || (['check', 'apply'].includes(command) && !arg)) {
    console.error('usage: node approve.mjs me | tags | pending [kind] | check <plan.json> | apply <plan.json>');
    process.exit(2);
  }
  const cfg = config();

  if (command === 'me') {
    console.log(JSON.stringify(await call(cfg, '/api/uploads/me'), null, 2));
    return;
  }
  if (command === 'tags') {
    const t = await call(cfg, '/api/uploads/taxonomy');
    for (const facet of t.facets) {
      const tags = t.tags.filter((tag) => tag.facet === facet).map((tag) => `${tag.id}${tag.kinds.length < t.kinds.length ? ` [${tag.kinds.join('/')}]` : ''}`);
      console.log(`${facet} (max ${t.limits[facet]}): ${tags.join(', ')}`);
    }
    console.log(`required: ${JSON.stringify(t.required)}; ${t.minTagsPerUpload}-${t.maxTagsPerListing} tags per listing`);
    console.log(`jobType: ${t.jobTypes.join(', ')}; pricing.period: ${t.payPeriods.join(', ')}`);
    return;
  }
  if (command === 'pending') {
    await pending(cfg, arg);
    return;
  }

  const items = readItems(arg);
  const results = [];
  for (let at = 0; at < items.length; at += BATCH) {
    const data = await call(cfg, '/api/uploads/review', { items: items.slice(at, at + BATCH), dryRun: command === 'check' });
    for (const r of data.results) {
      results.push({
        ...r,
        index: r.index + at,
        ...(r.outcome === 'approved' && { page: `${SITE}/${PAGE[r.kind]}/${r.id}` }),
      });
    }
  }

  const group = (outcome) => results.filter((r) => r.outcome === outcome);
  const report = {
    mode: command,
    approved: group('approved'),
    deleted: group('deleted'),
    ready: group('ready'),
    duplicates: group('duplicate'),
    invalid: group('invalid'),
    skipped: group('skipped'),
    missing: group('missing'),
    failed: group('failed'),
  };
  const out = resolve(arg).replace(/\.json$/i, '') + `.${command}-report.json`;
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nreport: ${out}`);
  if (report.invalid.length || report.failed.length || report.duplicates.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
