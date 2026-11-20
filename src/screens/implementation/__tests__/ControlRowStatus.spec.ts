import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Control, ImplementedRequirement } from '@/oscal';
import ControlRowStatus from '../ControlRowStatus.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

vi.mock(
  '@/views/control-implementations/partials/ControlEvidenceCounter.vue',
  () => ({ default: { template: '<span>evidence</span>' } }),
);

const control = {
  id: 'ac-2',
  title: 'Account Management',
  parts: [
    {
      id: 'ac-2_smt',
      name: 'statement',
      parts: [
        { id: 'ac-2_smt.a', name: 'item', prose: 'Define;' },
        { id: 'ac-2_smt.b', name: 'item', prose: 'Assign;' },
      ],
    },
  ],
} as Control;

function mountStatus(implementation?: ImplementedRequirement, risks = 0) {
  const context = {
    sspId: () => 'ssp-1',
    implementation: () => implementation,
    component: (uuid: string) =>
      uuid === 'okta' ? { uuid, title: 'Okta' } : undefined,
    filters: () => [{ id: 'f1', name: 'MFA' }],
    riskCount: () => risks,
    riskSeverity: () => 'high',
    risksLink: () => ({ name: 'risks:index' }),
    suggestionsEnabled: () => false,
    suggestionCount: () => 0,
  } as unknown as ControlTreeContext;
  const Host = defineComponent({
    setup() {
      provideControlTree(context);
      return () => h(ControlRowStatus, { control });
    },
  });
  return mount(Host, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

describe('ControlRowStatus', () => {
  it('summarises the implementation, filters and risks in one line', () => {
    const text = mountStatus(
      {
        uuid: 'r',
        controlId: 'ac-2',
        statements: [
          {
            uuid: 's',
            statementId: 'ac-2_smt.a',
            byComponents: [
              {
                uuid: 'bc',
                componentUuid: 'okta',
                description: 'x',
                implementationStatus: { state: 'implemented' },
              },
            ],
          },
        ],
      } as unknown as ImplementedRequirement,
      2,
    ).text();
    expect(text).toContain('2 open risks (high)');
    expect(text).toContain('1 of 2 parts');
    expect(text).toContain('Okta: implemented');
    expect(text).toContain('1 evidence filter');
  });

  it('says when a control is not implemented yet', () => {
    expect(mountStatus().text()).toContain('Not implemented yet');
  });
});
