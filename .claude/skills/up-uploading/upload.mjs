#!/usr/bin/env node
/**
 * Client for the UP upload endpoint (/api/uploads). Ships inside the
 * /up-uploading skill folder so it works on any laptop with Node 18+; no repo
 * checkout needed. The backend does all checking, dedupe and publishing.
 *
 *   node upload.mjs me                     which key/account this is
 *   node upload.mjs tags                   tag ids by facet, limits, required facets
 *   node upload.mjs check  <batch.json>    server-side dry run, writes nothing
 *   node upload.mjs upload <batch.json>    publish live
 *
 * The key is personal. It is read from UP_UPLOAD_KEY, or from the file
 * ~/.up-uploader.env (line: UP_UPLOAD_KEY=upk_...). Never put it in the batch,
 * the skill files, or the chat.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

function readListings(file) {
  const parsed = JSON.parse(readFileSync(resolve(file), 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.listings || [];
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!['me', 'tags', 'check', 'upload'].includes(command) || (['check', 'upload'].includes(command) && !file)) {
    console.error('usage: node upload.mjs me | tags | check <batch.json> | upload <batch.json>');
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

  const listings = readListings(file);
  const results = [];
  for (let at = 0; at < listings.length; at += BATCH) {
    const chunk = listings.slice(at, at + BATCH);
    const data = await call(cfg, '/api/uploads/listings', { listings: chunk, dryRun: command === 'check' });
    for (const r of data.results) {
      results.push({
        ...r,
        index: r.index + at,
        ...(r.outcome === 'uploaded' && { page: `${SITE}/${PAGE[r.kind]}/${r.id}` }),
      });
    }
  }

  const group = (outcome) => results.filter((r) => r.outcome === outcome);
  const report = {
    mode: command,
    uploaded: group('uploaded'),
    ready: group('ready'),
    duplicates: group('duplicate'),
    invalid: group('invalid'),
    failed: group('failed'),
  };
  const out = resolve(file).replace(/\.json$/i, '') + `.${command}-report.json`;
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nreport: ${out}`);
  if (report.invalid.length || report.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
