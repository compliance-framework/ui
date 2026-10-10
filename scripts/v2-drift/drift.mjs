#!/usr/bin/env node
// Lists main changes the V2 branch has to react to after a main merge (PRD §4.4):
//   1. drift: main commits that touched a V1 file re-implemented in V2 (twins.json)
//   2. routes main added or removed (the overlay throws at startup on removed targets)
//   3. conflict watch: main-owned files the branch still edits that main also changed
//
// Usage: node scripts/v2-drift/drift.mjs [--from <rev>] [--to <rev>] [--record]
//   --from    defaults to "Last synced main" in the backlog
//   --to      defaults to main
//   --record  after a merge, writes --to as the new "Last synced main"
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const backlogPath = join(
  root,
  'ux-audit-2026-02-26-1426',
  'BACKLOG-2026-10-10.md',
);
const SYNC_LINE = /\*\*Last synced main:\*\* `([0-9a-f]+)`[^\n]*/;

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

function parseArgs(argv) {
  const opts = { to: 'main', record: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from') opts.from = argv[++i];
    else if (arg === '--to') opts.to = argv[++i];
    else if (arg === '--record') opts.record = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

export function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${pattern}$`);
}

function lastSyncedSha() {
  const match = readFileSync(backlogPath, 'utf8').match(SYNC_LINE);
  if (!match) throw new Error(`No "Last synced main" line in ${backlogPath}`);
  return match[1];
}

function commitsInRange(from, to) {
  const out = git(
    'log',
    '--no-merges',
    '--date=short',
    '--format=%x1e%h%x1f%ad%x1f%s',
    '--name-only',
    `${from}..${to}`,
  );
  return out
    .split('\u001e')
    .filter(Boolean)
    .map((chunk) => {
      const [header, ...files] = chunk.trim().split('\n');
      const [sha, date, subject] = header.split('\u001f');
      return { sha, date, subject, files: files.filter(Boolean) };
    });
}

function filesAt(rev) {
  return git('ls-tree', '-r', '--name-only', rev).split('\n');
}

function routeNamesAt(rev) {
  const source = git('show', `${rev}:src/router/index.ts`);
  return new Set([...source.matchAll(/\bname:\s*'([^']+)'/g)].map((m) => m[1]));
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const from = opts.from ?? lastSyncedSha();
  const to = git('rev-parse', '--short', opts.to);
  const { twins } = JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'twins.json'),
      'utf8',
    ),
  );
  const compiled = twins.map((twin) => ({
    ...twin,
    v1Re: twin.v1.map(globToRegExp),
    v2Re: twin.v2.map(globToRegExp),
  }));
  const commits = commitsInRange(from, to);

  console.log(
    `# V2 drift check: main ${from}..${to} (${commits.length} commits)\n`,
  );

  // Stale map entries: a glob that matches nothing means main renamed or
  // deleted the file, or the V2 side moved. Fix twins.json first.
  const mainFiles = filesAt(to);
  const branchFiles = filesAt('HEAD');
  const stale = [];
  for (const twin of compiled) {
    twin.v1.forEach((glob, i) => {
      if (!mainFiles.some((f) => twin.v1Re[i].test(f)))
        stale.push(`${twin.id}: v1 ${glob}`);
    });
    twin.v2.forEach((glob, i) => {
      if (!branchFiles.some((f) => twin.v2Re[i].test(f)))
        stale.push(`${twin.id}: v2 ${glob}`);
    });
  }
  if (stale.length) {
    console.log('## Stale twins.json entries (match no file)\n');
    stale.forEach((s) => console.log(`- ${s}`));
    console.log('');
  }

  console.log('## Drift: port to V2 or log in BACKLOG section D\n');
  let driftCount = 0;
  for (const twin of compiled) {
    const hits = commits
      .map((c) => ({
        ...c,
        files: c.files.filter((f) => twin.v1Re.some((re) => re.test(f))),
      }))
      .filter((c) => c.files.length);
    if (!hits.length) continue;
    driftCount += hits.length;
    console.log(`### ${twin.id} → ${twin.v2.join(', ')}\n`);
    for (const c of hits) {
      console.log(`- \`${c.sha}\` ${c.date} ${c.subject}`);
      c.files.forEach((f) => console.log(`  - ${f}`));
    }
    console.log('');
  }
  if (!driftCount) console.log('None.\n');

  console.log('## Routes main added or removed\n');
  const before = routeNamesAt(from);
  const after = routeNamesAt(to);
  const added = [...after].filter((n) => !before.has(n));
  const removed = [...before].filter((n) => !after.has(n));
  if (!added.length && !removed.length) console.log('None.\n');
  added.forEach((n) =>
    console.log(
      `- added \`${n}\`: new family or tab; add to route-inventory.md`,
    ),
  );
  removed.forEach((n) =>
    console.log(
      `- removed \`${n}\`: if src/router/v2.ts targets it, the app throws at startup`,
    ),
  );
  if (added.length || removed.length) console.log('');

  console.log(
    '## Conflict watch: main-owned files the branch edits that main changed\n',
  );
  const branchEdited = new Set(
    git('diff', '--name-status', to, 'HEAD')
      .split('\n')
      .filter((line) => line.startsWith('M\t'))
      .map((line) => line.slice(2)),
  );
  const touched = new Map();
  for (const c of commits) {
    for (const f of c.files) {
      if (branchEdited.has(f))
        touched.set(f, [...(touched.get(f) ?? []), c.sha]);
    }
  }
  if (!touched.size) console.log('None.\n');
  for (const [file, shas] of touched)
    console.log(`- ${file} (${shas.join(', ')})`);

  if (opts.record) {
    const merged = git('rev-parse', '--short', 'HEAD');
    const today = new Date().toISOString().slice(0, 10);
    const text = readFileSync(backlogPath, 'utf8');
    const branchPoint =
      text.match(/Branch point: `([0-9a-f]+)`/)?.[1] ?? '28af00f';
    writeFileSync(
      backlogPath,
      text.replace(
        SYNC_LINE,
        `**Last synced main:** \`${to}\` (merged as \`${merged}\` on ${today}). Branch point: \`${branchPoint}\`.`,
      ),
    );
    console.log(`\nRecorded ${to} as the last synced main in the backlog.`);
  }
}

main();
