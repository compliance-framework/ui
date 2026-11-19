import { describe, expect, it } from 'vitest';
import type { Control, ImplementedRequirement } from '@/oscal';
import { implementationSummary, partMap } from './controlParts';

const control = {
  id: 'ac-2',
  title: 'Account Management',
  params: [{ id: 'p1', label: 'time period' }],
  parts: [
    {
      id: 'ac-2_smt',
      name: 'statement',
      prose: 'The organization:',
      parts: [
        {
          id: 'ac-2_smt.a',
          name: 'item',
          prose: 'Review every {{ insert: param, p1 }};',
          props: [{ name: 'label', value: 'a.' }],
        },
        {
          id: 'ac-2_smt.b',
          name: 'item',
          prose: 'Specify:',
          props: [{ name: 'label', value: 'b.' }],
          parts: [
            {
              id: 'ac-2_smt.b.1',
              name: 'item',
              prose: 'Authorized users;',
              props: [{ name: 'label', value: '1.' }],
            },
          ],
        },
      ],
    },
  ],
} as Control;

const bc = (uuid: string, componentUuid: string, state?: string) => ({
  uuid,
  componentUuid,
  description: uuid,
  ...(state ? { implementationStatus: { state } } : {}),
});

describe('partMap', () => {
  it('lays each statement beside the part it implements, whatever the case of its ID', () => {
    const map = partMap(control, {
      uuid: 'r',
      controlId: 'ac-2',
      byComponents: [bc('w', 'c1', 'implemented')],
      statements: [
        { uuid: 's1', statementId: 'AC-2_smt.b', byComponents: [] },
        { uuid: 's3', statementId: 'ac-2_smt.b.1', byComponents: [] },
        { uuid: 's2', statementId: 'foobar' },
      ],
    } as ImplementedRequirement);
    expect(map.lead).toBe('The organization:');
    expect(map.whole.map((b) => b.uuid)).toEqual(['w']);
    expect(
      map.bands.map((b) => [b.id, b.text, b.depth, b.statement?.uuid]),
    ).toEqual([
      [
        'ac-2_smt.a',
        'a. Review every [Assignment: organization-defined time period];',
        0,
        undefined,
      ],
      ['ac-2_smt.b', 'b. Specify:', 0, 's1'],
      ['ac-2_smt.b.1', '1. Authorized users;', 1, 's3'],
    ]);
    expect(map.others.map((s) => s.uuid)).toEqual(['s2']);
  });

  it('makes one band of a statement without parts', () => {
    const plain = {
      id: 'ia-2',
      title: 'Identification',
      parts: [{ id: 'ia-2_smt', name: 'statement', prose: 'Identify users.' }],
    } as Control;
    expect(partMap(plain, undefined).bands).toEqual([
      {
        id: 'ia-2_smt',
        text: 'Identify users.',
        depth: 0,
        statement: undefined,
      },
    ]);
  });
});

describe('implementationSummary', () => {
  it('counts the parts with components of their own, the statuses and the components', () => {
    const summary = implementationSummary(
      partMap(control, {
        uuid: 'r',
        controlId: 'ac-2',
        byComponents: [bc('w', 'c1', 'implemented')],
        statements: [
          {
            uuid: 's1',
            statementId: 'ac-2_smt.a',
            byComponents: [bc('a1', 'c1', 'partial'), bc('a2', 'c2')],
          },
        ],
      } as ImplementedRequirement),
    );
    expect(summary).toEqual({
      partsCovered: 1,
      partsTotal: 3,
      statusCounts: [
        { status: 'implemented', count: 1 },
        { status: 'partial', count: 1 },
      ],
      noStatus: 1,
      componentUuids: ['c1', 'c2'],
    });
  });
});
