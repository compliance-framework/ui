// policy_data lists whose value differs between the instances' files carry the same
// "differs across instances" warning as the other editors (FieldHints): a list edit writes one
// list for every instance.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  type VueWrapper,
} from '@vue/test-utils';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { AgentInstanceDetail, ConfigDoc } from '@/types/agent-config';
import {
  baseConfig,
  configRev7,
  instanceDetailA,
  instanceIds,
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

enableAutoUnmount(afterEach);

const PD = '/plugins/local-ssh/policy_data';
const POLICY_DATA = {
  max_auth_tries: 4,
  users: ['root', 'admin'],
  ports: [22],
};

function detailWith(policyData: Record<string, unknown>): AgentInstanceDetail {
  const base = clone(baseConfig) as ConfigDoc;
  base.plugins!['local-ssh']!.policy_data = clone(policyData);
  return { ...instanceDetailA, base, effective: base };
}

async function mountSection(perms: Record<string, string[]>) {
  // ip-b's file has another user list and another max_auth_tries; the ports agree.
  const api = fakeApi({
    getConfig: vi.fn().mockResolvedValue({ ...configRev7, overlay: {} }),
    getInstance: vi.fn(async (_a: string, id: string) =>
      id === instanceIds.b
        ? detailWith({ ...POLICY_DATA, max_auth_tries: 6, users: ['root'] })
        : detailWith(POLICY_DATA),
    ),
  });
  const host = workspaceHost(api, PolicyDataSection, () => ({
    plugin: 'local-ssh',
    reported: POLICY_DATA,
    provenance: 'file',
  }));
  const wrapper = mount(host, { global: globalWith(piniaWith(perms)) });
  await flushPromises();
  return wrapper;
}

const differs = (w: VueWrapper, rel: string) =>
  w.find(`[data-test="pd-differs-${PD}/${rel}"]`);

describe('policy_data: lists that differ across instances', () => {
  beforeEach(() => resetAgentDrafts());

  it('warns on a list whose value differs between the files', async () => {
    const w = await mountSection(ADMIN);
    expect(w.find(`[data-test="pd-node-${PD}/users"]`).exists()).toBe(true);
    expect(differs(w, 'users').text()).toBe('differs across instances');
    // A list the files agree on, and a scalar (written at its own pointer), carry no warning.
    expect(w.find(`[data-test="pd-node-${PD}/ports"]`).exists()).toBe(true);
    expect(differs(w, 'ports').exists()).toBe(false);
    expect(differs(w, 'max_auth_tries').exists()).toBe(false);
  });

  it('is an editing hint: readers do not see it', async () => {
    const w = await mountSection(READER);
    expect(w.find(`[data-test="pd-node-${PD}/users"]`).exists()).toBe(true);
    expect(differs(w, 'users').exists()).toBe(false);
  });
});
