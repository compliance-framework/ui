// R69: the sticky pending-changes bar, Review & save as ONE revision (If-Match, 409 flow),
// gated on agent:configure.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flushPromises,
  mount,
  enableAutoUnmount,
  type VueWrapper,
} from '@vue/test-utils';
import PrimeDialog from 'primevue/dialog';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  configRev7,
  instanceIds,
  overlayRev7,
  previewMixed,
} from '@/composables/agent-config/__tests__/fixtures';
import type { ConfigPreview, SaveResult } from '@/types/agent-config';
import type { Agent } from '@/types/agents';
import FieldHints from '../editor/FieldHints.vue';
import SavePreviewPanel from '../editor/SavePreviewPanel.vue';
import {
  ADMIN,
  READER,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void }) => o.accept?.(),
  }),
}));
const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});

import AgentConfigTab from '../AgentConfigTab.vue';

// PrimeVue's TabList schedules a 150 ms ink-bar update on mount and never clears it; a wrapper
// left mounted lets it fire after this file's jsdom environment is torn down
// ("HTMLElement is not defined"). Unmounting nulls its refs, so the timer becomes a no-op.
enableAutoUnmount(afterEach);

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const cleanPreview: ConfigPreview = {
  ...previewMixed,
  overlayErrors: [],
  instances: previewMixed.instances.map((i) => ({ ...i, errors: [] })),
};

/** Lets the async review dialog chunk load and its preview resolve. */
async function settle() {
  await vi.dynamicImportSettled();
  await flushPromises();
}

/** Runs the live preview now instead of waiting for the debounce (R89 gate). */
async function checked(ws: ConfigWorkspace) {
  await flushPromises();
  await ws.preview.run().catch(() => undefined);
  await flushPromises();
}

/** The PrimeVue Dialog of the review (its header starts with "Review"). */
function reviewDialog(wrapper: VueWrapper) {
  return wrapper
    .findAllComponents(PrimeDialog)
    .find((d) => String(d.props('header')).startsWith('Review'))!;
}

async function mountTab(perms: Record<string, string[]> = ADMIN) {
  const wrapper = mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(perms), { teleport: true }),
  });
  await flushPromises();
  const ws = (wrapper.vm as unknown as { ws: ConfigWorkspace }).ws;
  return { wrapper, ws };
}

describe('pending-changes bar (R69)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi({ preview: vi.fn().mockResolvedValue(cleanPreview) });
  });

  it('appears with the count, lists and undoes changes, and discards', async () => {
    const { wrapper, ws } = await mountTab();
    expect(wrapper.find('[data-test="pending-bar"]').exists()).toBe(false);
    ws.draft.set('/verbosity', 2);
    ws.draft.set('/plugins/local-ssh/enabled', false);
    await flushPromises();
    expect(wrapper.find('[data-test="pending-count"]').text()).toBe(
      '2 pending changes',
    );
    await wrapper.find('[data-test="pending-toggle"]').trigger('click');
    await wrapper
      .find('[data-test="pending-undo-/verbosity"]')
      .trigger('click');
    expect(wrapper.find('[data-test="pending-count"]').text()).toBe(
      '1 pending change',
    );
    await wrapper.find('[data-test="pending-discard"]').trigger('click');
    expect(ws.draft.isDirty.value).toBe(false);
    expect(wrapper.find('[data-test="pending-bar"]').exists()).toBe(false);
  });

  it('Review & save previews, then saves ONE revision with If-Match and the comment', async () => {
    const saved = { ...configRev7, revision: 8, overlay: { verbosity: 2 } };
    api.current.putConfig = vi
      .fn()
      .mockResolvedValue({ revision: saved, created: true });
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    ws.draft.set('/plugins/local-ssh/schedule', '0 * * * *');
    await checked(ws);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await settle();
    expect(api.current.preview).toHaveBeenCalled();
    expect(wrapper.find('[data-test="save-preview"]').exists()).toBe(true);
    await wrapper.find('[data-test="save-comment"]').setValue('tune');
    (api.current.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      saved,
    );
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(api.current.putConfig).toHaveBeenCalledTimes(1);
    const [agentId, body, ifMatch] = (
      api.current.putConfig as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(agentId).toBe('agent-1');
    expect(ifMatch).toBe(7);
    expect(body.comment).toBe('tune');
    expect(body.overlay.verbosity).toBe(2);
    expect(body.overlay.plugins['local-ssh'].schedule).toBe('0 * * * *');
    // The saved revision is the new base; the bar is gone.
    expect(ws.draft.baseRevision.value).toBe(8);
    expect(ws.draft.isDirty.value).toBe(false);
    expect(wrapper.find('[data-test="pending-bar"]').exists()).toBe(false);
  });

  it('409: shows the conflict and keeps the changes on "Keep my changes"', async () => {
    const latest = { ...configRev7, revision: 8, createdBy: 'bob' };
    api.current.putConfig = vi.fn().mockRejectedValue(
      new AgentConfigApiError({
        kind: 'conflict',
        status: 409,
        message: 'conflict',
        currentRevision: 8,
      }),
    );
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    await checked(ws);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await settle();
    (api.current.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      latest,
    );
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="conflict-banner"]').text()).toContain(
      'r8 was saved by bob',
    );
    await wrapper.find('[data-test="conflict-keep"]').trigger('click');
    await flushPromises();
    expect(ws.draft.baseRevision.value).toBe(8);
    expect(ws.draft.overlay.value.verbosity).toBe(2);
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false);
  });

  it('a reader can neither preview nor review a draft', async () => {
    const { wrapper, ws } = await mountTab(READER);
    ws.draft.set('/verbosity', 2);
    await flushPromises();
    expect(ws.preview.pending.value).toBe(false);
    expect(api.current.preview).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="pending-review"]').exists()).toBe(false);
    expect(ws.saveDisabledReason.value).toBe(
      "You don't have permission to change this configuration",
    );
  });

  it('client-only problems disable Review and the live preview', async () => {
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/plugins/local-ssh/config/password', '••••');
    await flushPromises();
    expect(wrapper.find('[data-test="pending-blocking"]').text()).toContain(
      '1 problem',
    );
    expect(ws.preview.pending.value).toBe(false);
    expect(
      wrapper.find('[data-test="pending-review"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('R89: Review waits for the preview and is disabled by its errors', async () => {
    api.current.preview = vi.fn().mockResolvedValue({
      ...cleanPreview,
      overlayErrors: [
        { path: '/plugins/local-ssh/schedule', message: 'bad cron' },
      ],
    } satisfies ConfigPreview);
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/plugins/local-ssh/schedule', 'nope');
    await flushPromises();
    // Debouncing: Review cannot race the preview.
    expect(ws.preview.pending.value).toBe(true);
    expect(ws.reviewDisabledReason.value).toBe('Checking the pending changes…');
    await checked(ws);
    expect(ws.preview.pending.value).toBe(false);
    expect(wrapper.find('[data-test="pending-blocking"]').text()).toContain(
      '1 problem',
    );
    await wrapper.find('[data-test="pending-toggle"]').trigger('click');
    const issues = wrapper.find('[data-test="pending-issues"]').text();
    expect(issues).toContain('/plugins/local-ssh/schedule — bad cron');
    expect(
      wrapper.find('[data-test="pending-review"]').attributes('disabled'),
    ).toBeDefined();
    // The preview's problems describe that draft only.
    ws.draft.set('/plugins/local-ssh/schedule', '@hourly');
    await flushPromises();
    expect(ws.blockingCount.value).toBe(0);
  });
  it('409: "Keep my changes" keeps the other revision and flags pointers both changed', async () => {
    const latest = {
      ...configRev7,
      revision: 8,
      createdBy: 'bob',
      overlay: {
        ...overlayRev7,
        verbosity: 3,
        plugins: {
          ...overlayRev7.plugins,
          c: { source: 'ghcr.io/x/c:v1' },
        },
      },
    };
    api.current.putConfig = vi.fn().mockRejectedValue(
      new AgentConfigApiError({
        kind: 'conflict',
        status: 409,
        message: 'conflict',
        currentRevision: 8,
      }),
    );
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    ws.draft.set('/plugins/local-ssh/enabled', false);
    await checked(ws);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await settle();
    (api.current.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      latest,
    );
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="conflict-keep"]').trigger('click');
    await flushPromises();
    const overlay = ws.draft.overlay.value as {
      verbosity: number;
      plugins: Record<string, Record<string, unknown>>;
    };
    expect(overlay.plugins.c).toEqual({ source: 'ghcr.io/x/c:v1' });
    expect(overlay.plugins['local-ssh'].enabled).toBe(false);
    expect(overlay.verbosity).toBe(2);
    expect(ws.draft.changedPaths.value).toEqual([
      '/plugins/local-ssh/enabled',
      '/verbosity',
    ]);
    expect(wrapper.find('[data-test="rebase-conflicts"]').text()).toContain(
      '/verbosity',
    );
    expect(wrapper.find('[data-test="rebase-conflicts"]').text()).not.toContain(
      'enabled',
    );
  });

  it('cannot be closed while saving; edits made meanwhile stay pending', async () => {
    let resolvePut!: (r: SaveResult) => void;
    api.current.putConfig = vi
      .fn()
      .mockReturnValue(new Promise<SaveResult>((r) => (resolvePut = r)));
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    await checked(ws);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await settle();
    expect(reviewDialog(wrapper).props('closable')).toBe(true);
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(reviewDialog(wrapper).props('closable')).toBe(false);
    expect(reviewDialog(wrapper).props('closeOnEscape')).toBe(false);
    expect(
      wrapper.find('[data-test="review-back"]').attributes('disabled'),
    ).toBeDefined();
    // An edit lands while the PUT is in flight (e.g. from another component).
    ws.draft.set('/plugins/local-ssh/enabled', false);
    const sent = (api.current.putConfig as ReturnType<typeof vi.fn>).mock
      .calls[0][1].overlay;
    const saved = { ...configRev7, revision: 8, overlay: sent };
    (api.current.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      saved,
    );
    resolvePut({ revision: saved, created: true });
    await flushPromises();
    expect(ws.draft.baseRevision.value).toBe(8);
    expect(ws.draft.original.value).toEqual(sent);
    expect(ws.draft.changedPaths.value).toEqual(['/plugins/local-ssh/enabled']);
  });

  it("Esc in a nested dialog doesn't close the review", async () => {
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    await checked(ws);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await settle();
    expect(reviewDialog(wrapper).props('closeOnEscape')).toBe(true);
    wrapper.findComponent(SavePreviewPanel).vm.$emit('childOpen', true);
    await flushPromises();
    expect(reviewDialog(wrapper).props('closeOnEscape')).toBe(false);
    wrapper.findComponent(SavePreviewPanel).vm.$emit('childOpen', false);
    await flushPromises();
    expect(reviewDialog(wrapper).props('closeOnEscape')).toBe(true);
  });

  it('a failed live check shows the error and retries; Review stays enabled', async () => {
    api.current.preview = vi
      .fn()
      .mockRejectedValueOnce(new Error('upstream 500'))
      .mockResolvedValue(cleanPreview);
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    await checked(ws);
    expect(ws.preview.status.value).toBe('failed');
    const failed = wrapper.find('[data-test="live-check-failed"]');
    expect(failed.text()).toContain('upstream 500');
    expect(
      wrapper.find('[data-test="pending-review"]').attributes('disabled'),
    ).toBeUndefined();
    await wrapper.find('[data-test="live-check-retry"]').trigger('click');
    await flushPromises();
    expect(api.current.preview).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="live-check-failed"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-test="live-check"]').text()).toContain(
      'Checked',
    );
  });
});

describe('preview hints follow the current draft', () => {
  beforeEach(() => resetAgentDrafts());

  it('discarding the draft clears the shield of the last preview', async () => {
    const ptr = '/plugins/local-ssh/source';
    const unsafe: ConfigPreview = {
      ...cleanPreview,
      instances: [
        {
          ...cleanPreview.instances.find(
            (i) => i.instanceId === instanceIds.a,
          )!,
          stale: false,
          changes: [
            { path: ptr, safety: 'unsafe', reason: 'untrusted-source' },
          ],
        },
      ],
    };
    const fake = fakeApi({ preview: vi.fn().mockResolvedValue(unsafe) });
    const out: { ws?: ConfigWorkspace } = {};
    const wrapper = mount(
      workspaceHost(fake, FieldHints, () => ({ ptr }), out),
      { global: globalWith(piniaWith(ADMIN)) },
    );
    await flushPromises();
    const ws = out.ws!;
    ws.draft.set(ptr, 'ghcr.io/evil/ssh:v1');
    await checked(ws);
    expect(wrapper.find(`[data-test="shield-${ptr}"]`).exists()).toBe(true);
    ws.discard();
    await flushPromises();
    expect(ws.ctx.currentPreview.value).toBeNull();
    expect(wrapper.find(`[data-test="shield-${ptr}"]`).exists()).toBe(false);
  });
});
