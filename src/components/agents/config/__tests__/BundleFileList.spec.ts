import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentInstanceDetail } from '@/types/agent-config';
import {
  SSH_POLICIES,
  detailFor,
  instancesMixed,
} from '@/composables/agent-config/fixtures';
import { ADMIN, editorHarness, globalWith, piniaWith } from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

import PoliciesSection from '../editor/PoliciesSection.vue';

const a = instancesMixed.items[0];

/** A base whose file defines bundle `tuned` (extends SSH_POLICIES), with a vendor report. */
function withFileBundle(
  opts: { fileDelete?: string[]; reports?: boolean } = {},
): AgentInstanceDetail {
  const d = detailFor(a, {});
  d.base!.policy_bundles = {
    tuned: {
      extends: SSH_POLICIES,
      modules: { 'banner.rego': 'package file_banner' },
      ...(opts.fileDelete ? { delete: opts.fileDelete } : {}),
    },
  };
  d.policyBundles =
    opts.reports === false
      ? []
      : d.policyBundles.map((r) =>
          r.source === 'inline:ssh-tuned'
            ? { ...r, source: 'inline:tuned' }
            : r,
        );
  return d;
}

function mountFiles(overlay = {}, detail = withFileBundle()) {
  const h = editorHarness({ instances: [a], details: [detail], overlay });
  const wrapper = mount(PoliciesSection, {
    global: { ...globalWith(piniaWith(ADMIN)), provide: h.provide },
  });
  return { wrapper, draft: h.draft };
}

async function expand(wrapper: ReturnType<typeof mount>) {
  await wrapper
    .find('[data-test="bundle-card-tuned"] [data-test="bundle-toggle"]')
    .trigger('click');
}
const fileRow = (w: ReturnType<typeof mount>, p: string) =>
  w.find(`[data-file="${p}"]`);

describe('BundleFileList (U4.3)', () => {
  it('Delete writes the whole delete array and nulls a file-defined module', async () => {
    const { wrapper, draft } = mountFiles();
    await expand(wrapper);
    expect(fileRow(wrapper, 'banner.rego').attributes('data-state')).toBe(
      'overridden',
    );
    await fileRow(wrapper, 'banner.rego')
      .find('[data-action="delete"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({
      policy_bundles: {
        tuned: { delete: ['banner.rego'], modules: { 'banner.rego': null } },
      },
    });
    expect(fileRow(wrapper, 'banner.rego').attributes('data-state')).toBe(
      'deleted',
    );
  });

  it('Delete of an overlay-only module unsets it', async () => {
    const { wrapper, draft } = mountFiles({
      policy_bundles: {
        tuned: { modules: { 'root_login.rego': 'package x' } },
      },
    });
    await expand(wrapper);
    await fileRow(wrapper, 'root_login.rego')
      .find('[data-action="delete"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({
      policy_bundles: { tuned: { delete: ['root_login.rego'] } },
    });
  });

  it('Undelete unsets when the file had no delete list, writes [] when it had one', async () => {
    const one = mountFiles({
      policy_bundles: { tuned: { delete: ['root_login.rego'] } },
    });
    await expand(one.wrapper);
    await fileRow(one.wrapper, 'root_login.rego')
      .find('[data-action="undelete"]')
      .trigger('click');
    expect(one.draft.overlay.value).toEqual({});

    const two = mountFiles(
      {},
      withFileBundle({ fileDelete: ['root_login.rego'] }),
    );
    await expand(two.wrapper);
    await fileRow(two.wrapper, 'root_login.rego')
      .find('[data-action="undelete"]')
      .trigger('click');
    expect(two.draft.overlay.value).toEqual({
      policy_bundles: { tuned: { delete: [] } },
    });
  });

  it('Restore omits the overlay key; "Revert to vendor" writes null over a file-defined module', async () => {
    const { wrapper, draft } = mountFiles({
      policy_bundles: {
        tuned: { modules: { 'banner.rego': 'package overlay' } },
      },
    });
    await expand(wrapper);
    await fileRow(wrapper, 'banner.rego')
      .find('[data-action="restore"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({});
    await fileRow(wrapper, 'banner.rego')
      .find('[data-action="revert-to-vendor"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({
      policy_bundles: { tuned: { modules: { 'banner.rego': null } } },
    });
  });

  it('Override pre-fills the vendor package line and opens the editor', async () => {
    const { wrapper, draft } = mountFiles();
    await expand(wrapper);
    await fileRow(wrapper, 'root_login.rego')
      .find('[data-action="override"]')
      .trigger('click');
    expect(draft.overlay.value).toEqual({
      policy_bundles: {
        tuned: {
          modules: {
            'root_login.rego':
              'package compliance_framework.root_login\n\nimport rego.v1\n',
          },
        },
      },
    });
    expect(
      wrapper.find('[data-test="module-editor-root_login.rego"]').exists(),
    ).toBe(true);
  });

  it('shows the unknown-vendor notice and the delete-by-path input', async () => {
    const { wrapper, draft } = mountFiles(
      {},
      withFileBundle({ reports: false }),
    );
    await expand(wrapper);
    expect(wrapper.find('[data-test="vendor-unknown"]').exists()).toBe(true);
    expect(fileRow(wrapper, 'banner.rego').attributes('data-state')).toBe(
      'set',
    );
    await wrapper.find('[data-test="delete-path"]').setValue('vendor/x.rego');
    await wrapper
      .find('[data-test="delete-by-path"]')
      .element.closest('form')!
      .dispatchEvent(new Event('submit'));
    expect(draft.overlay.value).toEqual({
      policy_bundles: { tuned: { delete: ['vendor/x.rego'] } },
    });
  });

  it('flags vendor tests (warnings, deletable)', async () => {
    const { wrapper } = mountFiles();
    await expand(wrapper);
    const t = fileRow(wrapper, 'banner_test.rego');
    expect(t.text()).toContain('test');
    expect(
      t.find('[data-test="vendor-test-hint"]').attributes('aria-label'),
    ).toContain('Vendor test failures are warnings');
    expect(t.find('[data-action="delete"]').exists()).toBe(true);
  });

  it('adds files with a skeleton (empty for data files) and validates paths', async () => {
    const { wrapper, draft } = mountFiles();
    await expand(wrapper);
    await wrapper.find('[data-test="add-file-path"]').setValue('/abs.rego');
    expect(
      wrapper.find('[data-test="add-file"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.find('[data-test="add-file-path"]').setValue('data.json');
    wrapper
      .find('[data-test="add-file"]')
      .element.closest('form')!
      .dispatchEvent(new Event('submit'));
    expect(draft.overlay.value).toEqual({
      policy_bundles: { tuned: { modules: { 'data.json': '' } } },
    });
  });
});
