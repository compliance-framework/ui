// Rounds 3-4 (design §13.4, §13.5) in the Policies view: evidence identity (R78, with R82's
// automatic continuity policy_id: Override no longer inserts one, stream labels, fork
// warnings, template policy_id) and the R79 gate for plugins built on an agent library
// without inline-policy support.
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

/**
 * Sets (or, when undefined, drops) the inline bundles' reported `extends.plugin-path` (R78):
 * the tests opt in to it, so "no plugin path" stays the default.
 */
function withExtendsPath(
  d: AgentInstanceDetail,
  path: string | undefined,
): AgentInstanceDetail {
  return {
    ...d,
    policyBundles: d.policyBundles.map((b) => {
      if (!b.extends) return b;
      const { pluginPath: _drop, ...ext } = b.extends;
      void _drop;
      return {
        ...b,
        extends: path === undefined ? ext : { ...ext, pluginPath: path },
      };
    }),
  };
}

function api(
  opts: {
    pluginPath?: string;
    /** The inline bundle's `extends.plugin-path` (the source was swapped out everywhere). */
    extendsPluginPath?: string;
    plugins?: PluginReport[];
    sources?: Record<string, string>;
  } = {},
): AgentConfigApi {
  const detailA: AgentInstanceDetail = {
    ...withExtendsPath(instanceDetailA, opts.extendsPluginPath),
    plugins: opts.plugins ?? null,
    policyBundles: [
      ...withExtendsPath(instanceDetailA, opts.extendsPluginPath).policyBundles,
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
      return withExtendsPath(
        detailFor(s, configRev7.overlay ?? {}),
        opts.extendsPluginPath,
      );
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

const stream = (w: ReturnType<typeof mount>, path: string) =>
  row(w, path).find('[data-test="file-stream"]');

describe('R82: modules that continue a vendor file keep its stream automatically', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
  });

  it('Override pre-fills the vendor source without inserting a policy_id', async () => {
    const { wrapper, ws } = await mountWorkspace(
      api({ pluginPath: VENDOR_PATH }),
    );
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(SSH_SRC['root_login.rego']);
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'automatic',
    );
    expect(stream(wrapper, 'root_login.rego').text()).toBe(
      'continues vendor stream (automatic)',
    );
    expect(wrapper.find('[data-test="stream-identity"]').text()).toContain(
      'continues vendor stream (automatic)',
    );
    // The id the agent appends: the literal <plugin-path>/<file> (R77).
    expect(wrapper.find('[data-test="stream-automatic-id"]').text()).toBe(
      'policy_id := "./policies/ssh//root_login.rego"',
    );
    expect(wrapper.find('[data-test="stream-fork"]').exists()).toBe(false);
  });

  it("after the swap the automatic id uses the inline bundle's extends.plugin-path", async () => {
    const { wrapper } = await mountWorkspace(
      api({ extendsPluginPath: VENDOR_PATH }),
    );
    await override(wrapper, 'root_login.rego');
    expect(wrapper.find('[data-test="stream-automatic-id"]').text()).toBe(
      'policy_id := "./policies/ssh//root_login.rego"',
    );
  });

  it('prefers a report entry loading the vendor source directly over extends.plugin-path', async () => {
    const { wrapper } = await mountWorkspace(
      api({ pluginPath: VENDOR_PATH, extendsPluginPath: 'other/path' }),
    );
    await override(wrapper, 'root_login.rego');
    expect(wrapper.find('[data-test="stream-automatic-id"]').text()).toContain(
      '"./policies/ssh//root_login.rego"',
    );
  });

  it('without a reported plugin path the override still continues (no new-stream notice)', async () => {
    const { wrapper, ws } = await mountWorkspace(api());
    await override(wrapper, 'root_login.rego');
    expect(modules(ws)['root_login.rego']).toBe(SSH_SRC['root_login.rego']);
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'automatic',
    );
    expect(wrapper.find('[data-test="stream-fork"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('will start a new stream');
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
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'continues',
    );
  });

  it('labels inherited vendor modules as continuing automatically', async () => {
    const { wrapper } = await mountWorkspace(api({ pluginPath: VENDOR_PATH }));
    for (const path of ['banner.rego', 'root_login.rego']) {
      expect(row(wrapper, path).attributes('data-state')).toBe('inherited');
      expect(stream(wrapper, path).attributes('data-stream')).toBe('automatic');
    }
    // Vendor tests have no stream.
    expect(stream(wrapper, 'banner_test.rego').exists()).toBe(false);
    // r7's override keeps the vendor path and package: automatic too.
    expect(
      stream(wrapper, 'max_auth_tries.rego').attributes('data-stream'),
    ).toBe('automatic');
    // Viewing an inherited module shows its stream.
    await row(wrapper, 'banner.rego')
      .find('[data-action="view"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="stream-identity"]').text()).toContain(
      'continues vendor stream (automatic)',
    );
  });

  it('warns only when an edit forks the stream: another policy_id or package', async () => {
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
    const withId = (id: string) =>
      text.replace(
        'import rego.v1\n',
        `import rego.v1\n\npolicy_id := "${id}"\n`,
      );

    // The continuity id, written out: same stream, no warning.
    ws.draft.set(MOD, withId('./policies/ssh//root_login.rego'));
    await flushPromises();
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'continues',
    );
    expect(wrapper.find('[data-test="stream-fork"]').exists()).toBe(false);

    ws.draft.set(MOD, withId('mine'));
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
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'own',
    );

    ws.draft.set(MOD, text.replace('root_login', 'renamed'));
    await flushPromises();
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'new',
    );
    expect(stream(wrapper, 'root_login.rego').text()).toBe('new stream');
    expect(
      diags().some((d) => d.message.startsWith('[policy-package-changed]')),
    ).toBe(true);
    expect(wrapper.find('[data-test="validation-panel"]').text()).toContain(
      'Package changed: new evidence stream',
    );

    // Back to the vendor text: no warning.
    ws.draft.set(MOD, text);
    await flushPromises();
    expect(wrapper.find('[data-test="stream-fork"]').exists()).toBe(false);
  });

  it("a multi-module package shows the agent's skip as a warning", async () => {
    const { wrapper, ws } = await mountWorkspace(
      api({ pluginPath: VENDOR_PATH }),
    );
    // A new module in root_login's package: the agent adds no continuity id to either.
    ws.draft.set(
      '/policy_bundles/ssh-tuned/modules/root_login_extra.rego',
      'package compliance_framework.root_login\n\nimport rego.v1\n\ntitle := "extra"\n',
    );
    await flushPromises();
    expect(stream(wrapper, 'root_login.rego').attributes('data-stream')).toBe(
      'path',
    );
    expect(
      wrapper.find('[data-file="root_login.rego"]').attributes('data-state'),
    ).toBe('inherited');
    await row(wrapper, 'root_login.rego')
      .find('[data-action="view"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="stream-fork"]').text()).toContain(
      'the agent does not add the continuity policy_id here',
    );
    expect(wrapper.find('[data-test="validation-panel"]').text()).toContain(
      'No automatic policy_id: new evidence stream',
    );
    // The other packages are unaffected.
    expect(stream(wrapper, 'banner.rego').attributes('data-stream')).toBe(
      'automatic',
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
    expect(stream(wrapper, 'checks/new.rego').attributes('data-stream')).toBe(
      'own',
    );
    // Without its policy_id a brand-new module is path-based.
    ws.draft.set(
      '/policy_bundles/ssh-tuned/modules/checks~1new.rego',
      text.replace(/\npolicy_id := .*\n/, '\n'),
    );
    await flushPromises();
    expect(stream(wrapper, 'checks/new.rego').text()).toBe(
      'new stream (path-based)',
    );
  });

  it('explains that inherited and same-package overrides continue automatically', async () => {
    const { wrapper } = await mountWorkspace(api());
    const hint = wrapper.find('[data-test="inherited-stream-hint"]').text();
    expect(hint).toContain('automatically');
    expect(hint).not.toContain('new, path-based streams');
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
