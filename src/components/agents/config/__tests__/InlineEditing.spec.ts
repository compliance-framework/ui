// R69 / R71: inline pencils on the Effective view write to the shared pending-changes draft;
// fields show editable / restricted / forbidden states.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flushPromises,
  mount,
  type VueWrapper,
  enableAutoUnmount,
} from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import type { Agent } from '@/types/agents';
import { instancesMixed } from '@/composables/agent-config/__tests__/fixtures';
import { ADMIN, READER, fakeApi, globalWith, piniaWith } from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
// Confirmations accept immediately.
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
import Select from '@/volt/Select.vue';

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

async function mountTab(perms: Record<string, string[]> = ADMIN) {
  const wrapper = mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(perms)),
    attachTo: document.body,
  });
  await flushPromises();
  const ws = (wrapper.vm as unknown as { ws: ConfigWorkspace }).ws;
  return { wrapper, ws };
}

const sel = (ptr: string) => `[data-test="field-${ptr}"]`;

async function openEditor(wrapper: VueWrapper, ptr: string) {
  await wrapper.find(`[data-test="edit-${ptr}"]`).trigger('click');
  return wrapper.find(`[data-test="editor-${ptr}"]`);
}

describe('inline editing on the Effective view (R69)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi();
  });

  it('schedule: validates, applies to the draft, and offers file value / agent default', async () => {
    const { wrapper, ws } = await mountTab();
    const ptr = '/plugins/local-ssh/schedule';
    let editor = await openEditor(wrapper, ptr);
    await editor.find('[data-test="scalar-input"]').setValue('not a cron');
    expect(editor.find('[data-test="scalar-error"]').text()).toContain(
      'Invalid schedule',
    );
    expect(
      editor.find('[data-test="scalar-apply"]').attributes('disabled'),
    ).toBeDefined();
    await editor.find('[data-test="scalar-input"]').setValue('0 * * * *');
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.schedule).toBe(
      '0 * * * *',
    );
    expect(wrapper.find(`[data-test="pending-${ptr}"]`).text()).toContain(
      '0 * * * *',
    );
    editor = await openEditor(wrapper, ptr);
    await editor.find('[data-test="scalar-agent-default"]').trigger('click');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.schedule).toBeNull();
    editor = await openEditor(wrapper, ptr);
    await editor.find('[data-test="scalar-file-value"]').trigger('click');
    expect(
      ws.draft.overlay.value.plugins?.['local-ssh'] &&
        'schedule' in ws.draft.overlay.value.plugins['local-ssh']!,
    ).toBe(false);
  });

  it('booleans, verbosity and duration use small editors (R56: file value omits)', async () => {
    const { wrapper, ws } = await mountTab();
    let editor = await openEditor(wrapper, '/plugins/local-ssh/enabled');
    await editor.findComponent(Select).vm.$emit('update:modelValue', false);
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.enabled).toBe(false);

    editor = await openEditor(wrapper, '/verbosity');
    await editor.findComponent(Select).vm.$emit('update:modelValue', 2);
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.verbosity).toBe(2);
    editor = await openEditor(wrapper, '/verbosity');
    await editor
      .findComponent(Select)
      .vm.$emit('update:modelValue', '__file__');
    await editor.find('form').trigger('submit');
    expect('verbosity' in ws.draft.overlay.value).toBe(false);

    editor = await openEditor(wrapper, '/agent_evidence/interval');
    await editor.find('[data-test="scalar-input"]').setValue('-5m');
    expect(editor.find('[data-test="scalar-error"]').exists()).toBe(true);
    await editor.find('[data-test="scalar-input"]').setValue('15m');
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.agent_evidence?.interval).toBe('15m');
  });

  it('Apply on an untouched field does not pin the file value', async () => {
    const { wrapper, ws } = await mountTab();
    let editor = await openEditor(wrapper, '/plugins/local-ssh/enabled');
    await editor.find('form').trigger('submit');
    editor = await openEditor(wrapper, '/agent_evidence/interval');
    await editor.find('form').trigger('submit');
    expect(ws.draft.isDirty.value).toBe(false);
  });

  it('config keys: per-key editor with Remove, and never pre-fills a masked value (R25)', async () => {
    const { wrapper, ws } = await mountTab();
    const editor = await openEditor(wrapper, '/plugins/local-ssh/config/port');
    await editor.find('[data-test="scalar-input"]').setValue('2200');
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.config?.port).toBe(
      '2200',
    );
    const again = await openEditor(wrapper, '/plugins/local-ssh/config/port');
    await again.find('[data-test="scalar-remove"]').trigger('click');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.config?.port).toBe(
      null,
    );
  });

  it('labels, policy data and policy assignment use the map / per-value / list editors', async () => {
    const { wrapper, ws } = await mountTab();
    let editor = await openEditor(wrapper, '/plugins/local-ssh/labels');
    await editor.find('[data-test="kv-new-key"]').setValue('team');
    await editor.find('[data-test="kv-new-value"]').setValue('sec');
    await editor.find('form').trigger('submit');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.labels).toEqual({
      team: 'sec',
    });
    await editor
      .find('[data-test="done-/plugins/local-ssh/labels"]')
      .trigger('click');

    // policy_data: each value has its own pencil (no whole-object editor).
    const pdPtr = '/plugins/local-ssh/policy_data/max_auth_tries';
    await wrapper.find(`[data-test="pd-edit-${pdPtr}"]`).trigger('click');
    const pdForm = wrapper.find(`[data-test="pd-edit-form-${pdPtr}"]`);
    await pdForm.find('[data-test="pd-edit-value"]').setValue('5');
    await pdForm.trigger('submit');
    expect(ws.draft.overlay.value.plugins?.['local-ssh']?.policy_data).toEqual({
      max_auth_tries: 5,
    });

    editor = await openEditor(wrapper, '/plugins/ubuntu-packages/policies');
    await editor
      .find('[data-test="new-policy"]')
      .setValue('ghcr.io/compliance-framework/plugin-extra-policies:v1');
    await editor.find('form').trigger('submit');
    expect(
      ws.draft.overlay.value.plugins?.['ubuntu-packages']?.policies,
    ).toContain('ghcr.io/compliance-framework/plugin-extra-policies:v1');
  });

  it('removes and restores a plugin as a pending change', async () => {
    const { wrapper, ws } = await mountTab();
    await wrapper
      .find(
        '[data-test="plugin-card-ubuntu-packages"] [data-test="remove-plugin"]',
      )
      .trigger('click');
    expect(ws.draft.overlay.value.plugins?.['ubuntu-packages']).toBeNull();
    const card = wrapper.find('[data-test="plugin-card-ubuntu-packages"]');
    expect(card.find('[data-test="pending-removal"]').exists()).toBe(true);
    await card.find('[data-test="plugin-undo-removal"]').trigger('click');
    expect(ws.draft.isDirty.value).toBe(false);
  });
});

describe('field states (R71)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi();
  });

  it('forbidden fields are locked without a pencil', async () => {
    const { wrapper } = await mountTab();
    const locked = wrapper.find('[data-test="locked-keys"]');
    expect(locked.findAll('[data-state="forbidden"]').length).toBe(8);
    expect(locked.find('[data-test^="edit-"]').exists()).toBe(false);
  });

  it('none apply: read-only with the reasons; some apply: pencil + shield', async () => {
    // Fixture fleet (fresh, reported): ip-a, ip-b, ip-f, ip-g in apply_safe with
    // `local-ssh:port` / `timeout` flags, ip-c in report mode. ip-d (stale) and ip-e (never
    // reported) are not counted.
    const { wrapper } = await mountTab();
    const password = wrapper.find(sel('/plugins/local-ssh/config/password'));
    expect(password.attributes('data-state')).toBe('readonly');
    expect(
      password
        .find('[data-test="edit-/plugins/local-ssh/config/password"]')
        .exists(),
    ).toBe(false);
    expect(password.find('[data-test="field-restricted"]').exists()).toBe(
      false,
    );
    const why = password
      .find('[data-test="field-readonly"]')
      .attributes('aria-label');
    expect(why).toContain('no reporting instance would apply');
    expect(why).toContain('overridable_config_flags');
    expect(why).toContain('ip-a, ip-b, ip-f, ip-g');
    expect(why).toContain('report-only mode');
    expect(why).not.toContain('ip-d');

    // `port` is overridable on every apply_safe instance; only ip-c (report) won't apply it.
    const port = wrapper.find(sel('/plugins/local-ssh/config/port'));
    expect(port.attributes('data-state')).toBe('restricted');
    expect(
      port.find('[data-test="edit-/plugins/local-ssh/config/port"]').exists(),
    ).toBe(true);
    const shield = port
      .find('[data-test="field-restricted"]')
      .attributes('aria-label');
    expect(shield).toContain('1 of 5');
    expect(shield).toContain('ip-c');

    // The config map editor shows the read-only key locked and disabled.
    const editor = await openEditor(wrapper, '/plugins/local-ssh/config');
    const row = editor.find('[data-row="password"]');
    // Row actions sit next to the key, before the value input.
    const order = Array.from(row.element.children).map(
      (c) => c.getAttribute('data-test') ?? c.tagName,
    );
    expect(order.indexOf('kv-actions')).toBeLessThan(order.indexOf('INPUT'));
    expect(row.find('[data-test="kv-lock"]').exists()).toBe(true);
    expect(row.find('input').attributes('disabled')).toBeDefined();
    expect(
      editor
        .find('[data-row="port"] [data-test="kv-restricted"]')
        .attributes('aria-label'),
    ).toContain('ip-c');
  });

  it('all apply: pencil only, no shield', async () => {
    api.current = fakeApi({
      listInstances: vi.fn().mockResolvedValue({
        ...instancesMixed,
        items: instancesMixed.items.filter((i) => i.mode !== 'report'),
      }),
    });
    const { wrapper } = await mountTab();
    const port = wrapper.find(sel('/plugins/local-ssh/config/port'));
    expect(port.attributes('data-state')).toBe('editable');
    expect(port.find('[data-test="field-restricted"]').exists()).toBe(false);
    expect(
      port.find('[data-test="edit-/plugins/local-ssh/config/port"]').exists(),
    ).toBe(true);
  });

  it('no reporting instance yet: editable without shields', async () => {
    api.current = fakeApi({
      listInstances: vi.fn().mockResolvedValue({
        items: [],
        meta: instancesMixed.meta,
      }),
    });
    const tab = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith(ADMIN)),
    });
    await flushPromises();
    const ws = (tab.vm as unknown as { ws: ConfigWorkspace }).ws;
    expect(ws.accessAt('/plugins/local-ssh/config/password').state).toBe(
      'editable',
    );
    expect(ws.canEditPointer('/plugins/local-ssh/config/password')).toBe(true);
    expect(ws.canEditPointer('/api/url')).toBe(false);
  });

  it('a reader gets no pencils and no plugin actions', async () => {
    const { wrapper } = await mountTab(READER);
    expect(
      wrapper.find('[data-test="edit-/plugins/local-ssh/policies"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-test="edit-/verbosity"]').exists()).toBe(false);
    expect(
      wrapper.find('[data-test="edit-/plugins/local-ssh/schedule"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-test="remove-plugin"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="add-plugin"]').exists()).toBe(false);
    // Access hints describe what an edit would do: hidden from readers.
    expect(wrapper.find('[data-test="field-restricted"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="field-readonly"]').exists()).toBe(false);
  });
});
