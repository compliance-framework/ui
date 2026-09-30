import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import type { AgentConfigRevision, OverlayDoc } from '@/types/agent-config';
import {
  baseConfig,
  configRev6,
  configRev7,
  error422,
  overlayRev7,
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

/** r5 differs from r7 only under /policy_bundles and /plugins/local-ssh/policies. */
const policyOnlyRev5: OverlayDoc = {
  verbosity: 1,
  plugins: {
    'local-ssh': {
      schedule: '*/15 * * * *',
      config: { port: '2222' },
      policy_data: { max_auth_tries: 3 },
    },
  },
};

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
  const loadBases = vi.fn().mockResolvedValue([baseConfig]);
  const global = globalWith(piniaWith(ADMIN), { Dialog: DialogStub });
  const wrapper = mount(AgentConfigHistory, {
    props: {
      api,
      agentId: 'agent-1',
      fileBase: 'ssh',
      desiredRevision: 7,
      revertAccess: 'full',
      revertTooltip: "You don't have permission to configure agents.",
      currentOverlay: overlayRev7,
      loadBases,
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
  return { wrapper, getRevision, loadBases };
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

  it('Revert is disabled without configure or configure-policy', async () => {
    const { wrapper, loadBases } = mountHistory(makeApi(), {
      revertAccess: 'none',
    });
    await flushPromises();
    expect(revertBtn(wrapper, 5).attributes('disabled')).toBeDefined();
    expect(revertTip(wrapper, 5)).toBe(
      "You don't have permission to configure agents.",
    );
    expect(loadBases).not.toHaveBeenCalled();
  });

  describe('R61: configure-policy-only users', () => {
    it('can revert to a revision that differs only in policies (If-Match of the desired revision)', async () => {
      const api = makeApi();
      const { wrapper, loadBases } = mountHistory(
        api,
        { revertAccess: 'policy-only' },
        { 5: policyOnlyRev5 },
      );
      await flushPromises();
      expect(loadBases).toHaveBeenCalled();
      expect(revertBtn(wrapper, 5).attributes('disabled')).toBeUndefined();
      expect(revertTip(wrapper, 5)).toBe('');
      await revertBtn(wrapper, 5).trigger('click');
      await wrapper.find('[data-test="revert-confirm"]').trigger('click');
      await flushPromises();
      expect(api.revert).toHaveBeenCalledWith('agent-1', 5, 7, '');
    });

    it('sees Revert disabled, naming the path, when the revert changes a non-policy field', async () => {
      const api = makeApi();
      const { wrapper } = mountHistory(
        api,
        { revertAccess: 'policy-only' },
        {
          5: policyOnlyRev5,
          4: {
            ...policyOnlyRev5,
            plugins: {
              'local-ssh': {
                ...(policyOnlyRev5.plugins!['local-ssh'] as object),
                schedule: '@hourly',
              },
            },
          },
        },
      );
      await flushPromises();
      // r6 drops config.port (among others); r4 changes the schedule.
      expect(revertBtn(wrapper, 6).attributes('disabled')).toBeDefined();
      expect(revertTip(wrapper, 6)).toBe(
        'Needs agent:configure: this changes /plugins/local-ssh/config/port',
      );
      expect(revertTip(wrapper, 4)).toBe(
        'Needs agent:configure: this changes /plugins/local-ssh/schedule',
      );
      await revertBtn(wrapper, 6).trigger('click');
      expect(wrapper.find('[data-test="revert-dialog"]').exists()).toBe(false);
      expect(api.revert).not.toHaveBeenCalled();
    });

    it('fails closed while checking and when the revision cannot be loaded', async () => {
      const { wrapper, getRevision } = mountHistory(makeApi(), {
        revertAccess: 'policy-only',
      });
      getRevision.mockRejectedValueOnce(
        new AgentConfigApiError({
          kind: 'network',
          message: 'offline',
        }),
      );
      await flushPromises();
      expect(
        [7, 6, 5, 4, 3, 2, 1]
          .filter((r) => r !== 7)
          .every((r) => revertBtn(wrapper, r).attributes('disabled') != null),
      ).toBe(true);
      expect(revertTip(wrapper, 6)).toBe(
        'Could not check this revert: offline',
      );
    });

    it('still surfaces a 403 from the API', async () => {
      const api = makeApi({
        revert: vi.fn().mockRejectedValue(
          new AgentConfigApiError({
            kind: 'forbidden',
            status: 403,
            message: 'insufficient permissions',
          }),
        ),
      });
      const { wrapper } = mountHistory(
        api,
        { revertAccess: 'policy-only' },
        { 5: policyOnlyRev5 },
      );
      await flushPromises();
      await revertBtn(wrapper, 5).trigger('click');
      await wrapper.find('[data-test="revert-confirm"]').trigger('click');
      await flushPromises();
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Revert failed',
          detail: 'insufficient permissions',
        }),
      );
    });

    it('re-decides when the desired overlay changes', async () => {
      const { wrapper } = mountHistory(
        makeApi(),
        { revertAccess: 'policy-only' },
        { 5: policyOnlyRev5 },
      );
      await flushPromises();
      expect(revertBtn(wrapper, 5).attributes('disabled')).toBeUndefined();
      await wrapper.setProps({ currentOverlay: { verbosity: 3 } });
      await flushPromises();
      expect(revertTip(wrapper, 5)).toBe(
        'Needs agent:configure: this changes /plugins/local-ssh/config/port',
      );
    });
  });

  it('agent:configure users can revert to any revision without a policy check', async () => {
    const { wrapper, loadBases, getRevision } = mountHistory(makeApi());
    await flushPromises();
    for (const r of [6, 5, 4, 3, 2, 1]) {
      expect(revertBtn(wrapper, r).attributes('disabled')).toBeUndefined();
    }
    expect(loadBases).not.toHaveBeenCalled();
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
});
