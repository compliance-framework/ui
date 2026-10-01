// R75/R88: the agent's policy warnings on the revision it runs (e.g. policy-stream-forked,
// bundle-level with an empty path) are listed with their code label.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentInstanceSummary, PolicyError } from '@/types/agent-config';
import { instancesMixed } from '@/composables/agent-config/__tests__/fixtures';
import { deriveInstanceState } from '@/utils/agent-config/instance-status';
import { policyErrorLocation } from '@/utils/agent-config/display';
import InstanceModeNotice from '../InstanceModeNotice.vue';
import { globalWith, piniaWith, READER } from './helpers';

const FORKED: PolicyError = {
  bundle: 'ssh-tuned',
  path: '',
  message: 'the bundle starts new evidence streams',
  severity: 'warning',
  code: 'policy-stream-forked',
};
const PARSE: PolicyError = {
  bundle: 'ssh-tuned',
  path: 'main.rego',
  row: 3,
  message: 'unexpected token',
  severity: 'error',
  code: 'rego-parse-error',
};

function mountNotice(over: Partial<AgentInstanceSummary>) {
  const instance = { ...instancesMixed.items[0], ...over };
  return mount(InstanceModeNotice, {
    props: { instance, state: deriveInstanceState(instance, 7) },
    global: globalWith(piniaWith(READER)),
  });
}

describe('policyErrorLocation', () => {
  it('is the bundle alone for a bundle-level problem', () => {
    expect(policyErrorLocation(FORKED)).toBe('ssh-tuned');
    expect(policyErrorLocation(PARSE)).toBe('ssh-tuned/main.rego:3:1');
  });
});

describe('InstanceModeNotice: reported policy warnings', () => {
  it('lists warning-severity policy errors of an applied revision', () => {
    const w = mountNotice({ policyErrors: [FORKED, PARSE] });
    const block = w.find('[data-test="policy-warnings"]');
    expect(block.exists()).toBe(true);
    const items = block.findAll('li');
    expect(items).toHaveLength(1);
    expect(items[0].find('code').text()).toBe('ssh-tuned');
    expect(items[0].text()).toContain('New evidence stream');
    expect(items[0].text()).toContain('starts new evidence streams');
  });

  it('shows nothing without warnings', () => {
    const w = mountNotice({ policyErrors: [] });
    expect(w.find('[data-test="policy-warnings"]').exists()).toBe(false);
  });

  it('lists them once, in the rejection details, for rejected-invalid', () => {
    const w = mountNotice({
      status: 'rejected',
      reason: 'policy-errors',
      syncStatus: 'out-of-sync',
      policyErrors: [FORKED, PARSE],
    });
    expect(w.find('[data-test="policy-warnings"]').exists()).toBe(false);
    const details = w.find('[data-test="rejection-details"]');
    const codes = details.findAll('li code').map((c) => c.text());
    expect(codes).toEqual(['ssh-tuned', 'ssh-tuned/main.rego:3:1']);
    expect(details.text()).toContain('Parse error');
  });
});
