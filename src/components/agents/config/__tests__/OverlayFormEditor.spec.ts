import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { ConfigPreview } from '@/types/agent-config';
import {
  baseConfig,
  detailFor,
  instanceIds,
  instancesMixed,
  remoteConfigSafe,
} from '@/composables/agent-config/fixtures';
import OverlayFormEditor from '../editor/OverlayFormEditor.vue';
import { ADMIN, editorHarness, globalWith, piniaWith } from './helpers';

// The async CodeMirror wrappers are replaced by synchronous stubs.
vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

const a = instancesMixed.items[0];
const b = instancesMixed.items[1];
const details = [detailFor(a, {}), detailFor(b, {})];

function mountForm(opts: Partial<Parameters<typeof editorHarness>[0]> = {}) {
  const h = editorHarness({ instances: [a, b], details, ...opts });
  const pinia = piniaWith(ADMIN);
  const wrapper = mount(OverlayFormEditor, {
    global: { ...globalWith(pinia), provide: h.provide },
  });
  return { wrapper, draft: h.draft, ctx: h.ctx };
}

const card = (w: ReturnType<typeof mount>, name: string) =>
  w.find(`[data-test="plugin-editor-${name}"]`);

describe('OverlayFormEditor (U2.3)', () => {
  it('writes flags at the right pointers; clearing unsets', async () => {
    const { wrapper, draft } = mountForm();
    await wrapper.find('[data-test="evidence-interval"]').setValue('30m');
    expect(draft.overlay.value).toEqual({
      agent_evidence: { interval: '30m' },
    });
    await wrapper.find('[data-test="evidence-interval"]').setValue('');
    expect(draft.overlay.value).toEqual({});
    await wrapper.find('[data-test="evidence-enabled"]').setValue(false);
    expect(draft.overlay.value).toEqual({ agent_evidence: { enabled: false } });
    await wrapper
      .find('[data-test="reset-/agent_evidence/enabled"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({});
  });

  it('writes plugin source, schedule and enabled; shows base placeholders', async () => {
    const { wrapper, draft } = mountForm();
    const ssh = card(wrapper, 'local-ssh');
    const source = ssh.find('[data-test="plugin-source"]');
    expect(source.attributes('placeholder')).toBe(
      baseConfig.plugins!['local-ssh']!.source,
    );
    await source.setValue('ghcr.io/compliance-framework/plugin-local-ssh:v2');
    await ssh.find('[data-test="plugin-schedule"]').setValue('@hourly');
    await ssh.find('[data-test="plugin-enabled"]').setValue(false);
    expect(draft.overlay.value).toEqual({
      plugins: {
        'local-ssh': {
          source: 'ghcr.io/compliance-framework/plugin-local-ssh:v2',
          schedule: '@hourly',
          enabled: false,
        },
      },
    });
    expect(
      ssh.find('[data-test="plugin-schedule"]').attributes('placeholder'),
    ).toBe('*/5 * * * *');
    expect(ssh.find('[data-test="schedule-hint"]').text()).toBe('Every hour');
  });

  it('schedule "Use agent default" writes null; clearing omits', async () => {
    const { wrapper, draft } = mountForm({
      overlay: { plugins: { 'local-ssh': { schedule: '@daily' } } },
    });
    const ssh = card(wrapper, 'local-ssh');
    await ssh.find('[data-test="schedule-agent-default"]').trigger('click');
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { schedule: null } },
    });
    await ssh.find('[data-test="plugin-schedule"]').setValue('');
    expect(draft.overlay.value).toEqual({});
  });

  it('config rows: add, set, reset (unset) and delete (makeAbsent → null for base keys)', async () => {
    const { wrapper, draft } = mountForm();
    const cfg = card(wrapper, 'local-ssh').find(
      '[data-test="config-local-ssh"]',
    );
    const portRow = cfg.find('[data-row="port"]');
    expect(portRow.find('input').attributes('placeholder')).toBe('22');
    await portRow.find('input').setValue('2222');
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { config: { port: '2222' } } },
    });
    await cfg.find('[data-row="port"] [data-test="kv-reset"]').trigger('click');
    expect(draft.overlay.value).toEqual({});
    await cfg
      .find('[data-row="host"] [data-test="kv-delete"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { config: { host: null } } },
    });
    await cfg.find('[data-test="kv-new-key"]').setValue('timeout');
    await cfg.find('[data-test="kv-new-value"]').setValue('5s');
    await cfg.find('form').trigger('submit');
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { config: { host: null, timeout: '5s' } } },
    });
  });

  it('protocol select: File value omits, Auto → null, 2 → 2', async () => {
    const { wrapper, draft } = mountForm();
    const protocol = card(wrapper, 'local-ssh')
      .findAllComponents({ name: 'Select' })
      .find(
        (c: { attributes: (k: string) => string | undefined }) =>
          c.attributes('data-test') === 'plugin-protocol',
      )!;
    protocol.vm.$emit('update:modelValue', 'auto');
    await flushPromises();
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { protocol_version: null } },
    });
    protocol.vm.$emit('update:modelValue', 2);
    await flushPromises();
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { protocol_version: 2 } },
    });
    protocol.vm.$emit('update:modelValue', 'file');
    await flushPromises();
    expect(draft.overlay.value).toEqual({});
  });

  it('policy sources: whole-array writes', async () => {
    const { wrapper, draft } = mountForm();
    const pol = card(wrapper, 'local-ssh').find(
      '[data-test="policies-local-ssh"]',
    );
    await pol
      .find('[data-test="new-policy"]')
      .setValue('ghcr.io/compliance-framework/extra:v1');
    await pol.find('form').trigger('submit');
    expect(draft.overlay.value).toEqual({
      plugins: {
        'local-ssh': {
          policies: [
            'ghcr.io/compliance-framework/plugin-local-ssh-policies:v1.0.0',
            'ghcr.io/compliance-framework/extra:v1',
          ],
        },
      },
    });
  });

  it('adds a plugin through the dialog', async () => {
    const { wrapper, draft } = mountForm();
    await wrapper.find('[data-test="add-plugin"]').trigger('click');
    await flushPromises();
    const form = wrapper.findComponent({ name: 'AddPluginDialog' });
    expect(form.exists()).toBe(true);
    form.vm.$emit('add', { name: 'neu', source: 'ghcr.io/x/neu:v1' });
    await flushPromises();
    expect(draft.overlay.value).toEqual({
      plugins: { neu: { source: 'ghcr.io/x/neu:v1', policies: [] } },
    });
    expect(card(wrapper, 'neu').exists()).toBe(true);
  });

  it('locks config keys only when every fresh apply_safe instance lacks a matching glob', () => {
    const { wrapper } = mountForm();
    const cfg = card(wrapper, 'local-ssh').find(
      '[data-test="config-local-ssh"]',
    );
    // overridable_config_flags: ['local-ssh:port', 'timeout'] on both apply_safe instances.
    expect(cfg.find('[data-row="port"] [data-test="kv-lock"]').exists()).toBe(
      false,
    );
    expect(cfg.find('[data-row="host"] [data-test="kv-lock"]').exists()).toBe(
      true,
    );

    const open = {
      ...b,
      remoteConfig: { ...remoteConfigSafe, overridable_config_flags: ['*'] },
    };
    const h = mountForm({ instances: [a, open] });
    const cfg2 = card(h.wrapper, 'local-ssh').find(
      '[data-test="config-local-ssh"]',
    );
    expect(cfg2.find('[data-row="host"] [data-test="kv-lock"]').exists()).toBe(
      false,
    );
  });

  it('shows shields from a preview where a field is unsafe on every fresh instance', () => {
    const preview: ConfigPreview = {
      desiredRevision: 7,
      standalone: false,
      overlayErrors: [],
      policyErrors: [],
      instances: [a, b].map((i) => ({
        instanceId: i.instanceId,
        hostname: i.hostname,
        mode: 'apply_safe',
        stale: false,
        validated: true,
        effective: null,
        errors: [],
        changes: [
          {
            path: '/plugins/local-ssh/source',
            safety: 'unsafe',
            reason: 'untrusted-source',
            value: 'x',
          },
        ],
        willApply: false,
      })),
    };
    const { wrapper } = mountForm({
      preview,
      overlay: { plugins: { 'local-ssh': { source: 'x' } } },
    });
    expect(
      wrapper.find('[data-test="shield-/plugins/local-ssh/source"]').exists(),
    ).toBe(true);
    expect(wrapper.find('[data-test="source-trust-hint"]').text()).toContain(
      'trusted on 0/2',
    );
  });

  it('policy-only mode disables everything except inline policy entries', () => {
    const { wrapper } = mountForm({
      mode: 'policy-only',
      overlay: {
        plugins: { 'local-ssh': { policies: ['inline:x'] } },
        policy_bundles: { x: { modules: { 'a.rego': 'package a' } } },
      },
    });
    const ssh = card(wrapper, 'local-ssh');
    expect(
      ssh.find('[data-test="plugin-source"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      ssh.find('[data-test="plugin-enabled"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[data-test="evidence-interval"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[data-test="add-plugin"]').attributes('disabled'),
    ).toBeDefined();
    const removeInline = ssh.find(
      '[data-entry="inline:x"] [data-test="remove-policy"]',
    );
    expect(removeInline.attributes('disabled')).toBeUndefined();
    // The policy input remains, limited to inline: entries.
    expect(ssh.find('[data-test="new-policy"]').exists()).toBe(true);
  });

  it('shows "differs across instances" when bases disagree', () => {
    const other = detailFor(b, {});
    other.base = { ...other.base!, verbosity: 2 };
    const { wrapper } = mountForm({ details: [detailFor(a, {}), other] });
    expect(wrapper.find('[data-test="differs-/verbosity"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-test="placeholder-instance"]').exists()).toBe(
      true,
    );
    expect(instanceIds.a).toBeTruthy();
  });
});
