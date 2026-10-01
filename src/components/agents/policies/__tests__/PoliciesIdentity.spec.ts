// Round 3 (design §13.4) in the Policies view: R78 evidence identity (Override continues the
// vendor stream, template policy_id, editor warnings, stream labels) and the R79 gate for
// plugins built on an agent library without inline-policy support.
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
/** An un-cleaned local plugin path: the continuity id must keep it literally (R77). */
const VENDOR_PATH = './policies/ssh/';

function api(
  opts: {
    pluginPath?: string;
    plugins?: PluginReport[];
    sources?: Record<string, string>;
  } = {},
): AgentConfigApi {
  const detailA: AgentInstanceDetail = {
    ...instanceDetailA,
    plugins: opts.plugins ?? null,
    policyBundles: [
      ...instanceDetailA.policyBundles,
      ...(opts.pluginPath
        ? [
            {
              source: SSH_POLICIES,
              digest: 'tree:sha256:bb22',
              files: [],
              pluginPath: opts.pluginPath,
            },
          ]
        : []),
    ],
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

describe('R78: Override continues the vendor evidence stream', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
  });

  it('inserts policy_id = the literal <plugin-path>/<file> of the replaced source', async () => {
    const { wrapper, ws } = await mountWorkspace(
      api({ pluginPath: VENDOR_PATH }),
    );
    await override(wrapper, 'root_login.rego');
    const text = modules(ws)['root_login.rego'] ?? '';
    // String concatenation, not path.Join: "./policies/ssh/" + "/" + file.
    expect(text).toContain(
      'import rego.v1\n\npolicy_id := "./policies/ssh//root_login.rego"\n\ntitle := ',
    );
    expect(text.replace(/\npolicy_id := .*\n\n/, '\n')).toBe(
      SSH_SRC['root_login.rego'],
    );
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('continues');
    expect(wrapper.find('[data-test="stream-identity"]').text()).toContain(
      'continues vendor stream',
    );
    expect(wrapper.find('[data-test="stream-fork"]').exists()).toBe(false);
  });

  it('keeps a policy_id the vendor module already declares', async () => {
    const declared = SSH_SRC['root_login.rego'].replace(
      'import rego.v1\n',
      'import rego.v1\n\npolicy_id := "ssh-root-login"\n',
    );
    const { wrapper, ws } = await mountWorkspace(
      api({
        pluginPath: VENDOR_PATH,
        sources: { 'root_login.rego': declared },
      }),
    );
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(declared);
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('continues');
  });

  it('without a reported plugin path inserts nothing and says the stream is new', async () => {
    const { wrapper, ws } = await mountWorkspace(api());
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(SSH_SRC['root_login.rego']);
    expect(wrapper.find('[data-test="stream-fork"]').text()).toContain(
      'evidence for this override will start a new stream',
    );
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('path');
  });

  it('warns in the editor when the policy_id or the package is changed', async () => {
    const { wrapper, ws } = await mountWorkspace(
      api({ pluginPath: VENDOR_PATH }),
    );
    await override(wrapper, 'root_login.rego');
    const text = modules(ws)['root_login.rego']!;
    const diags = () =>
      JSON.parse(
        wrapper
          .find('[data-test="editor-pane"] textarea')
          .attributes('data-diagnostics') ?? '[]',
      ) as { message: string; severity: string }[];

    ws.draft.set(MOD, text.replace(/policy_id := ".*"/, 'policy_id := "mine"'));
    await flushPromises();
    expect(wrapper.find('[data-test="stream-fork"]').text()).toContain(
      'this starts a new evidence stream',
    );
    expect(wrapper.find('[data-test="stream-fork"]').text()).toContain(
      'policy_id := "./policies/ssh//root_login.rego"',
    );
    expect(
      diags().some(
        (d) =>
          d.message.startsWith('[policy-stream-forked]') &&
          d.severity === 'warning',
      ),
    ).toBe(true);
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('own');

    ws.draft.set(MOD, text.replace(/\npolicy_id := .*\n/, '\n'));
    await flushPromises();
    expect(
      row(wrapper, 'root_login.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('path');

    ws.draft.set(MOD, text.replace('root_login', 'renamed'));
    await flushPromises();
    expect(
      diags().some((d) => d.message.startsWith('[policy-package-changed]')),
    ).toBe(true);
    expect(wrapper.find('[data-test="validation-panel"]').text()).toContain(
      'Package changed: new evidence stream',
    );
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
    expect(
      row(wrapper, 'checks/new.rego')
        .find('[data-test="file-stream"]')
        .attributes('data-stream'),
    ).toBe('own');
  });

  it('explains that inherited vendor modules fork when the bundle replaces the source', async () => {
    const { wrapper } = await mountWorkspace(api());
    expect(
      wrapper.find('[data-test="inherited-stream-hint"]').text(),
    ).toContain('new, path-based streams');
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
    "plugin local-ssh (agent lib v0.1.9) doesn't support inline policies; upgrade the plugin to a build on agent ≥ v0.8.0";

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
