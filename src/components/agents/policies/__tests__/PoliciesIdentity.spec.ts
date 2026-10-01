// Rounds 3-4 (design §13.4, §13.5) in the Policies view: Override pre-fills the vendor
// source and inserts nothing, the new-module template declares policy_id, no client-side
// evidence-stream labels or fork warnings (the agent decides and reports them), and the R79
// gate for plugins built on an agent library without inline-policy support.
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
  configRev7,
  detailFor,
  instanceDetailA,
  instanceIds,
  instancesMixed,
} from '@/composables/agent-config/fixtures';
import type {
  AgentInstanceDetail,
  PluginReport,
  PolicyBundleDoc,
} from '@/types/agent-config';
import {
  ADMIN,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from '../../config/__tests__/helpers';

vi.mock(
  '@/components/code-editor',
  () => import('../../config/__tests__/codeEditorMock'),
);
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void }) => o.accept?.(),
  }),
}));

import PoliciesWorkspace from '../PoliciesWorkspace.vue';

const SSH_SRC = FIXTURE_ARTIFACT_SOURCES[FIXTURE_ARTIFACTS.sshPolicies];
function api(
  opts: {
    plugins?: PluginReport[];
    sources?: Record<string, string>;
    preview?: AgentConfigApi['preview'];
  } = {},
): AgentConfigApi {
  const detailA: AgentInstanceDetail = {
    ...instanceDetailA,
    plugins: opts.plugins ?? null,
  };
  const sources = { ...SSH_SRC, ...(opts.sources ?? {}) };
  return fakeApi({
    listInstances: vi.fn().mockResolvedValue({
      ...instancesMixed,
      items: instancesMixed.items.map((i) =>
        i.instanceId === instanceIds.a
          ? { ...i, plugins: opts.plugins ?? null }
          : i,
      ),
    }),
    getInstance: vi.fn().mockImplementation(async (_a: string, id: string) => {
      if (id === instanceIds.a) return detailA;
      const s = instancesMixed.items.find((i) => i.instanceId === id)!;
      return detailFor(s, configRev7.overlay ?? {});
    }),
    getArtifactFile: vi
      .fn()
      .mockImplementation(async (digest: string, path: string) => {
        const source =
          digest === FIXTURE_ARTIFACTS.sshPolicies
            ? sources[path]
            : FIXTURE_ARTIFACT_SOURCES[digest]?.[path];
        if (source === undefined)
          throw new AgentConfigApiError({
            kind: 'other',
            status: 404,
            message: 'nope',
          });
        return { path, sha256: '0', source };
      }),
    ...(opts.preview ? { preview: opts.preview } : {}),
  });
}

async function mountWorkspace(a: AgentConfigApi) {
  const out: { ws?: ConfigWorkspace } = {};
  const wrapper = mount(
    workspaceHost(
      a,
      PoliciesWorkspace,
      () => ({ initialBundle: 'ssh-tuned' }),
      out,
    ),
    { global: globalWith(piniaWith(ADMIN), { teleport: true }) },
  );
  await flushPromises();
  await out.ws!.loadDetails();
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

const row = (w: ReturnType<typeof mount>, path: string) =>
  w.find(`[data-file="${path}"]`);
const modules = (ws: ConfigWorkspace) =>
  (ws.draft.overlay.value.policy_bundles?.['ssh-tuned'] as PolicyBundleDoc)
    .modules ?? {};
const MOD = '/policy_bundles/ssh-tuned/modules/root_login.rego';

async function override(w: ReturnType<typeof mount>, path: string) {
  await row(w, path).find('[data-action="override"]').trigger('click');
  await flushPromises();
}

/** Nothing in the view explains or labels evidence streams. */
function expectNoStreamUi(w: ReturnType<typeof mount>) {
  for (const t of [
    'file-stream',
    'stream-identity',
    'stream-automatic-id',
    'stream-fork',
    'inherited-stream-hint',
  ])
    expect(w.find(`[data-test="${t}"]`).exists()).toBe(false);
  expect(w.text()).not.toMatch(/vendor stream|new stream|own stream/);
}

const diagnostics = (w: ReturnType<typeof mount>) =>
  JSON.parse(
    w
      .find('[data-test="editor-pane"] textarea')
      .attributes('data-diagnostics') ?? '[]',
  ) as { message: string; severity: string }[];

describe('Policies view: policy identity without client-side stream labels', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
  });

  it('Override pre-fills the vendor source without inserting a policy_id', async () => {
    const { wrapper, ws } = await mountWorkspace(api());
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(SSH_SRC['root_login.rego']);
    expect(row(wrapper, 'root_login.rego').attributes('data-state')).toBe(
      'overridden',
    );
    expectNoStreamUi(wrapper);
  });

  it('keeps a policy_id the vendor module already declares', async () => {
    const declared = SSH_SRC['root_login.rego'].replace(
      'import rego.v1\n',
      'import rego.v1\n\npolicy_id := "ssh-root-login"\n',
    );
    const { wrapper, ws } = await mountWorkspace(
      api({ sources: { 'root_login.rego': declared } }),
    );
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(declared);
  });

  it('shows no stream labels on inherited modules, in the tree or the viewer', async () => {
    const { wrapper } = await mountWorkspace(api());
    expect(row(wrapper, 'banner.rego').attributes('data-state')).toBe(
      'inherited',
    );
    await row(wrapper, 'banner.rego')
      .find('[data-action="view"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="read-only"]').exists()).toBe(true);
    expectNoStreamUi(wrapper);
  });

  it('computes no fork warnings in the browser when an edit changes policy_id or package', async () => {
    const { wrapper, ws } = await mountWorkspace(api());
    await override(wrapper, 'root_login.rego');
    const text = modules(ws)['root_login.rego']!;
    const forkCodes =
      /^\[(policy-stream-forked|policy-package-changed|policy-id-continuity-skipped)\]/;

    ws.draft.set(
      MOD,
      text.replace(
        'import rego.v1\n',
        'import rego.v1\n\npolicy_id := "mine"\n',
      ),
    );
    await flushPromises();
    expect(diagnostics(wrapper).some((d) => forkCodes.test(d.message))).toBe(
      false,
    );

    ws.draft.set(MOD, text.replace('root_login', 'renamed'));
    await flushPromises();
    expect(diagnostics(wrapper).some((d) => forkCodes.test(d.message))).toBe(
      false,
    );
    // A second module in a vendor package: no client-side multi-module skip hint either.
    ws.draft.set(
      '/policy_bundles/ssh-tuned/modules/banner_extra.rego',
      'package compliance_framework.banner\n\nimport rego.v1\n\ntitle := "extra"\n',
    );
    await flushPromises();
    const panel = wrapper.find('[data-test="validation-panel"]').text();
    expect(panel).not.toContain('evidence stream');
    expectNoStreamUi(wrapper);
  });

  it('still renders the agent-reported stream codes with readable labels', async () => {
    const err = (path: string, code: string, message: string) => ({
      bundle: 'ssh-tuned',
      path,
      message,
      severity: 'warning' as const,
      code,
    });
    const { wrapper, ws } = await mountWorkspace(
      api({
        preview: vi.fn().mockResolvedValue({
          desiredRevision: 7,
          standalone: false,
          overlayErrors: [],
          policyErrors: [
            err('max_auth_tries.rego', 'policy-package-changed', 'pkg moved'),
            err('max_auth_tries.rego', 'policy-stream-forked', 'id differs'),
            err('banner.rego', 'policy-id-continuity-skipped', 'two modules'),
          ],
          instances: [],
        }),
      }),
    );
    ws.draft.set('/plugins/local-ssh/policies', [
      'inline:ssh-tuned',
      SSH_POLICIES,
    ]);
    await ws.preview.run();
    await flushPromises();
    const panel = wrapper.find('[data-test="validation-panel"]').text();
    for (const label of [
      'Package changed: new evidence stream',
      'New evidence stream',
      'No automatic policy_id: new evidence stream',
    ])
      expect(panel).toContain(label);
    for (const message of ['pkg moved', 'id differs', 'two modules'])
      expect(panel).toContain(message);
  });

  it('Add file uses the object-form template with policy_id <bundle>/<file>', async () => {
    const { wrapper, ws } = await mountWorkspace(api());
    await wrapper
      .find('[data-test="add-file-path"]')
      .setValue('checks/new.rego');
    await wrapper
      .findAll('form')
      .find((f) => f.find('[data-test="add-file-path"]').exists())!
      .trigger('submit');
    await flushPromises();
    const text = modules(ws)['checks/new.rego'] ?? '';
    expect(text).toContain('policy_id := "ssh-tuned/checks/new.rego"');
    expect(text).toMatch(/^violation\[\{"id": /m);
    expectNoStreamUi(wrapper);
  });
});

describe('R79: plugins built on an agent library without inline policies', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
  });

  const unsupported: PluginReport[] = [
    {
      name: 'local-ssh',
      source: 'ghcr.io/compliance-framework/plugin-local-ssh:v1.2.0',
      libVersion: 'v0.1.9',
      inlinePolicies: 'unsupported',
    },
    {
      name: 'ubuntu-packages',
      source: 'ghcr.io/compliance-framework/plugin-ubuntu-packages:v0.4.0',
      libVersion: 'v0.7.1',
      inlinePolicies: 'unsupported',
    },
  ];
  const TEXT =
    "plugin local-ssh (agent lib v0.1.9) doesn't support inline policies; upgrade the plugin to a build on agent ≥ v0.9.0";

  it('disables Override and Add file for a bundle an unsupported plugin uses', async () => {
    const { wrapper } = await mountWorkspace(api({ plugins: unsupported }));
    expect(
      wrapper.find('[data-test="bundle-inline-blocked"]').text(),
    ).toContain(TEXT);
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-action="override"]')
        .attributes('disabled'),
    ).toBeDefined();
    await wrapper.find('[data-test="add-file-path"]').setValue('x.rego');
    expect(
      wrapper.find('[data-test="add-file"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('blocks assigning the bundle to an unsupported plugin, with the reason', async () => {
    const { wrapper } = await mountWorkspace(api({ plugins: unsupported }));
    await wrapper.find('[data-test="assign-bundle"]').trigger('click');
    await flushPromises();
    const dialog = wrapper.find('[data-test="assign-dialog"]');
    const check = dialog.find('[data-test="assign-check-ubuntu-packages"]');
    expect(check.attributes('disabled')).toBeDefined();
    expect(
      dialog.find('[data-test="inline-blocked-ubuntu-packages"]').text(),
    ).toContain('plugin ubuntu-packages (agent lib v0.7.1)');
    // An existing assignment can still be removed, and says why it should be.
    expect(
      dialog
        .find('[data-test="assign-check-local-ssh"]')
        .attributes('disabled'),
    ).toBeUndefined();
    expect(
      dialog.find('[data-test="inline-blocked-local-ssh"]').text(),
    ).toContain('agents reject this assignment; unassign it');
  });

  it('blocks Review & save while the draft gives an unsupported plugin inline policies', async () => {
    const { ws } = await mountWorkspace(api({ plugins: unsupported }));
    // r7 swaps inline:ssh-tuned into local-ssh: the agent would reject it.
    const issue = ws.draft.clientIssues.value.find(
      (i) =>
        i.ptr === '/plugins/local-ssh/policies' && i.message.includes(TEXT),
    );
    expect(issue?.blocking).toBe(true);
    expect(ws.blockingCount.value).toBeGreaterThan(0);
    // Unassigning lifts the block.
    ws.draft.set('/plugins/local-ssh/policies', [SSH_POLICIES]);
    await flushPromises();
    expect(
      ws.draft.clientIssues.value.some((i) => i.message.includes(TEXT)),
    ).toBe(false);
  });

  it('an unknown library version warns without blocking', async () => {
    const { ws } = await mountWorkspace(
      api({
        plugins: [
          {
            name: 'local-ssh',
            source: unsupported[0].source,
            inlinePolicies: 'unknown',
          },
        ],
      }),
    );
    const issue = ws.draft.clientIssues.value.find((i) =>
      i.message.includes('agent library version is unknown'),
    );
    expect(issue?.blocking).toBe(false);
    expect(ws.inlineBlocked('local-ssh')).toBeNull();
  });
});
