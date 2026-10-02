// R69: the sticky pending-changes bar, Review & save as ONE revision (If-Match, 409 flow),
// gated on agent:configure.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  configRev7,
  previewMixed,
} from '@/composables/agent-config/__tests__/fixtures';
import type { ConfigPreview } from '@/types/agent-config';
import type { Agent } from '@/types/agents';
import { ADMIN, READER, fakeApi, globalWith, piniaWith } from './helpers';

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
});
