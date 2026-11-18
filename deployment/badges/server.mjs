import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const endpoint = '/badges/compliance.svg';

function validValue(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    [...value].length <= 255 &&
    value.trim() === value &&
    !/[\p{Cc}\p{Cf}\uFFFD]/u.test(value)
  );
}

export function renderBadge(body) {
  // The API returns GenericDataListResponse ({"data": [...]}); accept a bare list too.
  const rows = Array.isArray(body) ? body : body?.data;
  if (
    !Array.isArray(rows) ||
    !rows.every(
      (entry) =>
        entry &&
        typeof entry.status === 'string' &&
        Number.isSafeInteger(entry.count) &&
        entry.count >= 0,
    )
  ) {
    throw new Error('Invalid compliance response');
  }
  const has = (status) =>
    rows.some(
      (entry) => entry.count > 0 && entry.status.toLowerCase() === status,
    );
  const status = has('not-satisfied')
    ? 'not-satisfied'
    : has('satisfied')
      ? 'satisfied'
      : 'unknown';
  const color =
    status === 'not-satisfied'
      ? '#e05d44'
      : status === 'satisfied'
        ? '#4c1'
        : '#9f9f9f';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20" role="img" aria-label="compliance: ${status}"><title>compliance: ${status}</title><rect width="220" height="20" rx="3" fill="#555"/><path fill="${color}" d="M88 0h129q3 0 3 3v14q0 3-3 3H88z"/><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="44" y="14">compliance</text><text x="154" y="14">${status}</text></g></svg>`;
}

async function readCompliance(response) {
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) {
      throw new Error('Evidence response exceeds 4 MiB');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createBadgeServer({ apiUrl, cookieFile, logger = console }) {
  const base = new URL(apiUrl);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/'
  ) {
    throw new Error('CCF_BADGE_API_URL must be an HTTP(S) origin');
  }
  if (!cookieFile) throw new Error('CCF_BADGE_API_COOKIE_FILE is required');
  let active = 0;
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    const fail = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: message }));
    };
    let url;
    try {
      url = new URL(request.url, 'http://localhost');
    } catch {
      return fail(400, 'Invalid request URL');
    }
    if (url.pathname !== endpoint) return fail(404, 'Not found');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return fail(405, 'Method not allowed');
    }
    const labels = [...url.searchParams];
    if (
      /%(?![0-9a-f]{2})/i.test(url.search) ||
      labels.length === 0 ||
      labels.length > 50 ||
      !labels.every(([name, value]) => validValue(name) && validValue(value))
    ) {
      return fail(400, 'Between 1 and 50 valid label/value pairs are required');
    }
    const body = JSON.stringify({
      filter: {
        scope: {
          query: {
            operator: 'and',
            scopes: labels.map(([label, value]) => ({
              condition: { label, operator: '=', value },
            })),
          },
        },
      },
    });
    if (active >= 16) {
      response.setHeader('Retry-After', '5');
      return fail(503, 'Badge service busy');
    }
    active++;
    const signal = AbortSignal.timeout(5000);
    let stage = 'reading API credentials';
    try {
      // Re-read to support rotating the deployment's session without a restart.
      const cookie = (await readFile(cookieFile, 'utf8')).trim();
      if (!/^[\x20-\x7e]+$/.test(cookie)) {
        throw new Error('Invalid API cookie file');
      }
      const counts = new Map();
      let page = 1;
      let totalPages;
      do {
        stage = 'searching evidence';
        const upstream = await fetch(
          new URL(
            `/api/evidence/search?page=${page}&limit=50&sortBy=lastSeenAt&sortDirection=desc`,
            base,
          ),
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Cookie: cookie,
            },
            body,
            redirect: 'error',
            signal,
          },
        );
        stage = `processing evidence response (HTTP ${upstream.status})`;
        if (!upstream.ok) {
          await upstream.body?.cancel();
          throw new Error(`Evidence API returned HTTP ${upstream.status}`);
        }
        const result = await readCompliance(upstream);
        totalPages =
          result?.totalPages ?? result?.total_pages ?? result?.['total-pages'];
        if (
          !Array.isArray(result?.data) ||
          !Number.isSafeInteger(totalPages) ||
          totalPages < 0 ||
          !result.data.every(
            (entry) => typeof entry?.status?.state === 'string',
          )
        ) {
          throw new Error('Invalid evidence search response');
        }
        for (const entry of result.data) {
          const status = entry.status.state.toLowerCase();
          counts.set(status, (counts.get(status) ?? 0) + 1);
        }
        page++;
      } while (page <= totalPages);
      const svg = renderBadge(
        [...counts].map(([status, count]) => ({ status, count })),
      );
      response.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
      });
      response.end(svg);
    } catch (error) {
      // Never log upstream bodies, request headers, or credentials.
      logger.error('Badge lookup failed:', stage, error.name);
      fail(signal.aborted ? 504 : 502, 'Compliance status unavailable');
    } finally {
      active--;
    }
  });
}

async function main() {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const server = createBadgeServer({
    apiUrl: process.env.CCF_BADGE_API_URL,
    cookieFile: process.env.CCF_BADGE_API_COOKIE_FILE,
  });
  server.listen(port, '0.0.0.0', () => {
    console.info(`Badge service listening on port ${port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
