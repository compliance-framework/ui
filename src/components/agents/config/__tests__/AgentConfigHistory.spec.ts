import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import type { AgentConfigRevision } from '@/types/agent-config';
import {
  configRev6,
  configRev7,
  error422,
  revisionsPage1,
} from '@/composables/agent-config/fixtures';
import { ADMIN, globalWith, piniaWith } from './helpers';

const toastAdd = vi.hoisted(() => vi.fn());
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }));
// The async CodeMirror wrappers are replaced by synchronous stubs.
vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

import AgentConfigHistory from '../AgentConfigHistory.vue';

const DialogStub = {
  name: 'Dialog',
  props: ['visible', 'header'],
  template:
    '<div v-if="visible" class="dialog-stub"><h3>{{ header }}</h3><slot /></div>',
};

function makeApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return {
    fixtures: false,
    getConfig: vi.fn(),
    putConfig: vi.fn(),
    preview: vi.fn(),
    listRevisions: vi.fn().mockResolvedValue(revisionsPage1),
    getRevision: vi.fn(),
    revert: vi.fn().mockResolvedValue({
      revision: { ...configRev7, revision: 8 },
      created: true,
    }),
    listInstances: vi.fn(),
    getInstance: vi.fn(),
    ...over,
  };
}

function mountHistory(
  api: AgentConfigApi,
  extra: Record<string, unknown> = {},
) {
  const cache = new Map<number, AgentConfigRevision>();
  const getRevision = vi.fn(async (rev: number) => {
    if (!cache.has(rev))
      cache.set(
        rev,
        rev === 7
          ? configRev7
          : rev === 6
            ? configRev6
            : { ...configRev6, revision: rev, overlay: { verbosity: rev } },
      );
    return cache.get(rev)!;
  });
  const wrapper = mount(AgentConfigHistory, {
    props: {
      api,
      agentId: 'agent-1',
      fileBase: 'ssh',
      desiredRevision: 7,
      canRevert: true,
      revertTooltip: "You don't have permission to configure agents.",
      getRevision,
      ...extra,
    },
    global: globalWith(piniaWith(ADMIN), { Dialog: DialogStub }),
  });
  return { wrapper, getRevision };
}

const row = (w: ReturnType<typeof mount>, rev: number) =>
  w.find(`[data-rev="${rev}"]`);

describe('AgentConfigHistory (U3)', () => {
  beforeEach(() => toastAdd.mockReset());

  it('lists revisions with badges and paginates via totalPages', async () => {
    const api = makeApi({
      listRevisions: vi
        .fn()
        .mockResolvedValueOnce({
          ...revisionsPage1,
          items: revisionsPage1.items.slice(0, 4),
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          ...revisionsPage1,
          items: revisionsPage1.items.slice(4),
          totalPages: 2,
        }),
    });
    const { wrapper } = mountHistory(api);
    await flushPromises();
    expect(api.listRevisions).toHaveBeenCalledWith('agent-1', 1, 20);
    expect(row(wrapper, 7).text()).toContain('Current');
    expect(row(wrapper, 4).text()).toContain('Revert of r2');
    expect(row(wrapper, 7).find('[data-test="history-revert"]').exists()).toBe(
      false,
    );
    await wrapper.find('[data-test="history-more"]').trigger('click');
    await flushPromises();
    expect(api.listRevisions).toHaveBeenLastCalledWith('agent-1', 2, 20);
    expect(wrapper.findAll('[data-rev]')).toHaveLength(7);
    expect(wrapper.find('[data-test="history-more"]').exists()).toBe(false);
  });

  it('View and Diff lazy-load (cached) revisions', async () => {
    const { wrapper, getRevision } = mountHistory(makeApi());
    await flushPromises();
    await row(wrapper, 6).find('[data-test="history-view"]').trigger('click');
    await flushPromises();
    expect(getRevision).toHaveBeenCalledWith(6);
    expect(wrapper.find('.dialog-stub').text()).toContain('Overlay r6');
    await row(wrapper, 7)
      .find('[data-test="history-diff-prev"]')
      .trigger('click');
    await flushPromises();
    expect(getRevision).toHaveBeenCalledWith(7);
    expect(wrapper.find('.merge-stub').text()).toContain('local-ssh');
    await row(wrapper, 1)
      .find('[data-test="history-diff-prev"]')
      .trigger('click');
    await flushPromises();
    // r1 is diffed against {}.
    expect(getRevision).not.toHaveBeenCalledWith(0);
  });

  it('reverts with If-Match of the desired revision and the comment; 201 refreshes', async () => {
    const api = makeApi();
    const { wrapper } = mountHistory(api);
    await flushPromises();
    await row(wrapper, 5).find('[data-test="history-revert"]').trigger('click');
    await wrapper.find('[data-test="revert-comment"]').setValue('back to 5');
    await wrapper.find('[data-test="revert-confirm"]').trigger('click');
    await flushPromises();
    expect(api.revert).toHaveBeenCalledWith('agent-1', 5, 7, 'back to 5');
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Reverted to r5 as r8' }),
    );
    expect(wrapper.emitted('changed')).toHaveLength(1);
    expect(api.listRevisions).toHaveBeenCalledTimes(2);
  });

  it('a 200 revert says no new revision', async () => {
    const api = makeApi({
      revert: vi
        .fn()
        .mockResolvedValue({ revision: configRev7, created: false }),
    });
    const { wrapper } = mountHistory(api);
    await flushPromises();
    await row(wrapper, 5).find('[data-test="history-revert"]').trigger('click');
    await wrapper.find('[data-test="revert-confirm"]').trigger('click');
    await flushPromises();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        detail: 'Already equivalent to r5; no new revision',
      }),
    );
  });

  it('Revert is disabled without configure', async () => {
    const { wrapper } = mountHistory(makeApi(), { canRevert: false });
    await flushPromises();
    expect(
      row(wrapper, 5)
        .find('[data-test="history-revert"]')
        .attributes('disabled'),
    ).toBeDefined();
  });

  it('handles 409 (refresh + retry) and 422 (error dialog)', async () => {
    const conflictApi = makeApi({
      revert: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'conflict',
          status: 409,
          message: 'c',
        }),
      ),
    });
    const c = mountHistory(conflictApi);
    await flushPromises();
    await row(c.wrapper, 5)
      .find('[data-test="history-revert"]')
      .trigger('click');
    await c.wrapper.find('[data-test="revert-confirm"]').trigger('click');
    await flushPromises();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Conflict' }),
    );
    expect(c.wrapper.emitted('changed')).toHaveLength(1);

    const invalidApi = makeApi({
      revert: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'invalid',
          status: 422,
          message: 'invalid',
          body: error422.errors,
        }),
      ),
    });
    const i = mountHistory(invalidApi);
    await flushPromises();
    await row(i.wrapper, 5)
      .find('[data-test="history-revert"]')
      .trigger('click');
    await i.wrapper.find('[data-test="revert-confirm"]').trigger('click');
    await flushPromises();
    const dlg = i.wrapper.find('[data-test="revert-invalid"]');
    expect(dlg.text()).toContain('/api');
    expect(dlg.text()).toContain('invalid cron');
    expect(dlg.text()).toContain('max_auth_tries.rego:3:1');
  });

  it('shows the empty state', async () => {
    const { wrapper } = mountHistory(
      makeApi({
        listRevisions: vi
          .fn()
          .mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
      }),
    );
    await flushPromises();
    expect(wrapper.find('[data-test="history-empty"]').text()).toBe(
      'No revisions yet.',
    );
  });
});
