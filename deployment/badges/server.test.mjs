// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBadgeServer, renderBadge } from './server.mjs';

const labels = {
  repo: 'example/project',
  branch: 'feature/badges',
  event_type: 'push',
};
const query = new URLSearchParams(labels);
const badgePath = `/badges/compliance.svg?${query}`;
const evidencePage = (states, totalPages = 1) => ({
  data: states.map((state) => ({ status: { state } })),
  totalPages,
});

test('aggregates compliance counts without treating errors as unknown', () => {
  const badge = (data) => renderBadge({ data });
  assert.match(badge([]), /compliance: unknown/);
  assert.match(
    badge([{ status: 'unrecognized', count: 2 }]),
    /compliance: unknown/,
  );
  assert.match(
    badge([
      { status: 'satisfied', count: 2 },
      { status: 'not-satisfied', count: 0 },
      { status: 'unknown', count: 1 },
    ]),
    /compliance: satisfied/,
  );
  assert.match(
    badge([
      { status: 'satisfied', count: 100 },
      { status: 'NOT-SATISFIED', count: 1 },
    ]),
    /compliance: not-satisfied/,
  );
  assert.match(
    badge([{ status: 'not-satisfied', count: 1 }]),
    /fill="#e05d44"/,
  );
  assert.match(badge([{ status: 'satisfied', count: 1 }]), /fill="#4c1"/);
  assert.match(badge([]), /fill="#9f9f9f"/);
  assert.match(
    renderBadge([{ status: 'not-satisfied', count: 1 }]),
    /compliance: not-satisfied/,
  );
  assert.doesNotMatch(
    badge([{ status: '<script>alert(1)</script>', count: 1 }]),
    /<script>/,
  );
  for (const body of [
    null,
    {},
    { data: null },
    [{ status: 'satisfied', count: -1 }],
    { data: [{ status: 'satisfied', count: -1 }] },
    { data: [{ status: 'satisfied', count: '1' }] },
  ]) {
    assert.throws(() => renderBadge(body), /Invalid compliance response/);
  }
});

test('serves SVGs from ad hoc label searches using only configured credentials', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ccf-badges-'));
  t.onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const cookieFile = join(directory, 'cookie');
  await writeFile(cookieFile, 'session=test-only');
  const calls = [];
  const held = [];
  let hold = false;
  let onHeld;
  let upstreamStatus = 200;
  let upstreamBody = evidencePage(['satisfied']);
  let pages;
  const upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    calls.push({
      url: request.url,
      method: request.method,
      cookie: request.headers.cookie,
      authorization: request.headers.authorization,
      contentType: request.headers['content-type'],
      body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    });
    if (hold) {
      held.push(response);
      onHeld?.();
      return;
    }
    response.writeHead(upstreamStatus, { 'Content-Type': 'application/json' });
    const page = Number(
      new URL(request.url, 'http://localhost').searchParams.get('page'),
    );
    response.end(JSON.stringify(pages ? pages[page - 1] : upstreamBody));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  t.onTestFinished(() => {
    upstream.closeAllConnections();
    return new Promise((resolve) => upstream.close(resolve));
  });
  const errors = [];
  const server = createBadgeServer({
    apiUrl: `http://127.0.0.1:${upstream.address().port}`,
    cookieFile,
    logger: { error: (...args) => errors.push(args) },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.onTestFinished(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path = badgePath, options) => fetch(origin + path, options);

  const result = await request(badgePath, {
    headers: {
      Cookie: 'visitor=must-not-be-forwarded',
      Authorization: 'ignored',
    },
  });
  assert.equal(result.status, 200);
  assert.match(result.headers.get('content-type'), /^image\/svg\+xml/);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(await result.text(), /compliance: satisfied/);
  assert.deepEqual(calls, [
    {
      url: '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      method: 'POST',
      cookie: 'session=test-only',
      authorization: undefined,
      contentType: 'application/json',
      body: {
        filter: {
          scope: {
            query: {
              operator: 'and',
              scopes: Object.entries(labels).map(([label, value]) => ({
                condition: { label, operator: '=', value },
              })),
            },
          },
        },
      },
    },
  ]);

  for (const path of [
    '/badges/compliance.svg',
    `${badgePath}&=value`,
    `${badgePath}&extra=`,
    `${badgePath}&bad%00name=value`,
    `/badges/compliance.svg?${new URLSearchParams(Array.from({ length: 51 }, (_, index) => [`label${index}`, 'value']))}`,
    `${badgePath}&extra=${'x'.repeat(256)}`,
    badgePath.replace('event_type=push', 'event_type=%FF'),
    badgePath.replace('event_type=push', 'event_type=%xx'),
    badgePath.replace('event_type=push', 'event_type=%20push'),
  ]) {
    assert.equal((await request(path)).status, 400, path);
  }
  assert.equal((await request('/anything')).status, 404);
  assert.equal((await request(badgePath, { method: 'POST' })).status, 405);
  assert.equal(calls.length, 1);

  const customQuery = new URLSearchParams([
    ['custom_label', 'a/b+c#d&e'],
    ['custom_label', 'another'],
  ]);
  assert.equal(
    (await request(`/badges/compliance.svg?${customQuery}`)).status,
    200,
  );
  assert.deepEqual(calls.at(-1).body.filter.scope.query.scopes, [
    { condition: { label: 'custom_label', operator: '=', value: 'a/b+c#d&e' } },
    { condition: { label: 'custom_label', operator: '=', value: 'another' } },
  ]);

  await writeFile(cookieFile, 'session=rotated-test-only');
  upstreamBody = evidencePage(['satisfied', 'not-satisfied']);
  assert.match(await (await request()).text(), /compliance: not-satisfied/);
  upstreamBody = evidencePage(['satisfied']);
  assert.match(await (await request()).text(), /compliance: satisfied/);
  upstreamBody = evidencePage([]);
  assert.match(await (await request()).text(), /compliance: unknown/);
  assert.equal(calls.at(-1).cookie, 'session=rotated-test-only');

  pages = [evidencePage(['satisfied'], 2), evidencePage(['not-satisfied'], 2)];
  assert.match(await (await request()).text(), /compliance: not-satisfied/);
  assert.match(calls.at(-1).url, /page=2&limit=50/);
  assert.deepEqual(calls.at(-1).body, calls.at(-2).body);
  pages[1] = { data: [] };
  assert.equal((await request()).status, 502);
  pages = undefined;

  upstreamBody = { unexpected: 'invalid' };
  assert.equal((await request()).status, 502);
  for (const status of [401, 403, 500, 302]) {
    upstreamStatus = status;
    const failed = await request();
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await failed.json(), {
      error: 'Compliance status unavailable',
    });
  }
  assert.equal(errors.length, 6);

  await writeFile(cookieFile, 'session=sensitive-test-value\u0000');
  assert.equal((await request()).status, 502);
  assert.doesNotMatch(JSON.stringify(errors), /sensitive-test-value/);
  await writeFile(cookieFile, 'session=rotated-test-only');

  upstreamStatus = 200;
  upstreamBody = { ...evidencePage([]), padding: 'x'.repeat(4 * 1024 * 1024) };
  assert.equal((await request()).status, 502);

  hold = true;
  const allHeld = new Promise((resolve) => {
    onHeld = () => {
      if (held.length === 16) resolve();
    };
  });
  const pending = Array.from({ length: 16 }, () => request());
  await allHeld;
  const busy = await request();
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get('retry-after'), '5');
  for (const response of held.splice(0)) {
    response.end(JSON.stringify(evidencePage([])));
  }
  assert.ok(
    (await Promise.all(pending)).every((result) => result.status === 200),
  );

  const timeout = await request();
  assert.equal(timeout.status, 504);
  assert.deepEqual(await timeout.json(), {
    error: 'Compliance status unavailable',
  });
}, 15000);
