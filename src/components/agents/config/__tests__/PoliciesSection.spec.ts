import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentInstanceDetail } from '@/types/agent-config';
import {
  SSH_POLICIES,
  detailFor,
  instancesMixed,
} from '@/composables/agent-config/fixtures';
import { ADMIN, editorHarness, globalWith, piniaWith } from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
const confirmRequire = vi.hoisted(() => vi.fn());
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequire }),
}));

import PoliciesSection from '../editor/PoliciesSection.vue';
import { sanitizeBundleName, uniqueName } from '../editor/useBundleOps';

const DialogStub = {
  name: 'Dialog',
  props: ['visible', 'header'],
  template: '<div v-if="visible" class="dialog-stub"><slot /></div>',
};

const a = instancesMixed.items[0];

function mountSection(
  overlay = {},
  details: AgentInstanceDetail[] = [detailFor(a, {})],
) {
  const h = editorHarness({ instances: [a], details, overlay });
  const wrapper = mount(PoliciesSection, {
    global: {
      ...globalWith(piniaWith(ADMIN), { Dialog: DialogStub }),
      provide: h.provide,
    },
  });
  return { wrapper, draft: h.draft };
}

describe('PoliciesSection (U4.2)', () => {
  beforeEach(() => confirmRequire.mockReset());

  it('New bundle writes a root-relative main.rego skeleton and wires the chosen plugins', async () => {
    const { wrapper, draft } = mountSection();
    await wrapper.find('[data-test="new-bundle"]').trigger('click');
    await wrapper.find('[data-test="nb-name"]').setValue('ssh-extra');
    await wrapper.find('[data-test="nb-use-local-ssh"]').setValue(true);
    await wrapper.find('[data-test="new-bundle-form"]').trigger('submit');
    await flushPromises();
    expect(draft.overlay.value).toEqual({
      policy_bundles: {
        'ssh-extra': {
          modules: {
            'main.rego':
              'package compliance_framework.ssh_extra\n\nimport rego.v1\n',
          },
        },
      },
      plugins: {
        'local-ssh': { policies: [SSH_POLICIES, 'inline:ssh-extra'] },
      },
    });
    expect(wrapper.find('[data-test="bundle-card-ssh-extra"]').exists()).toBe(
      true,
    );
  });

  it('New bundle with extends writes only extends', async () => {
    const { wrapper, draft } = mountSection();
    await wrapper.find('[data-test="new-bundle"]').trigger('click');
    await wrapper.find('[data-test="nb-name"]').setValue('b2');
    await wrapper.find('[data-test="nb-extends"]').setValue(SSH_POLICIES);
    await wrapper.find('[data-test="new-bundle-form"]').trigger('submit');
    expect(draft.overlay.value).toEqual({
      policy_bundles: { b2: { extends: SSH_POLICIES } },
    });
  });

  it('Customize writes extends and swaps the source at the same index (R22)', async () => {
    const base = detailFor(a, {});
    base.base!.plugins!['local-ssh']!.policies = [
      'ghcr.io/x/first:v1',
      SSH_POLICIES,
      'ghcr.io/x/last:v1',
    ];
    const { wrapper, draft } = mountSection({}, [base]);
    await wrapper.find('[data-test="customize-bundle"]').trigger('click');
    await wrapper.find('[data-test="cb-plugin"]').setValue('local-ssh');
    await wrapper.find('[data-test="cb-source"]').setValue(SSH_POLICIES);
    expect(
      (wrapper.find('[data-test="cb-name"]').element as HTMLInputElement).value,
    ).toBe('local-ssh-custom');
    await wrapper.find('[data-test="customize-form"]').trigger('submit');
    await flushPromises();
    expect(draft.overlay.value).toEqual({
      policy_bundles: { 'local-ssh-custom': { extends: SSH_POLICIES } },
      plugins: {
        'local-ssh': {
          policies: [
            'ghcr.io/x/first:v1',
            'inline:local-ssh-custom',
            'ghcr.io/x/last:v1',
          ],
        },
      },
    });
    // The new card opens with its file list expanded.
    expect(wrapper.find('[data-test="files-local-ssh-custom"]').exists()).toBe(
      true,
    );
  });

  it('Customize without the swap leaves the policies alone; names are sanitised and deduped', async () => {
    const { wrapper, draft } = mountSection({
      policy_bundles: { 'local-ssh-custom': { extends: SSH_POLICIES } },
    });
    await wrapper.find('[data-test="customize-bundle"]').trigger('click');
    await wrapper.find('[data-test="cb-plugin"]').setValue('local-ssh');
    expect(
      (wrapper.find('[data-test="cb-name"]').element as HTMLInputElement).value,
    ).toBe('local-ssh-custom-2');
    await wrapper.find('[data-test="cb-swap"]').setValue(false);
    await wrapper.find('[data-test="customize-form"]').trigger('submit');
    expect(draft.overlay.value.plugins).toBeUndefined();

    expect(sanitizeBundleName('My Plugin.v2-custom')).toBe(
      'my-plugin-v2-custom',
    );
    expect(sanitizeBundleName('__x')).toBe('x');
    expect(sanitizeBundleName('a'.repeat(80))).toHaveLength(63);
    expect(uniqueName('b', new Set(['b', 'b-2']))).toBe('b-3');
    expect(uniqueName('x'.repeat(63), new Set(['x'.repeat(63)]))).toHaveLength(
      63,
    );
  });

  it('wiring chips write whole arrays', async () => {
    const { wrapper, draft } = mountSection({
      policy_bundles: { t: { modules: { 'a.rego': 'package a' } } },
    });
    await wrapper
      .find('[data-test="wiring-t"] [data-test="wire-local-ssh"]')
      .trigger('click');
    expect(draft.overlay.value.plugins).toEqual({
      'local-ssh': { policies: [SSH_POLICIES, 'inline:t'] },
    });
    await wrapper
      .find('[data-test="wiring-t"] [data-test="wire-local-ssh"]')
      .trigger('click');
    expect(draft.overlay.value.plugins).toEqual({
      'local-ssh': { policies: [SSH_POLICIES] },
    });
  });

  it('Delete bundle confirms and removes the inline: references', async () => {
    const { wrapper, draft } = mountSection({
      policy_bundles: { t: { modules: { 'a.rego': 'package a' } } },
      plugins: { 'local-ssh': { policies: [SSH_POLICIES, 'inline:t'] } },
    });
    await wrapper
      .find('[data-test="bundle-card-t"] [data-test="bundle-delete"]')
      .trigger('click');
    expect(confirmRequire.mock.calls[0][0].message).toContain('local-ssh');
    confirmRequire.mock.calls[0][0].accept();
    expect(draft.overlay.value).toEqual({
      plugins: { 'local-ssh': { policies: [SSH_POLICIES] } },
    });
  });

  it('shows age / origin and the temporary hint for overlay-owned bundles', () => {
    const { wrapper } = mountSection({
      policy_bundles: { t: { modules: { 'a.rego': 'package a' } } },
    });
    const card = wrapper.find('[data-test="bundle-card-t"]');
    expect(card.find('[data-test="bundle-age"]').text()).toContain(
      'Defined in the overlay',
    );
    expect(card.find('[data-test="temporary-hint"]').text()).toContain(
      'Publish as a bundle when stable',
    );
  });
});
