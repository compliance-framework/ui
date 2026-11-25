import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Control, ImplementedRequirement } from '@/oscal';
import ControlRowImplementation from '../ControlRowImplementation.vue';
import ControlRowStatus from '../ControlRowStatus.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

vi.mock('@/screens/EvidenceCapsule.vue', () => ({
  default: {
    props: ['controlId', 'quiet'],
    template: '<span>{{ quiet ? "" : "evidence for " + controlId }}</span>',
  },
}));

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
      return () =>
        h('div', [
          h(ControlRowStatus, { control }),
          h(ControlRowImplementation, { control }),
        ]);
    },
  });
  return mount(Host, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

describe('ControlRowStatus and ControlRowImplementation', () => {
  it('counts the implementations by status, beside the risks and evidence', () => {
    const wrapper = mountStatus(
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
              {
                uuid: 'bc2',
                componentUuid: 'iam',
                description: 'y',
                implementationStatus: { state: 'partial' },
              },
            ],
          },
          {
            uuid: 's2',
            statementId: 'ac-2_smt.b',
            byComponents: [
              {
                uuid: 'bc3',
                componentUuid: 'okta',
                description: 'z',
                implementationStatus: { state: 'implemented' },
              },
            ],
          },
        ],
      } as unknown as ImplementedRequirement,
      2,
    );
    const text = wrapper.text();
    // Counts, not each component: the control's view has those.
    expect(wrapper.findAll('.pill').map((p) => p.text())).toEqual([
      '2 implemented',
      '1 partial',
    ]);
    expect(text).not.toContain('Okta');
    expect(text).toContain('2 open risks (high)');
    // Its evidence, not a count of its filters, which are in the control's view.
    expect(text).not.toContain('evidence filter');
    expect(text).toContain('evidence for ac-2');
  });

  it('shows no counts when no component implements a control', () => {
    const wrapper = mountStatus();
    expect(wrapper.findAll('.pill')).toHaveLength(0);
    expect(wrapper.text()).toBe('evidence for ac-2');
  });
});
