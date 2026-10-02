// Structured policy_data view / editor: types, masked and ${env:} values, key round-trip,
// merge-patch semantics (null deletes a file key, arrays replace wholesale, masks are never
// copied) and the sync with the raw JSON editor.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigDoc } from '@/types/agent-config';
import {
  baseConfig,
  configRev7,
  instanceDetailA,
} from '@/composables/agent-config/__tests__/fixtures';
import { clone } from '@/utils/agent-config/merge-patch';
import {
  ADMIN,
  READER,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

import PolicyDataEditor from '../effective/PolicyDataEditor.vue';
import SelectButton from '@/volt/SelectButton.vue';
import PluginSummaryCard from '../PluginSummaryCard.vue';

const POLICY_DATA = {
  MaxAuthTries: 4,
  'allowed-users': ['root', 'admin'],
  nested: { Deep_Key: { level: 2, enabled: true, more: { a: 1 } } },
  api_token: '••••',
  banner: 'Hello ${env:BANNER}!',
  nothing: null,
  big: Array.from({ length: 60 }, (_, i) => i),
};

function baseWith(policyData: Record<string, unknown>): ConfigDoc {
  const b = clone(baseConfig);
  b.plugins!['local-ssh']!.policy_data = policyData;
  return b;
}

async function mountEditor(perms = ADMIN) {
  const base = baseWith(POLICY_DATA);
  const api = fakeApi({
    getConfig: vi.fn().mockResolvedValue({ ...configRev7, overlay: {} }),
    getRevision: vi.fn().mockResolvedValue({ ...configRev7, overlay: {} }),
    getInstance: vi
      .fn()
      .mockResolvedValue({ ...instanceDetailA, base, effective: base }),
  });
  const out: { ws?: ConfigWorkspace } = {};
  const host = workspaceHost(
    api,
    PolicyDataEditor,
    () => ({ plugin: 'local-ssh' }),
    out,
  );
  const wrapper = mount(host, {
    global: globalWith(piniaWith(perms)),
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

const pd = (ws: ConfigWorkspace) =>
  ws.draft.overlay.value.plugins?.['local-ssh']?.policy_data as
    | Record<string, unknown>
    | undefined;
const node = (w: VueWrapper, path: string) =>
  w.find(`[data-test="pd-node-${path}"]`);

async function editScalar(
  w: VueWrapper,
  path: string,
  value: string,
  type?: string,
) {
  await w.find(`[data-test="pd-edit-${path}"]`).trigger('click');
  const form = w.find(`[data-test="pd-edit-form-${path}"]`);
  if (type) await form.find('[data-test="pd-edit-type"]').setValue(type);
  await form.find('[data-test="pd-edit-value"]').setValue(value);
  await form.trigger('submit');
}

describe('structured policy_data editor', () => {
  beforeEach(() => resetAgentDrafts());

  it('renders types, masked values and ${env:} references distinctly', async () => {
    const { wrapper } = await mountEditor();
    const type = (p: string) =>
      wrapper.find(`[data-test="pd-type-${p}"]`).text();
    expect(type('MaxAuthTries')).toBe('number');
    expect(type('allowed-users')).toBe('array');
    expect(type('nested')).toBe('object');
    expect(type('nothing')).toBe('null');
    expect(type('banner')).toBe('string');
    expect(node(wrapper, 'allowed-users').text()).toContain('2 items');
    expect(
      node(wrapper, 'api_token').find('[data-test="pd-masked"]').exists(),
    ).toBe(true);
    const banner = node(wrapper, 'banner');
    expect(banner.find('[data-test="pd-env"]').text()).toBe('${env:BANNER}');
    expect(
      banner.find('[data-test="pd-env-pill"]').attributes('aria-label'),
    ).toContain('resolved only in plugin config values');
    wrapper.unmount();
  });

  it('collapses deep and large containers, and pages long lists', async () => {
    const { wrapper } = await mountEditor();
    // nested (depth 0) and Deep_Key (depth 1) are open; `more` (depth 2) is collapsed.
    expect(node(wrapper, 'nested/Deep_Key/level').exists()).toBe(true);
    const more = wrapper.find('[data-test="pd-toggle-nested/Deep_Key/more"]');
    expect(more.attributes('aria-expanded')).toBe('false');
    expect(node(wrapper, 'nested/Deep_Key/more/a').exists()).toBe(false);
    await more.trigger('click');
    expect(node(wrapper, 'nested/Deep_Key/more/a').exists()).toBe(true);
    // 60 items > COLLAPSE_SIZE: collapsed; then 50 shown with "Show 10 more".
    const big = wrapper.find('[data-test="pd-toggle-big"]');
    expect(big.attributes('aria-expanded')).toBe('false');
    await big.trigger('click');
    expect(node(wrapper, 'big/49').exists()).toBe(true);
    expect(node(wrapper, 'big/50').exists()).toBe(false);
    await wrapper.find('[data-test="pd-show-all-big"]').trigger('click');
    expect(node(wrapper, 'big/59').exists()).toBe(true);
    wrapper.unmount();
  });

  it('edits a scalar: the full target is written, keys verbatim, the mask omitted', async () => {
    const { wrapper, ws } = await mountEditor();
    await editScalar(wrapper, 'MaxAuthTries', '6');
    const patch = pd(ws)!;
    expect(patch.MaxAuthTries).toBe(6);
    expect(patch.nested).toEqual(POLICY_DATA.nested);
    expect(patch['allowed-users']).toEqual(['root', 'admin']);
    // An untouched masked secret is never copied (the host keeps its value).
    expect('api_token' in patch).toBe(false);
    expect(Object.keys(patch)).toEqual(
      expect.arrayContaining(['MaxAuthTries', 'allowed-users', 'nested']),
    );
    expect(Object.keys(patch.nested as object)).toEqual(['Deep_Key']);
    wrapper.unmount();
  });

  it('changes types and rejects invalid numbers', async () => {
    const { wrapper, ws } = await mountEditor();
    await wrapper.find('[data-test="pd-edit-MaxAuthTries"]').trigger('click');
    const form = wrapper.find('[data-test="pd-edit-form-MaxAuthTries"]');
    await form.find('[data-test="pd-edit-value"]').setValue('lots');
    expect(form.find('[data-test="pd-edit-error"]').text()).toBe(
      'Enter a number',
    );
    // To a string: pre-filled with the converted value.
    await form.find('[data-test="pd-edit-type"]').setValue('string');
    await form.find('[data-test="pd-edit-value"]').setValue('4');
    await form.trigger('submit');
    expect(pd(ws)!.MaxAuthTries).toBe('4');

    await editScalar(wrapper, 'nested/Deep_Key/enabled', 'false');
    expect(
      (pd(ws)!.nested as { Deep_Key: { enabled: boolean } }).Deep_Key.enabled,
    ).toBe(false);

    // A scalar becomes a list (wrapped), and back.
    await wrapper.find('[data-test="pd-edit-banner"]').trigger('click');
    const bf = wrapper.find('[data-test="pd-edit-form-banner"]');
    await bf.find('[data-test="pd-edit-type"]').setValue('array');
    await bf.trigger('submit');
    expect(pd(ws)!.banner).toEqual(['Hello ${env:BANNER}!']);
    // Object members cannot become null (that would delete the key).
    await wrapper.find('[data-test="pd-edit-MaxAuthTries"]').trigger('click');
    const options = wrapper
      .find(
        '[data-test="pd-edit-form-MaxAuthTries"] [data-test="pd-edit-type"]',
      )
      .findAll('option')
      .map((o) => o.text());
    expect(options).not.toContain('null');
    wrapper.unmount();
  });

  it('removing a file key writes null (RFC 7396 delete); adding keys keeps their case', async () => {
    const { wrapper, ws } = await mountEditor();
    await wrapper.find('[data-test="pd-remove-banner"]').trigger('click');
    expect(pd(ws)!.banner).toBeNull();
    expect(node(wrapper, 'banner').exists()).toBe(false);

    await wrapper.find('[data-test="pd-add-root"]').trigger('click');
    const form = wrapper.find('[data-test="pd-add-form-root"]');
    await form.find('[data-test="pd-new-key"]').setValue('MaxAuthTries');
    expect(form.find('[data-test="pd-add-error"]').text()).toBe(
      'This key exists',
    );
    await form.find('[data-test="pd-new-key"]').setValue('New-Key_camelCase');
    await form.find('[data-test="pd-new-type"]').setValue('number');
    await form.find('[data-test="pd-new-value"]').setValue('7');
    await form.trigger('submit');
    expect(pd(ws)!['New-Key_camelCase']).toBe(7);

    // Removing a masked key nulls it too (the host's file has it).
    await wrapper.find('[data-test="pd-remove-api_token"]').trigger('click');
    expect(pd(ws)!.api_token).toBeNull();
    wrapper.unmount();
  });

  it('arrays: add / remove items, written wholesale; arrays may hold null', async () => {
    const { wrapper, ws } = await mountEditor();
    await wrapper.find('[data-test="pd-add-allowed-users"]').trigger('click');
    const form = wrapper.find('[data-test="pd-add-form-allowed-users"]');
    expect(form.find('[data-test="pd-new-key"]').exists()).toBe(false);
    await form.find('[data-test="pd-new-value"]').setValue('ops');
    await form.trigger('submit');
    expect(pd(ws)!['allowed-users']).toEqual(['root', 'admin', 'ops']);

    await wrapper
      .find('[data-test="pd-remove-allowed-users/0"]')
      .trigger('click');
    expect(pd(ws)!['allowed-users']).toEqual(['admin', 'ops']);

    await wrapper.find('[data-test="pd-add-allowed-users"]').trigger('click');
    const again = wrapper.find('[data-test="pd-add-form-allowed-users"]');
    await again.find('[data-test="pd-new-type"]').setValue('null');
    await again.trigger('submit');
    expect(pd(ws)!['allowed-users']).toEqual(['admin', 'ops', null]);
    wrapper.unmount();
  });

  it('a masked value needs a new value; typing one replaces it', async () => {
    const { wrapper, ws } = await mountEditor();
    await wrapper.find('[data-test="pd-edit-api_token"]').trigger('click');
    const form = wrapper.find('[data-test="pd-edit-form-api_token"]');
    const input = form.find('[data-test="pd-edit-value"]');
    expect((input.element as HTMLInputElement).value).toBe('');
    expect(input.attributes('placeholder')).toBe('masked; type a new value');
    expect(form.find('[data-test="pd-edit-error"]').exists()).toBe(true);
    await input.setValue('${env:TOKEN}');
    await form.trigger('submit');
    expect(pd(ws)!.api_token).toBe('${env:TOKEN}');
    wrapper.unmount();
  });

  it('keeps the raw JSON editor in sync both ways', async () => {
    const { wrapper, ws } = await mountEditor();
    await editScalar(wrapper, 'MaxAuthTries', '9');
    const mode = wrapper.findComponent(SelectButton);
    mode.vm.$emit('update:modelValue', 'raw');
    await flushPromises();
    const textarea = wrapper.find('textarea');
    const raw = JSON.parse((textarea.element as HTMLTextAreaElement).value);
    expect(raw.MaxAuthTries).toBe(9);
    expect(raw.api_token).toBe('••••');

    await textarea.setValue('{"OnlyKey": {"x": [1, null]}}');
    const patch = pd(ws)!;
    expect(patch.OnlyKey).toEqual({ x: [1, null] });
    expect(patch.MaxAuthTries).toBeNull();
    expect(patch.nested).toBeNull();

    // Invalid JSON: the structured view is unavailable until it is fixed.
    await textarea.setValue('{nope');
    expect(wrapper.find('[data-test="policy-data-error"]').exists()).toBe(true);
    mode.vm.$emit('update:modelValue', 'structured');
    await flushPromises();
    expect(wrapper.find('[data-test="policy-data-structured"]').exists()).toBe(
      false,
    );
    await wrapper.find('textarea').setValue('{"OnlyKey": {"x": [2]}}');
    mode.vm.$emit('update:modelValue', 'structured');
    await flushPromises();
    expect(node(wrapper, 'OnlyKey/x/0').text()).toContain('2');
    expect(node(wrapper, 'MaxAuthTries').exists()).toBe(false);

    // "Use the file value" drops the override.
    await wrapper.find('[data-test="policy-data-reset"]').trigger('click');
    expect(pd(ws)).toBeUndefined();
    expect(node(wrapper, 'MaxAuthTries').exists()).toBe(true);
    wrapper.unmount();
  });
});

describe('policy_data on the plugin card', () => {
  beforeEach(() => resetAgentDrafts());

  it('is a read-only structured view for readers', () => {
    const plugin = { source: 'ghcr.io/x/a:v1', policy_data: POLICY_DATA };
    const card = mount(PluginSummaryCard, {
      props: {
        name: 'a',
        plugin,
        base: null,
        overlay: null,
      },
      global: globalWith(piniaWith(READER)),
    });
    const view = card.find('[data-test="policy-data-view-a"]');
    expect(view.exists()).toBe(true);
    expect(view.find('[data-test="pd-type-MaxAuthTries"]').text()).toBe(
      'number',
    );
    expect(view.find('[data-test^="pd-edit-"]').exists()).toBe(false);
    expect(view.find('[data-test^="pd-add-"]').exists()).toBe(false);
    expect(card.text()).toContain('7 keys');
  });
});
