// R68 Policies view: Override pre-fill + template fallback + vendor-test offer (R62/R64),
// View, Add file, contract markers (R63), create/assign with swap-by-default (R66) and
// policy-only gating (R58).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/api-types';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import { resetVendorSourceCache } from '@/composables/agent-config/useVendorSources';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  FIXTURE_ARTIFACTS,
  FIXTURE_ARTIFACT_SOURCES,
  SSH_POLICIES,
  UBUNTU_POLICIES,
  configRev7,
  detailFor,
  instanceDetailA,
  instanceIds,
  instancesMixed,
  overlayRev7,
} from '@/composables/agent-config/fixtures';
import type {
  AgentInstanceDetail,
  PolicyBundleDoc,
} from '@/types/agent-config';
import {
  ADMIN,
  POLICY_AUTHOR,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from '../../config/__tests__/helpers';

vi.mock(
  '@/components/code-editor',
  () => import('../../config/__tests__/codeEditorMock'),
);
const confirmed = vi.hoisted(() => ({ messages: [] as string[] }));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void; message?: string }) => {
      confirmed.messages.push(o.message ?? '');
      o.accept?.();
    },
  }),
}));

import PoliciesWorkspace from '../PoliciesWorkspace.vue';

const SSH_SRC = FIXTURE_ARTIFACT_SOURCES[FIXTURE_ARTIFACTS.sshPolicies];

/** r7 without the vendor-test delete, so banner_test.rego is still inherited. */
const configNoDelete = {
  ...configRev7,
  overlay: {
    ...overlayRev7,
    policy_bundles: {
      'ssh-tuned': {
        extends: SSH_POLICIES,
        modules: (overlayRev7.policy_bundles!['ssh-tuned'] as PolicyBundleDoc)
          .modules,
      },
    },
  },
};

function artifactApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return fakeApi({
    getConfig: vi.fn().mockResolvedValue(configNoDelete),
    getArtifactFile: vi
      .fn()
      .mockImplementation(async (digest: string, path: string) => {
        const source = FIXTURE_ARTIFACT_SOURCES[digest]?.[path];
        if (source === undefined)
          throw new AgentConfigApiError({
            kind: 'other',
            status: 404,
            message: 'nope',
          });
        return { path, sha256: '0', source };
      }),
    listArtifactFiles: vi.fn().mockImplementation(async (digest: string) => ({
      digest,
      treeDigest: 'tree:x',
      files: Object.keys(FIXTURE_ARTIFACT_SOURCES[digest] ?? {}).map(
        (path) => ({
          path,
          sha256: '0',
          size: 1,
        }),
      ),
    })),
    ...over,
  });
}

async function mountWorkspace(
  api: AgentConfigApi,
  perms: Record<string, string[]> = ADMIN,
  initialBundle: string | null = 'ssh-tuned',
) {
  const out: { ws?: ConfigWorkspace } = {};
  const wrapper = mount(
    workspaceHost(api, PoliciesWorkspace, () => ({ initialBundle }), out),
    { global: globalWith(piniaWith(perms), { teleport: true }) },
  );
  await flushPromises();
  await out.ws!.loadDetails();
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

const row = (w: ReturnType<typeof mount>, path: string) =>
  w.find(`[data-file="${path}"]`);
const action = (w: ReturnType<typeof mount>, path: string, a: string) =>
  row(w, path).find(`[data-action="${a}"]`);
const bundleOf = (ws: ConfigWorkspace, name = 'ssh-tuned') =>
  ws.draft.overlay.value.policy_bundles?.[name] as PolicyBundleDoc;

describe('Policies view: override and view (R62, R64)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
    confirmed.messages = [];
  });

  it('Override pre-fills the current vendor source from the reported artifact', async () => {
    const api = artifactApi();
    const { wrapper, ws } = await mountWorkspace(api);
    expect(row(wrapper, 'root_login.rego').attributes('data-state')).toBe(
      'inherited',
    );
    await action(wrapper, 'root_login.rego', 'override').trigger('click');
    await flushPromises();
    expect(api.getArtifactFile).toHaveBeenCalledWith(
      FIXTURE_ARTIFACTS.sshPolicies,
      'root_login.rego',
    );
    expect(bundleOf(ws).modules?.['root_login.rego']).toBe(
      SSH_SRC['root_login.rego'],
    );
    expect(confirmed.messages).toEqual([]);
    const editor = wrapper.find('[data-test="editor-pane"] textarea');
    expect((editor.element as HTMLTextAreaElement).value).toBe(
      SSH_SRC['root_login.rego'],
    );
  });

  it('falls back to the module template after a confirmation on a 404', async () => {
    const api = artifactApi({
      getArtifactFile: vi
        .fn()
        .mockRejectedValue(
          new AgentConfigApiError({ kind: 'other', status: 404, message: 'x' }),
        ),
    });
    const { wrapper, ws } = await mountWorkspace(api);
    await action(wrapper, 'root_login.rego', 'override').trigger('click');
    await flushPromises();
    expect(confirmed.messages[0]).toContain('not in the uploaded artifact');
    const text = bundleOf(ws).modules?.['root_login.rego'] ?? '';
    expect(text).toMatch(/^package compliance_framework\.root_login\n/);
    expect(text).toMatch(/^title := /m);
    expect(text).toMatch(/^violation contains /m);
  });

  it('uses the template without fetching when no digest was reported', async () => {
    const noDigest: AgentInstanceDetail = {
      ...instanceDetailA,
      policyBundles: instanceDetailA.policyBundles.map((b) => ({
        ...b,
        artifactDigest: undefined,
        extends: b.extends
          ? { ...b.extends, artifactDigest: undefined }
          : b.extends,
      })),
    };
    const api = artifactApi({
      getInstance: vi.fn().mockImplementation(async (_a: string, id: string) =>
        id === instanceIds.a
          ? noDigest
          : {
              ...detailFor(
                instancesMixed.items.find((i) => i.instanceId === id)!,
                {},
              ),
              policyBundles: [],
            },
      ),
    });
    const { wrapper, ws } = await mountWorkspace(api);
    await action(wrapper, 'root_login.rego', 'override').trigger('click');
    await flushPromises();
    expect(api.getArtifactFile).not.toHaveBeenCalled();
    expect(confirmed.messages[0]).toContain('did not upload');
    expect(bundleOf(ws).modules?.['root_login.rego']).toMatch(/^title := /m);
  });

  it('does not pre-fill from a report of a different extends source', async () => {
    const api = artifactApi();
    const { wrapper, ws } = await mountWorkspace(api);
    ws.draft.set(
      '/policy_bundles/ssh-tuned/extends',
      'ghcr.io/other/policies:v2',
    );
    await flushPromises();
    // The vendor list is unknown for the new source: override by path is not offered,
    // but the action helper still guards it.
    const vm = wrapper.findComponent(PoliciesWorkspace).vm as unknown as {
      override: (r: unknown) => Promise<void>;
    };
    await vm.override({
      path: 'root_login.rego',
      state: 'inherited',
      vendor: { path: 'root_login.rego', sha256: 'x' },
      inOverlay: false,
      inFile: false,
      isTest: false,
      actions: [],
    });
    await flushPromises();
    expect(api.getArtifactFile).not.toHaveBeenCalled();
    expect(confirmed.messages[0]).toContain('different source');
  });

  it('offers to delete the vendor tests of an overridden package (R64)', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    expect(row(wrapper, 'banner_test.rego').attributes('data-state')).toBe(
      'inherited',
    );
    expect(
      row(wrapper, 'banner_test.rego')
        .find('[data-test="vendor-test-hint"]')
        .attributes('aria-label'),
    ).toContain('vendor tests that no longer compile reject the revision');
    await action(wrapper, 'banner.rego', 'override').trigger('click');
    await flushPromises();
    const offer = wrapper.find('[data-test="vendor-tests-offer"]');
    expect(offer.text()).toContain('banner_test.rego');
    await offer.find('[data-test="delete-vendor-tests"]').trigger('click');
    expect(bundleOf(ws).delete).toEqual(['banner_test.rego']);
    expect(wrapper.find('[data-test="vendor-tests-offer"]').exists()).toBe(
      false,
    );
  });

  it('View shows the vendor source read-only, with Override from there', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    await action(wrapper, 'banner.rego', 'view').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="read-only"]').exists()).toBe(true);
    const editor = wrapper.find('[data-test="editor-pane"] textarea');
    expect(editor.attributes('readonly')).toBeDefined();
    expect((editor.element as HTMLTextAreaElement).value).toBe(
      SSH_SRC['banner.rego'],
    );
    expect(ws.draft.isDirty.value).toBe(false);
    await wrapper.find('[data-test="override-from-view"]').trigger('click');
    await flushPromises();
    expect(bundleOf(ws).modules?.['banner.rego']).toBe(SSH_SRC['banner.rego']);
  });

  it('Add file creates a module from the template and shows contract markers (R63)', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    const path = wrapper.find('[data-test="add-file-path"]');
    await path.setValue('checks/extra.rego');
    await wrapper
      .findAll('form')
      .find((f) => f.find('[data-test="add-file-path"]').exists())!
      .trigger('submit');
    expect(bundleOf(ws).modules?.['checks/extra.rego']).toMatch(
      /^package compliance_framework\.extra\n/,
    );
    // Remove the title: the editor gets a missing-title marker; the panel lists it.
    ws.draft.set(
      '/policy_bundles/ssh-tuned/modules/checks~1extra.rego',
      'package compliance_framework.extra\n\nimport rego.v1\n',
    );
    await flushPromises();
    const diags = JSON.parse(
      wrapper
        .find('[data-test="editor-pane"] textarea')
        .attributes('data-diagnostics') ?? '[]',
    ) as { message: string; severity: string }[];
    expect(diags.some((d) => d.message.startsWith('[missing-title]'))).toBe(
      true,
    );
    const panel = wrapper.find('[data-test="validation-panel"]');
    expect(panel.text()).toContain('Missing title');
    expect(panel.find('[data-test="client-hint"]').exists()).toBe(true);
  });

  it('lists API policy errors with their codes in the validation panel', async () => {
    const api = artifactApi({
      preview: vi.fn().mockResolvedValue({
        desiredRevision: 7,
        standalone: false,
        overlayErrors: [],
        policyErrors: [
          {
            bundle: 'ssh-tuned',
            path: 'max_auth_tries.rego',
            row: 3,
            col: 1,
            message: 'violation must be a set',
            severity: 'error',
            code: 'invalid-violation-rule',
          },
        ],
        instances: [],
      }),
    });
    const { wrapper, ws } = await mountWorkspace(api);
    ws.draft.set('/plugins/local-ssh/policies', [
      'inline:ssh-tuned',
      SSH_POLICIES,
    ]);
    await ws.preview.run();
    await flushPromises();
    const errors = wrapper.findAll('[data-test="validation-error"]');
    expect(
      errors.some((e) => e.text().includes('Invalid violation rule')),
    ).toBe(true);
    expect(
      row(wrapper, 'max_auth_tries.rego')
        .find('[data-test="file-error-dot"]')
        .exists(),
    ).toBe(true);
  });
});

describe('Policies view: bundles and assignment (R66, R58)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
    confirmed.messages = [];
  });

  it('creates a bundle from a used source and swaps it in at the same index by default', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi(), ADMIN, null);
    await wrapper
      .find(`[data-test="source-item-${UBUNTU_POLICIES}"]`)
      .trigger('click');
    await wrapper.find('[data-test="create-from-source"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="create-bundle-form"]');
    expect(
      (dialog.find('[data-test="cb-name"]').element as HTMLInputElement).value,
    ).toBe('plugin-ubuntu-policies-custom');
    expect(
      (
        dialog.find('[data-test="assign-check-ubuntu-packages"]')
          .element as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        dialog.find('[data-test="assign-replace-ubuntu-packages"]')
          .element as HTMLInputElement
      ).checked,
    ).toBe(true);
    await dialog.trigger('submit');
    const name = 'plugin-ubuntu-policies-custom';
    expect(ws.draft.overlay.value.policy_bundles?.[name]).toEqual({
      extends: UBUNTU_POLICIES,
    });
    expect(
      ws.draft.effectiveDraft.value.plugins?.['ubuntu-packages']?.policies,
    ).toEqual([`inline:${name}`]);
    // A swap is a policy-only change (R22): no configure needed.
    expect(ws.saveDisabledReason.value).toBe('');
  });

  it('adding alongside is explicit and warns about duplicate evidence', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi(), ADMIN, null);
    await wrapper.find('[data-test="create-bundle"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="create-bundle-form"]');
    await dialog.find('[data-test="cb-source"]').setValue(UBUNTU_POLICIES);
    await dialog
      .find('[data-test="assign-alongside-ubuntu-packages"]')
      .trigger('change');
    expect(
      dialog.find('[data-test="duplicate-warning-ubuntu-packages"]').text(),
    ).toContain('duplicate evidence');
    await dialog.trigger('submit');
    const pols =
      ws.draft.effectiveDraft.value.plugins?.['ubuntu-packages']?.policies;
    expect(pols?.[0]).toBe(UBUNTU_POLICIES);
    expect(pols?.[1]).toMatch(/^inline:/);
  });

  it('Assign/unassign an existing bundle: unassign gives the swapped source its place back', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    // local-ssh loads inline:ssh-tuned in r7 (SSH_POLICIES swapped out).
    await wrapper.find('[data-test="assign-bundle"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="assign-dialog"]');
    const check = dialog.find('[data-test="assign-check-local-ssh"]');
    expect((check.element as HTMLInputElement).checked).toBe(true);
    await check.setValue(false);
    await dialog.find('form').trigger('submit');
    expect(
      ws.draft.effectiveDraft.value.plugins?.['local-ssh']?.policies,
    ).toEqual([SSH_POLICIES]);
  });

  async function setAssignment(
    wrapper: ReturnType<typeof mount>,
    plugin: string,
    on: boolean,
  ) {
    await wrapper.find('[data-test="assign-bundle"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="assign-dialog"]');
    await dialog.find(`[data-test="assign-check-${plugin}"]`).setValue(on);
    return dialog;
  }

  it('unassigning a swapped bundle restores the source at the same index (R66 undo)', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi(), POLICY_AUTHOR);
    const dialog = await setAssignment(wrapper, 'local-ssh', false);
    expect(
      dialog.find('[data-test="unassign-hint-local-ssh"]').text(),
    ).toContain(`puts ${SSH_POLICIES} back`);
    await dialog.find('form').trigger('submit');
    expect(
      ws.draft.effectiveDraft.value.plugins?.['local-ssh']?.policies,
    ).toEqual([SSH_POLICIES]);
    // The inverse swap stays a policy-only change (R22).
    expect(ws.saveDisabledReason.value).toBe('');
  });

  it('unassigning an appended bundle only removes the reference, never adds the source', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi(), POLICY_AUTHOR);
    // ubuntu-packages never loaded SSH_POLICIES: assigning appends inline:ssh-tuned.
    let dialog = await setAssignment(wrapper, 'ubuntu-packages', true);
    await dialog.find('form').trigger('submit');
    const pols = () =>
      ws.draft.effectiveDraft.value.plugins?.['ubuntu-packages']?.policies;
    expect(pols()).toEqual([UBUNTU_POLICIES, 'inline:ssh-tuned']);
    expect(ws.saveDisabledReason.value).toBe('');

    dialog = await setAssignment(wrapper, 'ubuntu-packages', false);
    expect(
      dialog.find('[data-test="unassign-hint-ubuntu-packages"]').text(),
    ).toContain('removes the reference');
    expect(
      dialog.find('[data-test="unassign-hint-ubuntu-packages"]').text(),
    ).not.toContain('puts');
    await dialog.find('form').trigger('submit');
    expect(pols()).toEqual([UBUNTU_POLICIES]);
    expect(pols()).not.toContain(SSH_POLICIES);
    expect(ws.saveDisabledReason.value).toBe('');
  });

  it('unassigning after the source was dropped from an "alongside" list does not add it back', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    // The bundle sits at index 1 (it was added alongside and SSH_POLICIES was later
    // dropped): no saved or file list had SSH_POLICIES there, so nothing is restored.
    ws.draft.set('/plugins/local-ssh/policies', [
      'ghcr.io/brand/other:v1',
      'inline:ssh-tuned',
    ]);
    await flushPromises();
    const dialog = await setAssignment(wrapper, 'local-ssh', false);
    expect(
      dialog.find('[data-test="unassign-hint-local-ssh"]').text(),
    ).toContain('removes the reference');
    await dialog.find('form').trigger('submit');
    expect(
      ws.draft.effectiveDraft.value.plugins?.['local-ssh']?.policies,
    ).toEqual(['ghcr.io/brand/other:v1']);
  });

  it('a policy author can use the view, with the R58 hint for a new source', async () => {
    const { wrapper, ws } = await mountWorkspace(
      artifactApi(),
      POLICY_AUTHOR,
      null,
    );
    await wrapper.find('[data-test="create-bundle"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="create-bundle-form"]');
    await dialog.find('[data-test="start-other"]').setValue(true);
    await dialog
      .find('[data-test="cb-other"]')
      .setValue('ghcr.io/brand/new:v1');
    expect(dialog.find('[data-test="cb-r58"]').exists()).toBe(true);
    await dialog.find('[data-test="cb-name"]').setValue('brand-new');
    await dialog.trigger('submit');
    // Extending a source no validated instance uses needs agent:configure (R58).
    expect(ws.saveDisabledReason.value).toContain('policy bundles');
  });

  it('a reader sees the view read-only', async () => {
    const { wrapper } = await mountWorkspace(artifactApi(), {
      agent: ['read'],
    });
    expect(wrapper.find('[data-test="create-bundle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="assign-bundle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="add-file"]').exists()).toBe(false);
    expect(
      action(wrapper, 'root_login.rego', 'override').attributes('disabled'),
    ).toBeDefined();
    expect(
      action(wrapper, 'root_login.rego', 'view').attributes('disabled'),
    ).toBeUndefined();
  });

  it('deleting a bundle unwires it; Undo delete restores both', async () => {
    const { wrapper, ws } = await mountWorkspace(artifactApi());
    await wrapper.find('[data-test="bundle-delete"]').trigger('click');
    expect(
      ws.draft.overlay.value.policy_bundles?.['ssh-tuned'],
    ).toBeUndefined();
    expect(
      ws.draft.effectiveDraft.value.plugins?.['local-ssh']?.policies ?? [],
    ).not.toContain('inline:ssh-tuned');
    await wrapper.find('[data-test="undo-delete-ssh-tuned"]').trigger('click');
    expect(ws.draft.isDirty.value).toBe(false);
  });
});
