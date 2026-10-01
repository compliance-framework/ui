import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import type { AgentConfigRevision, ConfigPreview } from '@/types/agent-config';
import {
  configRev7,
  detailFor,
  error422,
  instanceIds,
  instancesMixed,
  overlayRev7,
} from '@/composables/agent-config/fixtures';
import type { Agent } from '@/types/agents';
import { ADMIN, POLICY_AUTHOR, globalWith, piniaWith } from './helpers';

const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});
const toastAdd = vi.hoisted(() => vi.fn());
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }));
const confirmRequire = vi.hoisted(() => vi.fn());
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequire }),
}));

import AgentConfigEditorDrawer from '../AgentConfigEditorDrawer.vue';

// The async CodeMirror wrappers are replaced by synchronous stubs.
vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '',
  updatedAt: '',
};
const a = instancesMixed.items[0];
const cleanPreview: ConfigPreview = {
  desiredRevision: 7,
  standalone: false,
  overlayErrors: [],
  policyErrors: [],
  instances: [
    {
      instanceId: a.instanceId,
      hostname: 'ip-a',
      mode: 'apply_safe',
      stale: false,
      validated: true,
      effective: null,
      errors: [],
      warnings: [],
      changes: [{ path: '/verbosity', safety: 'safe', reason: 'logging' }],
      willApply: true,
    },
  ],
};

function makeApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return {
    fixtures: false,
    listArtifactFiles: vi.fn(),
    getArtifactFile: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({
      ...configRev7,
      revision: 8,
      createdBy: 'bob@example.com',
    }),
    putConfig: vi.fn().mockResolvedValue({
      revision: { ...configRev7, revision: 8 },
      created: true,
    }),
    preview: vi.fn().mockResolvedValue(cleanPreview),
    listRevisions: vi.fn(),
    getRevision: vi.fn(),
    revert: vi.fn(),
    listInstances: vi.fn(),
    getInstance: vi.fn(),
    ...over,
  };
}

const DrawerStub = {
  name: 'Drawer',
  props: ['visible'],
  emits: ['update:visible'],
  template:
    '<div v-if="visible" data-test="drawer"><slot name="header" /><slot /><slot name="footer" /><button data-test="drawer-x" @click="$emit(\'update:visible\', false)">x</button></div>',
};

function mountDrawer(
  perms: Record<string, string[]> = ADMIN,
  config: AgentConfigRevision = configRev7,
) {
  const global = globalWith(piniaWith(perms), {
    Drawer: DrawerStub,
    Dialog: true,
  });
  return mount(AgentConfigEditorDrawer, {
    props: {
      visible: true,
      agent,
      config,
      instances: [a],
      instanceDetails: new Map([[a.instanceId, detailFor(a, config.overlay!)]]),
      initialInstanceId: a.instanceId,
    },
    global: {
      ...global,
      // Record the tooltip on the element so specs can read it.
      directives: { tooltip: { mounted: setTip, updated: setTip } },
    },
  });
}

function setTip(
  el: HTMLElement,
  binding: { value: string | { value: string; disabled?: boolean } },
) {
  const v = binding.value;
  el.dataset.tip = typeof v === 'string' ? v : v.disabled ? '' : v.value;
}

const clearTip = (w: ReturnType<typeof mount>) =>
  (w.find('[data-test="clear-overlay"]').element.parentElement as HTMLElement)
    .dataset.tip;

type Exposed = {
  draft: {
    set: (p: string, v: unknown) => void;
    replaceAll: (o: object) => void;
    overlay: { value: unknown };
  };
};

async function toReview(wrapper: ReturnType<typeof mountDrawer>) {
  (wrapper.vm as unknown as Exposed).draft.set('/verbosity', 2);
  await flushPromises();
  await wrapper.find('[data-test="review-changes"]').trigger('click');
  await flushPromises();
}

describe('AgentConfigEditorDrawer (U2)', () => {
  beforeEach(() => {
    api.current = makeApi();
    toastAdd.mockReset();
    confirmRequire.mockReset();
  });

  it('review → save sends the base revision and the overlay verbatim (snake_case)', async () => {
    const wrapper = mountDrawer();
    expect(
      wrapper.find('[data-test="review-changes"]').attributes('disabled'),
    ).toBeDefined();
    await toReview(wrapper);
    expect(api.current.preview).toHaveBeenCalled();
    await wrapper.find('[data-test="save-comment"]').setValue('bump');
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    const [id, body, rev] = (api.current.putConfig as ReturnType<typeof vi.fn>)
      .mock.calls[0];
    expect(id).toBe('agent-1');
    expect(rev).toBe(7);
    expect(body.comment).toBe('bump');
    expect(body.overlay.plugins['local-ssh'].policy_data).toEqual({
      max_auth_tries: 3,
    });
    expect(
      body.overlay.policy_bundles['ssh-tuned'].modules['max_auth_tries.rego'],
    ).toContain('package');
    expect(body.overlay.verbosity).toBe(2);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Configuration saved (r8)' }),
    );
    expect(wrapper.emitted('saved')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
    expect(confirmRequire).not.toHaveBeenCalled();
  });

  it('a 200 no-op shows an info toast', async () => {
    api.current = makeApi({
      putConfig: vi
        .fn()
        .mockResolvedValue({ revision: configRev7, created: false }),
    });
    const wrapper = mountDrawer();
    await toReview(wrapper);
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'info',
        detail: 'No effective change; revision r7 is unchanged',
      }),
    );
  });

  it('409 shows the conflict banner; keep rebases and returns to review, discard reloads', async () => {
    api.current = makeApi({
      putConfig: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'conflict',
          status: 409,
          message: 'c',
          currentRevision: 8,
        }),
      ),
    });
    const wrapper = mountDrawer();
    await toReview(wrapper);
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Configuration changed by someone else',
      }),
    );
    const banner = wrapper.find('[data-test="conflict-banner"]');
    expect(banner.text()).toContain('r8 was saved by bob@example.com');
    expect(banner.text()).toContain('based on r7');

    await wrapper.find('[data-test="conflict-keep"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="save-config"]').text()).toBe('Save as r9');
    expect(
      (wrapper.vm as unknown as Exposed).draft.overlay.value,
    ).toMatchObject({ verbosity: 2 });

    // Discard path.
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="conflict-discard"]').trigger('click');
    await flushPromises();
    expect(
      (wrapper.vm as unknown as Exposed).draft.overlay.value,
    ).toMatchObject({ verbosity: 1 });
  });

  it('422 maps overlay / instances / policy-errors and stays on review', async () => {
    api.current = makeApi({
      putConfig: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'invalid',
          status: 422,
          message: 'invalid',
          body: error422.errors,
        }),
      ),
    });
    const wrapper = mountDrawer();
    await toReview(wrapper);
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="overlay-error"]').text()).toContain(
      '/api',
    );
    expect(wrapper.find('[data-test="policy-error"]').exists()).toBe(true);
    expect(
      wrapper.find(`[data-test="instance-panel-${instanceIds.a}"]`).text(),
    ).toContain('invalid cron');
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('Clear overlay confirms, then reviews and saves {}', async () => {
    const wrapper = mountDrawer();
    await wrapper.find('[data-test="clear-overlay"]').trigger('click');
    expect(confirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Clear overlay' }),
    );
    await confirmRequire.mock.calls[0][0].accept();
    await flushPromises();
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(
      (api.current.putConfig as ReturnType<typeof vi.fn>).mock.calls[0][1]
        .overlay,
    ).toEqual({});
  });

  it('guards closing a dirty draft', async () => {
    const wrapper = mountDrawer();
    await wrapper.find('[data-test="drawer-cancel"]').trigger('click');
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);

    const dirty = mountDrawer();
    (dirty.vm as unknown as Exposed).draft.set('/verbosity', 2);
    await dirty.find('[data-test="drawer-x"]').trigger('click');
    expect(confirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Discard changes?' }),
    );
    expect(dirty.emitted('update:visible')).toBeUndefined();
    confirmRequire.mock.calls[0][0].accept();
    await flushPromises();
    expect(dirty.emitted('update:visible')?.at(-1)).toEqual([false]);
  });

  it('policy-only users: banner, and Save disabled for a non-policy change', async () => {
    const wrapper = mountDrawer(POLICY_AUTHOR);
    expect(wrapper.find('[data-test="policy-only-banner"]').exists()).toBe(
      true,
    );
    // R61: clearing r7 would also drop non-policy fields.
    expect(
      wrapper.find('[data-test="clear-overlay"]').attributes('disabled'),
    ).toBeDefined();
    expect(clearTip(wrapper)).toBe(
      'Needs agent:configure: this changes /plugins/local-ssh/config/port',
    );
    await wrapper.find('[data-test="clear-overlay"]').trigger('click');
    expect(confirmRequire).not.toHaveBeenCalled();
    await toReview(wrapper);
    expect(
      wrapper.find('[data-test="save-config"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('R61: policy-only users may Clear an overlay that only holds policies', async () => {
    const policyOnly: AgentConfigRevision = {
      ...configRev7,
      overlay: {
        plugins: {
          'local-ssh': {
            policies: overlayRev7.plugins!['local-ssh']!.policies,
          },
        },
        policy_bundles: overlayRev7.policy_bundles,
      },
    };
    const wrapper = mountDrawer(POLICY_AUTHOR, policyOnly);
    expect(
      wrapper.find('[data-test="clear-overlay"]').attributes('disabled'),
    ).toBeUndefined();
    expect(clearTip(wrapper)).toBe('');
    await wrapper.find('[data-test="clear-overlay"]').trigger('click');
    expect(confirmRequire).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Clear overlay' }),
    );
  });

  it('R61: agent:configure users may always Clear', () => {
    const wrapper = mountDrawer(ADMIN);
    expect(
      wrapper.find('[data-test="clear-overlay"]').attributes('disabled'),
    ).toBeUndefined();
    expect(clearTip(wrapper)).toBe('');
  });

  it('shows the R57 secrets notice', () => {
    expect(mountDrawer().find('[data-test="secrets-notice"]').text()).toContain(
      '${env:NAME}',
    );
  });
  it('disables Save during a conflict and can reload the latest revision when it failed to load', async () => {
    const getConfig = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ...configRev7, revision: 8 });
    api.current = makeApi({
      getConfig,
      putConfig: vi.fn().mockRejectedValue(
        new AgentConfigApiError({
          kind: 'conflict',
          status: 409,
          message: 'c',
          currentRevision: 8,
        }),
      ),
    });
    const wrapper = mountDrawer();
    await toReview(wrapper);
    await wrapper.find('[data-test="save-comment"]').setValue('keep me');
    await wrapper.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(
      wrapper.find('[data-test="save-config"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[data-test="conflict-keep"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.find('[data-test="conflict-reload"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="conflict-keep"]').trigger('click');
    await flushPromises();
    // The comment survives the conflict round trip.
    expect(
      (
        wrapper.find('[data-test="save-comment"]')
          .element as HTMLTextAreaElement
      ).value,
    ).toBe('keep me');
    expect(
      wrapper.find('[data-test="save-config"]').attributes('disabled'),
    ).toBeUndefined();
  });
  it('keeps Review disabled while the instance files are loading', async () => {
    const wrapper = mountDrawer();
    await wrapper.setProps({ detailsLoading: true });
    (wrapper.vm as unknown as Exposed).draft.set('/verbosity', 2);
    await flushPromises();
    expect(
      wrapper.find('[data-test="review-changes"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.setProps({ detailsLoading: false });
    expect(
      wrapper.find('[data-test="review-changes"]').attributes('disabled'),
    ).toBeUndefined();
  });
});
