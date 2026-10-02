import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { jsonBody } from '@/composables/axios';
import {
  AgentConfigApiError,
  STOP_PATHS,
  createHttpAgentConfigApi,
  toAgentConfigError,
} from '../useAgentConfigApi';
import { error409, error422, error428 } from './fixtures';

vi.mock('@/composables/axios', async () => {
  const actual = await vi.importActual<typeof import('@/composables/axios')>(
    '@/composables/axios',
  );
  return { ...actual, useAuthenticatedInstance: vi.fn() };
});

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
const api = createHttpAgentConfigApi({ get, put, post } as never);

function axiosError(status: number, data: unknown): AxiosError {
  const err = new AxiosError('Request failed', 'ERR_BAD_RESPONSE');
  err.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

const rev = (n: number) => ({
  agentId: 'a1',
  revision: n,
  overlay: {},
  overlaySize: 2,
});

describe('useAgentConfigApi (HTTP client)', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    post.mockReset();
  });

  it('getConfig: URL and stop paths', async () => {
    get.mockResolvedValue({ status: 200, data: { data: rev(7) } });
    await expect(api.getConfig('a1')).resolves.toEqual(rev(7));
    expect(get).toHaveBeenCalledWith('/api/admin/agents/a1/config', {
      camelcaseStopPaths: STOP_PATHS.config,
    });
  });

  it('putConfig: If-Match "7", jsonBody, verbatim body, 201 vs 200', async () => {
    const overlay = {
      plugins: { 'local-ssh': { policy_data: { max_auth_tries: 3 } } },
    };
    put.mockResolvedValueOnce({ status: 201, data: { data: rev(8) } });
    await expect(
      api.putConfig('a1', { overlay, comment: ' why ' }, 7),
    ).resolves.toEqual({
      revision: rev(8),
      created: true,
    });
    const [url, body, config] = put.mock.calls[0];
    expect(url).toBe('/api/admin/agents/a1/config');
    expect(body).toEqual({ overlay, comment: 'why' });
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.transformRequest).toEqual([jsonBody]);
    expect(config.camelcaseStopPaths).toBe(STOP_PATHS.config);

    put.mockResolvedValueOnce({ status: 200, data: { data: rev(7) } });
    await expect(api.putConfig('a1', { overlay }, 7)).resolves.toMatchObject({
      created: false,
    });
    expect(put.mock.calls[1][1]).toEqual({ overlay });
  });

  it('preview: POST body, stop paths, signal', async () => {
    const signal = new AbortController().signal;
    post.mockResolvedValue({
      status: 200,
      data: { data: { standalone: true } },
    });
    await api.preview('a1', { verbosity: 1 }, signal);
    expect(post).toHaveBeenCalledWith(
      '/api/admin/agents/a1/config/preview',
      { overlay: { verbosity: 1 } },
      {
        transformRequest: [jsonBody],
        camelcaseStopPaths: STOP_PATHS.preview,
        signal,
      },
    );
  });

  it('listRevisions: pagination envelope (totalPages, R49)', async () => {
    get.mockResolvedValue({
      status: 200,
      data: { data: [rev(2)], total: 21, page: 2, limit: 20, totalPages: 2 },
    });
    await expect(api.listRevisions('a1', 2, 20)).resolves.toEqual({
      items: [rev(2)],
      total: 21,
      totalPages: 2,
    });
    expect(get).toHaveBeenCalledWith('/api/admin/agents/a1/config/revisions', {
      params: { page: 2, limit: 20 },
    });
  });

  it('getRevision and revert', async () => {
    get.mockResolvedValue({ status: 200, data: { data: rev(3) } });
    await api.getRevision('a1', 3);
    expect(get).toHaveBeenCalledWith(
      '/api/admin/agents/a1/config/revisions/3',
      {
        camelcaseStopPaths: STOP_PATHS.revisions,
      },
    );
    post.mockResolvedValue({ status: 201, data: { data: rev(8) } });
    await expect(api.revert('a1', 3, 7, 'back')).resolves.toMatchObject({
      created: true,
    });
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/api/admin/agents/a1/config/revisions/3/revert');
    expect(body).toEqual({ comment: 'back' });
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.transformRequest).toEqual([jsonBody]);
  });

  it('listInstances and getInstance: stop paths', async () => {
    get.mockResolvedValueOnce({
      status: 200,
      data: { data: [], meta: { desiredRevision: 0 } },
    });
    await expect(api.listInstances('a1')).resolves.toEqual({
      items: [],
      meta: { desiredRevision: 0 },
    });
    expect(get).toHaveBeenLastCalledWith('/api/admin/agents/a1/instances', {
      camelcaseStopPaths: STOP_PATHS.instances,
    });
    get.mockResolvedValueOnce({
      status: 200,
      data: { data: { instanceId: 'i1' } },
    });
    await api.getInstance('a1', 'i1');
    expect(get).toHaveBeenLastCalledWith('/api/admin/agents/a1/instances/i1', {
      camelcaseStopPaths: STOP_PATHS.instances,
    });
  });

  it('maps 409 to conflict with current-revision read from the raw kebab body', async () => {
    put.mockRejectedValue(axiosError(409, error409));
    const err = await api.putConfig('a1', { overlay: {} }, 7).catch((e) => e);
    expect(err).toBeInstanceOf(AgentConfigApiError);
    expect(err).toMatchObject({
      kind: 'conflict',
      status: 409,
      currentRevision: 8,
    });
  });

  it('maps 422 to invalid and keeps the raw body', async () => {
    put.mockRejectedValue(axiosError(422, error422));
    const err = await api.putConfig('a1', { overlay: {} }, 7).catch((e) => e);
    expect(err.kind).toBe('invalid');
    expect(err.body.overlay).toHaveLength(1);
    expect(err.body.instances[0]['instance-id']).toBeTruthy();
    expect(err.message).toBe('configuration overlay is invalid');
  });

  it.each([
    [403, { errors: { body: 'forbidden' } }, 'forbidden'],
    [413, { errors: { body: 'too big' } }, 'too-large'],
    [500, { errors: { body: 'boom' } }, 'other'],
  ])('maps %s to %s', (status, body, kind) => {
    expect(toAgentConfigError(axiosError(status, body), 'putConfig').kind).toBe(
      kind,
    );
  });

  it('maps a 404 without an error body on getConfig to unsupported, but not a missing agent', () => {
    expect(
      toAgentConfigError(axiosError(404, { message: 'Not Found' }), 'getConfig')
        .kind,
    ).toBe('unsupported');
    expect(
      toAgentConfigError(
        axiosError(404, { errors: { body: 'agent not found' } }),
        'getConfig',
      ).kind,
    ).toBe('other');
    expect(
      toAgentConfigError(
        axiosError(404, { message: 'Not Found' }),
        'getInstance',
      ).kind,
    ).toBe('other');
  });

  it('logs a 428 as a UI bug', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(
      toAgentConfigError(axiosError(428, error428), 'putConfig').kind,
    ).toBe('other');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('maps a response-less failure to network', () => {
    expect(
      toAgentConfigError(
        new AxiosError('Network Error', 'ERR_NETWORK'),
        'getConfig',
      ).kind,
    ).toBe('network');
  });
});

describe('useAgentConfigApi never sends the mask (R25)', () => {
  it('refuses a PUT or preview whose overlay contains "••••" without calling the API', async () => {
    const localPut = vi.fn();
    const localPost = vi.fn();
    const client = createHttpAgentConfigApi({
      get: vi.fn(),
      put: localPut,
      post: localPost,
    } as never);
    const overlay = { plugins: { a: { config: { api_key: '••••' } } } };
    const err = await client.putConfig('a1', { overlay }, 7).catch((e) => e);
    expect(err).toBeInstanceOf(AgentConfigApiError);
    expect(err.kind).toBe('invalid');
    expect(err.body.overlay[0].path).toBe('/plugins/a/config/api_key');
    await expect(client.preview('a1', overlay)).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(localPut).not.toHaveBeenCalled();
    expect(localPost).not.toHaveBeenCalled();
  });
});
