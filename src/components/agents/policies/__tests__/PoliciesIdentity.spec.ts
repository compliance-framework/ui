// Policy identity in the Policies view (design §13.4-13.7): Override pre-fills the vendor
// source and inserts nothing, the new-module template declares policy_id, and the agent's
// stream codes render with labels.
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
} from '@/composables/agent-config/__tests__/fixtures';
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

async function override(w: ReturnType<typeof mount>, path: string) {
  await row(w, path).find('[data-action="override"]').trigger('click');
  await flushPromises();
}

describe('Policies view: policy identity', () => {
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
    ])
      expect(panel).toContain(label);
    for (const message of ['pkg moved', 'id differs'])
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
  });
});
