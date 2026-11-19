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
  parts: [
    {
      id: 'ac-2_smt',
      name: 'statement',
      parts: ['a', 'b', 'j'].map((l) => ({
        id: `ac-2_smt.${l}`,
        name: 'item',
        prose: `Part ${l}.`,
      })),
    },
  ],
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
    controlLink: (id: string) => ({ query: { control: id } }),
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
  it('summarises the implementation: parts covered, statuses and components', () => {
    const box = mountRow(implementation).get(
      'section[aria-label="Implementation"]',
    );
    expect(box.text()).toContain('Statements for 1 of 3 parts');
    expect(box.text()).toContain('1 partial, 1 without a status');
    expect(box.text()).toContain('This system, Okta');
    // The text itself is in the control's view.
    expect(box.text()).not.toContain('Account types are Okta groups.');
  });

  it('links its title to the control view', () => {
    const link = mountRow(implementation).get(
      'section[aria-label="Control"] a',
    );
    expect(link.text()).toBe('Account Management');
  });

  it('says when the control is not implemented', () => {
    expect(
      mountRow(undefined).get('section[aria-label="Implementation"]').text(),
    ).toContain('Not implemented yet.');
  });
});
