// R69 / R71: inline pencils on the Effective view write to the shared pending-changes draft;
// fields show editable / restricted / forbidden states.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import type { Agent } from '@/types/agents';
import {
  ADMIN,
  POLICY_AUTHOR,
  fakeApi,
  globalWith,
  piniaWith,
} from './helpers';

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
    wrapper.unmount();
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
    wrapper.unmount();
  });

  it('Apply on an untouched field does not pin the file value', async () => {
    const { wrapper, ws } = await mountTab();
    let editor = await openEditor(wrapper, '/plugins/local-ssh/enabled');
    await editor.find('form').trigger('submit');
    editor = await openEditor(wrapper, '/agent_evidence/interval');
    await editor.find('form').trigger('submit');
    expect(ws.draft.isDirty.value).toBe(false);
    wrapper.unmount();
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
    wrapper.unmount();
  });

  it('labels, policy data and policy assignment use the map / JSON / list editors', async () => {
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

    editor = await openEditor(wrapper, '/plugins/local-ssh/policy_data');
    await editor.find('textarea').setValue('{"max_auth_tries": 5}');
    expect(
      ws.draft.overlay.value.plugins?.['local-ssh']?.policy_data,
    ).toMatchObject({ max_auth_tries: 5 });
    await editor.find('textarea').setValue('{nope');
    expect(editor.find('[data-test="policy-data-error"]').exists()).toBe(true);

    editor = await openEditor(wrapper, '/plugins/ubuntu-packages/policies');
    await editor.find('[data-test="new-policy"]').setValue('inline:ssh-tuned');
    await editor.find('form').trigger('submit');
    expect(
      ws.draft.overlay.value.plugins?.['ubuntu-packages']?.policies,
    ).toContain('inline:ssh-tuned');
    wrapper.unmount();
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
    wrapper.unmount();
  });
});

describe('field states (R71)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi();
  });

  it('forbidden fields are locked without a pencil; restricted fields name the instances', async () => {
    const { wrapper } = await mountTab();
    const locked = wrapper.find('[data-test="locked-keys"]');
    expect(locked.findAll('[data-state="forbidden"]').length).toBe(9);
    expect(locked.find('[data-test^="edit-"]').exists()).toBe(false);

    // `password` is not in any apply_safe instance's overridable_config_flags.
    const password = wrapper.find(sel('/plugins/local-ssh/config/password'));
    expect(password.attributes('data-state')).toBe('restricted');
    const shield = password.find('[data-test="field-restricted"]');
    expect(shield.attributes('aria-label')).toContain('ip-a');
    expect(shield.attributes('aria-label')).toContain(
      'overridable_config_flags',
    );
    // `port` is overridable everywhere: plain editable.
    expect(
      wrapper
        .find(sel('/plugins/local-ssh/config/port'))
        .attributes('data-state'),
    ).toBe('editable');
    expect(
      wrapper
        .find(sel('/plugins/local-ssh/config/password'))
        .find('[data-test="edit-/plugins/local-ssh/config/password"]')
        .exists(),
    ).toBe(true);
    wrapper.unmount();
  });

  it('a policy author only gets the policy-assignment pencils', async () => {
    const { wrapper } = await mountTab(POLICY_AUTHOR);
    expect(
      wrapper.find('[data-test="edit-/plugins/local-ssh/policies"]').exists(),
    ).toBe(true);
    expect(wrapper.find('[data-test="edit-/verbosity"]').exists()).toBe(false);
    expect(
      wrapper.find('[data-test="edit-/plugins/local-ssh/schedule"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-test="remove-plugin"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="add-plugin"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
