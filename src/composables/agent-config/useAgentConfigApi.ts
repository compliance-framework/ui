// The single HTTP client for agent remote configuration (LLD U0.3). It uses
// useAuthenticatedInstance() directly (like useLineage) rather than useDataApi, because it
// needs per-call stop paths, If-Match headers and status-aware results (200 vs 201).
//
// Must be called in setup(): useAuthenticatedInstance needs the router and the toast.

import type { AxiosInstance, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';
import { jsonBody, useAuthenticatedInstance } from '@/composables/axios';
import type {
  AgentConfigRevision,
  AgentConfigRevisionSummary,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigErrorBody,
  ConfigPreview,
  InstancesMeta,
  SaveConfigRequest,
  SaveResult,
} from '@/types/agent-config';
import { AgentConfigApiError, type AgentConfigApi } from './api-types';

export * from './api-types';

/**
 * camelcase-keys matches stop paths against the ORIGINAL (pre-camelCase, kebab) keys, and
 * array indices are not part of the path (R15, R46). Any map keyed by user-defined names is
 * opaque.
 */
export const STOP_PATHS = {
  config: ['data.overlay', 'data.bundles-first-seen'],
  revisions: ['data.overlay'],
  // List (array) and detail (object) both resolve to data.<key>.
  instances: ['data.base', 'data.effective', 'data.remote-config'],
  preview: [
    'data.instances.effective',
    'data.instances.diff-vs-current.from',
    'data.instances.diff-vs-current.to',
  ],
} as const;

/** Fixture mode: VITE_AGENT_CONFIG_FIXTURES=true or ?fixtures=agent-config. No auto fallback. */
export function agentConfigFixturesEnabled(): boolean {
  if (import.meta.env.VITE_AGENT_CONFIG_FIXTURES === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    return (
      new URLSearchParams(window.location.search).get('fixtures') ===
      'agent-config'
    );
  } catch {
    return false;
  }
}

function errorBodyOf(error: unknown): ConfigErrorBody | undefined {
  if (!isAxiosError(error)) return undefined;
  const data = error.response?.data as { errors?: ConfigErrorBody } | undefined;
  if (
    data &&
    typeof data === 'object' &&
    data.errors &&
    typeof data.errors === 'object'
  ) {
    return data.errors;
  }
  return undefined;
}

/** Normalises any failure into an AgentConfigApiError (LLD U0.3 table). */
export function toAgentConfigError(
  error: unknown,
  op: keyof Omit<AgentConfigApi, 'fixtures'>,
): AgentConfigApiError {
  if (error instanceof AgentConfigApiError) return error;
  if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
    return new AgentConfigApiError({
      kind: 'other',
      message: 'Request cancelled',
    });
  }
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const body = errorBodyOf(error);
  const raw = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)
    : undefined;
  const message =
    body?.body ||
    (raw && typeof raw === 'object' && typeof raw.message === 'string'
      ? raw.message
      : '') ||
    (error instanceof Error ? error.message : '') ||
    'Request failed';

  if (status === undefined) {
    return new AgentConfigApiError({
      kind: 'network',
      message: message || 'Network error',
    });
  }
  switch (status) {
    case 409:
      return new AgentConfigApiError({
        kind: 'conflict',
        status,
        body,
        message,
        currentRevision:
          typeof body?.['current-revision'] === 'number'
            ? body['current-revision']
            : undefined,
      });
    case 422:
      return new AgentConfigApiError({
        kind: 'invalid',
        status,
        body,
        message,
      });
    case 403:
      return new AgentConfigApiError({
        kind: 'forbidden',
        status,
        body,
        message,
      });
    case 413:
      return new AgentConfigApiError({
        kind: 'too-large',
        status,
        body,
        message:
          'The configuration is too large (limit 2 MiB with policy bundles).',
      });
    case 404:
      // A missing ROUTE (old API) has no {errors:{body}}; a missing agent does.
      if (op === 'getConfig' && !body) {
        return new AgentConfigApiError({
          kind: 'unsupported',
          status,
          message: 'This CCF API version does not support agent configuration.',
        });
      }
      return new AgentConfigApiError({ kind: 'other', status, body, message });
    case 428:
      console.error(
        'agent config: missing If-Match on a write (UI bug)',
        error,
      );
      return new AgentConfigApiError({
        kind: 'other',
        status,
        body,
        message: `Missing If-Match: ${message}`,
      });
    default:
      return new AgentConfigApiError({ kind: 'other', status, body, message });
  }
}

const ifMatch = (rev: number) => ({ 'If-Match': `"${rev}"` });

function saveResult(
  res: AxiosResponse<{ data: AgentConfigRevision }>,
): SaveResult {
  return { revision: res.data.data, created: res.status === 201 };
}

export function createHttpAgentConfigApi(
  instance: AxiosInstance,
): AgentConfigApi {
  const base = (agentId: string) =>
    `/api/admin/agents/${encodeURIComponent(agentId)}`;

  async function call<T>(
    op: keyof Omit<AgentConfigApi, 'fixtures'>,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      throw toAgentConfigError(e, op);
    }
  }

  return {
    fixtures: false,
    getConfig: (agentId) =>
      call('getConfig', async () => {
        const res = await instance.get<{ data: AgentConfigRevision }>(
          `${base(agentId)}/config`,
          {
            camelcaseStopPaths: STOP_PATHS.config,
          },
        );
        return res.data.data;
      }),
    putConfig: (agentId, body, rev) =>
      call('putConfig', async () => {
        const payload: SaveConfigRequest = { overlay: body.overlay };
        if (body.comment && body.comment.trim())
          payload.comment = body.comment.trim();
        const res = await instance.put<{ data: AgentConfigRevision }>(
          `${base(agentId)}/config`,
          payload,
          {
            headers: ifMatch(rev),
            transformRequest: [jsonBody],
            camelcaseStopPaths: STOP_PATHS.config,
          },
        );
        return saveResult(res);
      }),
    preview: (agentId, overlay, signal) =>
      call('preview', async () => {
        const res = await instance.post<{ data: ConfigPreview }>(
          `${base(agentId)}/config/preview`,
          { overlay },
          {
            transformRequest: [jsonBody],
            camelcaseStopPaths: STOP_PATHS.preview,
            signal,
          },
        );
        return res.data.data;
      }),
    listRevisions: (agentId, page, limit) =>
      call('listRevisions', async () => {
        const res = await instance.get<{
          data: AgentConfigRevisionSummary[];
          total: number;
          totalPages: number;
        }>(`${base(agentId)}/config/revisions`, { params: { page, limit } });
        return {
          items: res.data.data ?? [],
          total: res.data.total ?? 0,
          totalPages: res.data.totalPages ?? 1,
        };
      }),
    getRevision: (agentId, rev) =>
      call('getRevision', async () => {
        const res = await instance.get<{ data: AgentConfigRevision }>(
          `${base(agentId)}/config/revisions/${rev}`,
          { camelcaseStopPaths: STOP_PATHS.revisions },
        );
        return res.data.data;
      }),
    revert: (agentId, rev, current, comment) =>
      call('revert', async () => {
        const payload =
          comment && comment.trim() ? { comment: comment.trim() } : {};
        const res = await instance.post<{ data: AgentConfigRevision }>(
          `${base(agentId)}/config/revisions/${rev}/revert`,
          payload,
          {
            headers: ifMatch(current),
            transformRequest: [jsonBody],
            camelcaseStopPaths: STOP_PATHS.revisions,
          },
        );
        return saveResult(res);
      }),
    listInstances: (agentId) =>
      call('listInstances', async () => {
        const res = await instance.get<{
          data: AgentInstanceSummary[];
          meta: InstancesMeta;
        }>(`${base(agentId)}/instances`, {
          camelcaseStopPaths: STOP_PATHS.instances,
        });
        return { items: res.data.data ?? [], meta: res.data.meta };
      }),
    getInstance: (agentId, instanceId) =>
      call('getInstance', async () => {
        const res = await instance.get<{ data: AgentInstanceDetail }>(
          `${base(agentId)}/instances/${encodeURIComponent(instanceId)}`,
          { camelcaseStopPaths: STOP_PATHS.instances },
        );
        return res.data.data;
      }),
  };
}

/**
 * Fixture mode loads the in-memory implementation (and its fixtures) on first use, so none of
 * it ships in the regular chunks.
 */
function createLazyFixtureApi(): AgentConfigApi {
  let impl: Promise<AgentConfigApi> | null = null;
  const load = () =>
    (impl ??= import('./fixtureApi').then((m) => m.createFixtureApi()));
  return {
    fixtures: true,
    getConfig: (...a) => load().then((api) => api.getConfig(...a)),
    putConfig: (...a) => load().then((api) => api.putConfig(...a)),
    preview: (...a) => load().then((api) => api.preview(...a)),
    listRevisions: (...a) => load().then((api) => api.listRevisions(...a)),
    getRevision: (...a) => load().then((api) => api.getRevision(...a)),
    revert: (...a) => load().then((api) => api.revert(...a)),
    listInstances: (...a) => load().then((api) => api.listInstances(...a)),
    getInstance: (...a) => load().then((api) => api.getInstance(...a)),
  };
}

export function useAgentConfigApi(): AgentConfigApi {
  if (agentConfigFixturesEnabled()) return createLazyFixtureApi();
  return createHttpAgentConfigApi(useAuthenticatedInstance());
}
