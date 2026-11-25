import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InheritedImplementation from '../InheritedImplementation.vue';
import {
  inheritedImplementation,
  type InheritedImplementation as Inherited,
} from '../useInheritedImplementations';
import type { LeveragedControl } from '@/types/ssp-leverage';

const link = {
  id: 'l1',
  controlId: 'INT-AZ',
  statementId: 'INT-AZ_smt',
  inheritedFrom: {
    upstreamSspId: 'up-1',
    offeringId: 'o1',
    offeringTitle: 'Platform — Shared capabilities',
    offeringVersion: 2,
  },
  providedUuid: 'p1',
  byComponentId: 'bc-up',
  satisfaction: 'partial',
  status: 'active',
  responsibilities: [
    { responsibilityUuid: 'r1', description: 'Spread across zones.' },
    { responsibilityUuid: 'r2', description: 'Set resource requests.' },
  ],
  outstandingResponsibilities: [
    { responsibilityUuid: 'r1', description: 'Spread across zones.' },
  ],
  responsibilityPosture: { r1: 'not-satisfied', r2: 'unknown' },
} as LeveragedControl;

describe('inheritedImplementation', () => {
  it('marks each responsibility met unless outstanding, with its evidence', () => {
    expect(inheritedImplementation(link, 'Zone capacity.')).toEqual({
      upstreamSspId: 'up-1',
      offeringTitle: 'Platform — Shared capabilities',
      offeringVersion: 2,
      status: 'active',
      provided: 'Zone capacity.',
      responsibilities: [
        {
          uuid: 'r1',
          description: 'Spread across zones.',
          met: false,
          evidence: 'not-satisfied',
        },
        {
          uuid: 'r2',
          description: 'Set resource requests.',
          met: true,
          evidence: 'unknown',
        },
      ],
    });
  });
});

describe('InheritedImplementation', () => {
  const mountBlock = (inherited: Inherited, satisfied = [] as unknown[]) =>
    mount(InheritedImplementation, {
      props: { inherited, name: 'Platform', satisfied } as never,
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });

  it('says where the implementation comes from, what it provides and what is left to this system', () => {
    const wrapper = mountBlock(
      inheritedImplementation(link, 'Zone capacity.'),
      [
        {
          uuid: 's2',
          responsibilityUuid: 'r2',
          description: 'Every deployment sets requests in its Helm values.',
        },
      ],
    );
    const text = wrapper.text();
    expect(text).toMatch(
      /Inherited from Platform\s*Through Platform — Shared capabilities, version 2\s*Zone capacity\./,
    );
    expect(wrapper.findAll('.pill').map((p) => p.text())).toEqual([
      'Not met',
      'Evidence: not satisfied',
      'Met',
    ]);
    // This system's note, where it says more than the responsibility.
    expect(text).toContain(
      'Every deployment sets requests in its Helm values.',
    );
  });

  it('flags a link that is no longer active, and skips a note that repeats the responsibility', () => {
    const wrapper = mountBlock(
      { ...inheritedImplementation(link, undefined), status: 'drifted' },
      [
        {
          uuid: 's2',
          responsibilityUuid: 'r2',
          description: 'Set resource requests.',
        },
      ],
    );
    expect(wrapper.findAll('.pill')[0]!.text()).toBe('Drifted');
    expect(wrapper.text().match(/Set resource requests\./g)).toHaveLength(1);
  });
});
