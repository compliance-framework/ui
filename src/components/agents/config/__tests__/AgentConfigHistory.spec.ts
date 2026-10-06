import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import type { AgentConfigRevision, OverlayDoc } from '@/types/agent-config';
import {
  configRev6,
  configRev7,
  error422,
  revisionsPage1,
} from '@/composables/agent-config/__tests__/fixtures';
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
  overlays: Record<number, OverlayDoc> = {},
) {
  const cache = new Map<number, AgentConfigRevision>();
  const getRevision = vi.fn(async (rev: number) => {
    if (!cache.has(rev))
      cache.set(
        rev,
        overlays[rev]
          ? { ...configRev6, revision: rev, overlay: overlays[rev] }
          : rev === 7
            ? configRev7
            : rev === 6
              ? configRev6
              : { ...configRev6, revision: rev, overlay: { verbosity: rev } },
      );
    return cache.get(rev)!;
  });
  const global = globalWith(piniaWith(ADMIN), { Dialog: DialogStub });
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
    global: {
      ...global,
      // Record the tooltip on the element so specs can read it.
      directives: {
        tooltip: {
          mounted: setTip,
          updated: setTip,
        },
      },
    },
  });
  return { wrapper, getRevision };
}

function setTip(
  el: HTMLElement,
  binding: { value: { value: string; disabled: boolean } },
) {
  el.dataset.tip = binding.value.disabled ? '' : binding.value.value;
}

const row = (w: ReturnType<typeof mount>, rev: number) =>
  w.find(`[data-rev="${rev}"]`);
const revertBtn = (w: ReturnType<typeof mount>, rev: number) =>
  row(w, rev).find('[data-test="history-revert"]');
const revertTip = (w: ReturnType<typeof mount>, rev: number) =>
  (revertBtn(w, rev).element.parentElement as HTMLElement).dataset.tip;

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

  it('Revert is disabled without agent:configure', async () => {
    const api = makeApi();
    const { wrapper } = mountHistory(api, { canRevert: false });
    await flushPromises();
    expect(revertBtn(wrapper, 5).attributes('disabled')).toBeDefined();
    expect(revertTip(wrapper, 5)).toBe(
      "You don't have permission to configure agents.",
    );
    await revertBtn(wrapper, 5).trigger('click');
    expect(wrapper.find('[data-test="revert-dialog"]').exists()).toBe(false);
  });

  it('agent:configure users can revert to any revision without loading it', async () => {
    const { wrapper, getRevision } = mountHistory(makeApi());
    await flushPromises();
    for (const r of [6, 5, 4, 3, 2, 1]) {
      expect(revertBtn(wrapper, r).attributes('disabled')).toBeUndefined();
    }
    expect(getRevision).not.toHaveBeenCalled();
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
  it('shows a failed View as an error, not as an empty overlay', async () => {
    const { wrapper, getRevision } = mountHistory(makeApi());
    await flushPromises();
    getRevision.mockRejectedValueOnce(
      new AgentConfigApiError({
        kind: 'other',
        status: 404,
        message: 'revision not found',
      }),
    );
    await row(wrapper, 5).find('[data-test="history-view"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="view-error"]').text()).toBe(
      'revision not found',
    );
  });

  it('dedupes rows when offsets shift between pages', async () => {
    const api = makeApi({
      listRevisions: vi
        .fn()
        .mockResolvedValueOnce({
          ...revisionsPage1,
          items: revisionsPage1.items.slice(0, 4),
          totalPages: 2,
        })
        // A new revision shifted the offsets: r4 comes again.
        .mockResolvedValueOnce({
          ...revisionsPage1,
          items: revisionsPage1.items.slice(3),
          totalPages: 2,
        }),
    });
    const { wrapper } = mountHistory(api);
    await flushPromises();
    await wrapper.find('[data-test="history-more"]').trigger('click');
    await flushPromises();
    expect(
      wrapper.findAll('[data-rev]').map((r) => r.attributes('data-rev')),
    ).toEqual(['7', '6', '5', '4', '3', '2', '1']);
  });
  it('hides Load more while the first page loads and after it fails', async () => {
    let fail!: (e: unknown) => void;
    const api = makeApi({
      listRevisions: vi.fn().mockReturnValueOnce(
        new Promise((_, reject) => {
          fail = reject;
        }),
      ),
    });
    const { wrapper } = mountHistory(api);
    await flushPromises();
    expect(wrapper.text()).toContain('Loading revisions…');
    expect(wrapper.find('[data-test="history-more"]').exists()).toBe(false);
    fail(
      new AgentConfigApiError({ kind: 'other', status: 500, message: 'boom' }),
    );
    await flushPromises();
    expect(wrapper.text()).toContain('boom');
    expect(wrapper.text()).toContain('Retry');
    expect(wrapper.find('[data-test="history-more"]').exists()).toBe(false);
  });

  it('a slower earlier View never replaces a later one', async () => {
    const { wrapper, getRevision } = mountHistory(makeApi());
    await flushPromises();
    let finishR5!: (r: AgentConfigRevision) => void;
    getRevision.mockImplementationOnce(
      () =>
        new Promise<AgentConfigRevision>((resolve) => {
          finishR5 = resolve;
        }),
    );
    await row(wrapper, 5).find('[data-test="history-view"]').trigger('click');
    await row(wrapper, 4).find('[data-test="history-view"]').trigger('click');
    await flushPromises();
    finishR5({ ...configRev6, revision: 5, overlay: { verbosity: 5 } });
    await flushPromises();
    const dialog = wrapper.find('.dialog-stub');
    expect(dialog.text()).toContain('Overlay r4');
    expect(dialog.find('[data-test="yaml-text"]').text()).toContain(
      'verbosity: 4',
    );
    expect(dialog.text()).not.toContain('verbosity: 5');
  });

  it('a View finishing during a Diff leaves the Diff loading', async () => {
    const { wrapper, getRevision } = mountHistory(makeApi());
    await flushPromises();
    const pending: ((r: AgentConfigRevision) => void)[] = [];
    const later = () =>
      new Promise<AgentConfigRevision>((resolve) => pending.push(resolve));
    getRevision
      .mockImplementationOnce(later)
      .mockImplementationOnce(later)
      .mockImplementationOnce(later);
    await row(wrapper, 5).find('[data-test="history-view"]').trigger('click');
    await row(wrapper, 3)
      .find('[data-test="history-diff-prev"]')
      .trigger('click');
    // The View's revision arrives first.
    pending[0]({ ...configRev6, revision: 5, overlay: { verbosity: 5 } });
    await flushPromises();
    expect(wrapper.find('.merge-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('Loading…');
    pending[1]({ ...configRev6, revision: 2, overlay: { verbosity: 2 } });
    pending[2]({ ...configRev6, revision: 3, overlay: { verbosity: 3 } });
    await flushPromises();
    const merge = wrapper.find('.merge-stub').text();
    expect(merge).toContain('verbosity: 2');
    expect(merge).toContain('verbosity: 3');
  });
});
