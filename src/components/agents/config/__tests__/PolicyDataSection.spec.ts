// policy_data on the Effective view: a structured tree without type labels, edited one key /
// list item at a time (minimal merge patch; a list item edit is one element change), masked
// and ${env:} values shown distinctly, and a raw JSON view that also records only real changes.
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

import PolicyDataSection from '../effective/PolicyDataSection.vue';
import PluginSummaryCard from '../PluginSummaryCard.vue';
import SelectButton from '@/volt/SelectButton.vue';

const PD = '/plugins/local-ssh/policy_data';
const POLICY_DATA = {
  MaxAuthTries: 4,
  'allowed-users': ['root', 'admin'],
  nested: { Deep_Key: { level: 2, enabled: true, more: { a: 1 } } },
  rules: [
    { id: 'r1', on: true },
    { id: 'r2', on: false },
  ],
  api_token: '••••',
  banner: 'Hello ${env:BANNER}!',
  nothing: null,
  big: Array.from({ length: 60 }, (_, i) => i),
};

async function mountSection(
  opts: { perms?: Record<string, string[]>; overlay?: object } = {},
) {
  const base = clone(baseConfig) as ConfigDoc;
  base.plugins!['local-ssh']!.policy_data = clone(POLICY_DATA);
  const saved = { ...configRev7, overlay: opts.overlay ?? {} };
  const api = fakeApi({
    getConfig: vi.fn().mockResolvedValue(saved),
    getRevision: vi.fn().mockResolvedValue(saved),
    getInstance: vi
      .fn()
      .mockResolvedValue({ ...instanceDetailA, base, effective: base }),
  });
  const out: { ws?: ConfigWorkspace } = {};
  const host = workspaceHost(
    api,
    PolicyDataSection,
    () => ({
      plugin: 'local-ssh',
      reported: POLICY_DATA,
      provenance: 'file',
    }),
    out,
  );
  const wrapper = mount(host, {
    global: globalWith(piniaWith(opts.perms ?? ADMIN)),
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

const pd = (ws: ConfigWorkspace) =>
  ws.draft.overlay.value.plugins?.['local-ssh']?.policy_data as
    | Record<string, unknown>
    | undefined;
const node = (w: VueWrapper, rel: string) =>
  w.find(`[data-test="pd-node-${PD}/${rel}"]`);
const btn = (w: VueWrapper, what: string, rel: string) =>
  w.find(`[data-test="pd-${what}-${PD}/${rel}"]`);

async function editValue(w: VueWrapper, rel: string, value: string | boolean) {
  await btn(w, 'edit', rel).trigger('click');
  const form = btn(w, 'edit-form', rel);
  const input = form.find('[data-test="pd-edit-value"]');
  if (typeof value === 'boolean') await input.setValue(value);
  else await input.setValue(value);
  await form.trigger('submit');
}

describe('policy_data section: display', () => {
  beforeEach(() => resetAgentDrafts());

  it('shows no type labels or type selectors; masked and ${env:} values stand out', async () => {
    const { wrapper } = await mountSection();
    expect(wrapper.find('[data-test^="pd-type-"]').exists()).toBe(false);
    for (const t of ['number', 'string', 'boolean', 'object', 'array']) {
      expect(wrapper.text()).not.toMatch(new RegExp(`\\b${t}\\b`));
    }
    expect(node(wrapper, 'MaxAuthTries').text()).toContain('4');
    expect(node(wrapper, 'allowed-users').text()).toContain('2 items');
    expect(
      node(wrapper, 'api_token').find('[data-test="pd-masked"]').exists(),
    ).toBe(true);
    const banner = node(wrapper, 'banner');
    expect(banner.find('[data-test="pd-env"]').text()).toBe('${env:BANNER}');
    expect(
      banner.find('[data-test="pd-env-pill"]').attributes('aria-label'),
    ).toContain('resolved only in plugin config values');
    // A null has no editor (its type changes in the raw view).
    expect(btn(wrapper, 'edit', 'nothing').exists()).toBe(false);
    await btn(wrapper, 'edit', 'MaxAuthTries').trigger('click');
    expect(wrapper.find('select').exists()).toBe(false);
    wrapper.unmount();
  });

  it('collapses deep and large containers, and pages long lists', async () => {
    const { wrapper } = await mountSection();
    expect(node(wrapper, 'nested/Deep_Key/level').exists()).toBe(true);
    const more = btn(wrapper, 'toggle', 'nested/Deep_Key/more');
    expect(more.attributes('aria-expanded')).toBe('false');
    await more.trigger('click');
    expect(node(wrapper, 'nested/Deep_Key/more/a').exists()).toBe(true);
    const big = btn(wrapper, 'toggle', 'big');
    expect(big.attributes('aria-expanded')).toBe('false');
    await big.trigger('click');
    expect(node(wrapper, 'big/49').exists()).toBe(true);
    expect(node(wrapper, 'big/50').exists()).toBe(false);
    await btn(wrapper, 'show-all', 'big').trigger('click');
    expect(node(wrapper, 'big/59').exists()).toBe(true);
    wrapper.unmount();
  });

  it('is read-only for readers (on the card too)', async () => {
    const { wrapper } = await mountSection({ perms: READER });
    expect(wrapper.find('[data-test^="pd-edit-"]').exists()).toBe(false);
    expect(wrapper.find('[data-test^="pd-remove-"]').exists()).toBe(false);
    expect(wrapper.find('[data-test^="pd-add-"]').exists()).toBe(false);
    expect(wrapper.findComponent(SelectButton).exists()).toBe(false);
    wrapper.unmount();

    const card = mount(PluginSummaryCard, {
      props: {
        name: 'a',
        plugin: { source: 'ghcr.io/x/a:v1', policy_data: POLICY_DATA },
        base: null,
        overlay: null,
      },
      global: globalWith(piniaWith(READER)),
    });
    expect(card.find('[data-test="policy-data-view-a"]').text()).toContain(
      'MaxAuthTries',
    );
    expect(card.text()).toContain('8 keys');
  });
});

describe('policy_data section: per-element edits (minimal patch)', () => {
  beforeEach(() => resetAgentDrafts());

  it('a scalar edit writes only that key and keeps its type', async () => {
    const { wrapper, ws } = await mountSection();
    await btn(wrapper, 'edit', 'MaxAuthTries').trigger('click');
    const form = btn(wrapper, 'edit-form', 'MaxAuthTries');
    await form.find('[data-test="pd-edit-value"]').setValue('lots');
    expect(form.find('[data-test="pd-edit-error"]').text()).toBe(
      'Enter a number',
    );
    await form.find('[data-test="pd-edit-value"]').setValue('6');
    await form.trigger('submit');
    expect(pd(ws)).toEqual({ MaxAuthTries: 6 });
    expect(ws.draft.changedPaths.value).toEqual([`${PD}/MaxAuthTries`]);
    expect(btn(wrapper, 'pending', 'MaxAuthTries').exists()).toBe(true);
    // Setting it back to the file value drops the entry.
    await editValue(wrapper, 'MaxAuthTries', '4');
    expect(ws.draft.isDirty.value).toBe(false);
    wrapper.unmount();
  });

  it('a nested key and a boolean (checkbox) are written at their own pointer', async () => {
    const { wrapper, ws } = await mountSection();
    await editValue(wrapper, 'nested/Deep_Key/enabled', false);
    expect(pd(ws)).toEqual({ nested: { Deep_Key: { enabled: false } } });
    await editValue(wrapper, 'banner', 'Bye');
    expect(pd(ws)).toEqual({
      nested: { Deep_Key: { enabled: false } },
      banner: 'Bye',
    });
    expect(ws.draft.changedPaths.value).toHaveLength(2);
    wrapper.unmount();
  });

  it('removing a key writes null; adding keys keeps their case and JSON type', async () => {
    const { wrapper, ws } = await mountSection();
    await btn(wrapper, 'remove', 'banner').trigger('click');
    expect(pd(ws)).toEqual({ banner: null });
    expect(node(wrapper, 'banner').exists()).toBe(false);

    await wrapper.find('[data-test="pd-add-root"]').trigger('click');
    const form = wrapper.find('[data-test="pd-add-form-root"]');
    await form.find('[data-test="pd-new-key"]').setValue('MaxAuthTries');
    expect(form.find('[data-test="pd-add-error"]').text()).toBe(
      'This key exists',
    );
    await form.find('[data-test="pd-new-key"]').setValue('New-Key_camelCase');
    await form.find('[data-test="pd-new-value"]').setValue('7');
    await form.trigger('submit');
    expect(pd(ws)).toEqual({ banner: null, 'New-Key_camelCase': 7 });

    // A key inside a nested object.
    await btn(wrapper, 'add', `nested/Deep_Key`).trigger('click');
    const nf = btn(wrapper, 'add-form', 'nested/Deep_Key');
    await nf.find('[data-test="pd-new-key"]').setValue('note');
    await nf.find('[data-test="pd-new-value"]').setValue('plain text');
    await nf.trigger('submit');
    expect(pd(ws)!.nested).toEqual({ Deep_Key: { note: 'plain text' } });
    wrapper.unmount();
  });

  it('a list item edit writes the whole list but is one element change, undoable on the item', async () => {
    const { wrapper, ws } = await mountSection();
    await editValue(wrapper, 'allowed-users/1', 'ops');
    expect(pd(ws)).toEqual({ 'allowed-users': ['root', 'ops'] });
    expect(ws.draft.changedPaths.value).toEqual([`${PD}/allowed-users/1`]);
    expect(btn(wrapper, 'pending', 'allowed-users/1').exists()).toBe(true);
    expect(btn(wrapper, 'pending', 'allowed-users/0').exists()).toBe(false);
    await btn(wrapper, 'undo', 'allowed-users/1').trigger('click');
    expect(ws.draft.isDirty.value).toBe(false);

    // Add an item: the list's item type (string) is kept, even for "5".
    await btn(wrapper, 'add', 'allowed-users').trigger('click');
    const form = btn(wrapper, 'add-form', 'allowed-users');
    expect(form.find('[data-test="pd-new-key"]').exists()).toBe(false);
    await form.find('[data-test="pd-new-value"]').setValue('5');
    await form.trigger('submit');
    expect(pd(ws)!['allowed-users']).toEqual(['root', 'admin', '5']);
    expect(ws.draft.changedPaths.value).toEqual([`${PD}/allowed-users/2`]);

    // Remove an item.
    await btn(wrapper, 'remove', 'allowed-users/0').trigger('click');
    expect(pd(ws)!['allowed-users']).toEqual(['admin', '5']);
    expect(ws.draft.changedPaths.value).toHaveLength(2);
    wrapper.unmount();
  });

  it('a key inside a list item rewrites the list (never a pointer into the array)', async () => {
    const { wrapper, ws } = await mountSection();
    await editValue(wrapper, 'rules/1/on', true);
    expect(pd(ws)).toEqual({
      rules: [
        { id: 'r1', on: true },
        { id: 'r2', on: true },
      ],
    });
    expect(ws.draft.changedPaths.value).toEqual([`${PD}/rules/1`]);
    wrapper.unmount();
  });

  it('a masked value needs a new value; an untouched one never reaches the overlay', async () => {
    const { wrapper, ws } = await mountSection();
    await btn(wrapper, 'edit', 'api_token').trigger('click');
    const form = btn(wrapper, 'edit-form', 'api_token');
    const input = form.find('[data-test="pd-edit-value"]');
    expect((input.element as HTMLInputElement).value).toBe('');
    expect(input.attributes('placeholder')).toBe('masked; type a new value');
    expect(form.find('[data-test="pd-edit-error"]').exists()).toBe(true);
    await input.setValue('${env:TOKEN}');
    await form.trigger('submit');
    expect(pd(ws)).toEqual({ api_token: '${env:TOKEN}' });
    wrapper.unmount();
  });

  it('composes with entries the saved revision already has', async () => {
    const { wrapper, ws } = await mountSection({
      overlay: {
        verbosity: 1,
        plugins: { 'local-ssh': { policy_data: { MaxAuthTries: 9 } } },
      },
    });
    expect(node(wrapper, 'MaxAuthTries').text()).toContain('9');
    await editValue(wrapper, 'banner', 'x');
    expect(pd(ws)).toEqual({ MaxAuthTries: 9, banner: 'x' });
    expect(ws.draft.overlay.value.verbosity).toBe(1);
    expect(ws.draft.changedPaths.value).toEqual([`${PD}/banner`]);
    wrapper.unmount();
  });
});

describe('policy_data section: raw JSON view', () => {
  beforeEach(() => resetAgentDrafts());

  it('records only real changes, and stays in sync with the tree', async () => {
    const { wrapper, ws } = await mountSection();
    await editValue(wrapper, 'MaxAuthTries', '9');
    wrapper.findComponent(SelectButton).vm.$emit('update:modelValue', 'raw');
    await flushPromises();
    const textarea = wrapper.find('textarea');
    const raw = JSON.parse((textarea.element as HTMLTextAreaElement).value);
    expect(raw.MaxAuthTries).toBe(9);
    expect(raw.api_token).toBe('••••');

    // One key changed (and a type change, only possible here): one entry each.
    raw.banner = 42;
    raw['allowed-users'][0] = 'ROOT';
    await textarea.setValue(JSON.stringify(raw));
    expect(pd(ws)).toEqual({
      MaxAuthTries: 9,
      banner: 42,
      'allowed-users': ['ROOT', 'admin'],
    });
    expect(ws.draft.changedPaths.value).toEqual([
      `${PD}/MaxAuthTries`,
      `${PD}/allowed-users/0`,
      `${PD}/banner`,
    ]);

    // Deleting a key in the raw view nulls it.
    delete raw.nothing;
    await textarea.setValue(JSON.stringify(raw));
    expect(pd(ws)!.nothing).toBeNull();

    // Invalid JSON: the structured view is unavailable until it is fixed.
    await textarea.setValue('{nope');
    expect(wrapper.find('[data-test="policy-data-error"]').exists()).toBe(true);
    wrapper
      .findComponent(SelectButton)
      .vm.$emit('update:modelValue', 'structured');
    await flushPromises();
    expect(
      wrapper.find('[data-test="policy-data-view-local-ssh"]').exists(),
    ).toBe(false);
    await wrapper.find('textarea').setValue(JSON.stringify(raw));
    wrapper
      .findComponent(SelectButton)
      .vm.$emit('update:modelValue', 'structured');
    await flushPromises();
    expect(node(wrapper, 'banner').text()).toContain('42');

    // "Use the file value" drops every override.
    wrapper.findComponent(SelectButton).vm.$emit('update:modelValue', 'raw');
    await flushPromises();
    await wrapper.find('[data-test="policy-data-reset"]').trigger('click');
    expect(pd(ws)).toBeUndefined();
    wrapper.unmount();
  });
});
