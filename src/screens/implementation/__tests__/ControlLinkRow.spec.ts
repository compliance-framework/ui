import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Control, ImplementedRequirement } from '@/oscal';
import ControlLinkRow from '../ControlLinkRow.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

vi.mock(
  '@/views/control-implementations/partials/ControlEvidenceCounter.vue',
  () => ({
    default: { template: '<span />' },
  }),
);
vi.mock(
  '@/views/control-implementations/partials/IndexControlImplementation.vue',
  () => ({
    default: { template: '<span />' },
  }),
);

const control = {
  id: 'ac-2',
  title: 'Account Management',
  parts: [{ id: 'ac-2_smt', name: 'statement', prose: 'Manage accounts.' }],
} as Control;

const implementation = {
  uuid: 'req-1',
  controlId: 'ac-2',
  remarks: 'Split between two identity services.',
  byComponents: [
    { uuid: 'bc-w', componentUuid: 'this', description: 'No local accounts.' },
  ],
  statements: [
    { uuid: 's-10', statementId: 'ac-2_smt.j', byComponents: [] },
    {
      uuid: 's-1',
      statementId: 'ac-2_smt.a',
      byComponents: [
        {
          uuid: 'bc-a',
          componentUuid: 'okta',
          description: 'Account types are Okta groups.',
          implementationStatus: { state: 'partial' },
        },
      ],
    },
  ],
} as unknown as ImplementedRequirement;

function mountRow(impl?: ImplementedRequirement) {
  const context = {
    sspId: () => 'ssp-1',
    suggestionsEnabled: () => false,
    implementation: () => impl,
    component: (uuid: string) =>
      ({ okta: { title: 'Okta' }, this: { title: 'This system' } })[uuid],
    filters: () => [],
    byComponentCount: () => 0,
    riskCount: () => 0,
    riskSeverity: () => undefined,
    suggestionCount: () => 0,
    highlighted: () => false,
    openDrawer: vi.fn(),
    risksLink: () => ({}),
    onExported: vi.fn(),
    onImported: vi.fn(),
    onStatementsClosed: vi.fn(),
  } as unknown as ControlTreeContext;
  const Host = defineComponent({
    setup() {
      provideControlTree(context);
      return () => h(ControlLinkRow, { control });
    },
  });
  return mount(Host, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        Tooltip: { template: '<slot />' },
      },
    },
  });
}

describe('ControlLinkRow', () => {
  it('lists the components under each statement, whole-control ones first, in part order', () => {
    const box = mountRow(implementation).get(
      'section[aria-label="Implementation"]',
    );
    const text = box.text();
    const order = [
      'Split between two identity services.',
      'Whole control',
      'This system',
      'ac-2_smt.a',
      'Okta',
      'Partial',
      'ac-2_smt.j',
      'No component implements it yet.',
    ].map((part) => text.indexOf(part));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('says when the control is not implemented', () => {
    expect(
      mountRow(undefined).get('section[aria-label="Implementation"]').text(),
    ).toContain('Not implemented yet.');
  });
});
