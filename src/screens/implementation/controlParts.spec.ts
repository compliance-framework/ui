import { describe, expect, it } from 'vitest';
import type { Control, ImplementedRequirement } from '@/oscal';
import { CCF_OSCAL_NAMESPACE } from '@/types/subjects';
import {
  implementationRequired,
  implementationSummary,
  partMap,
  withImplementationRequired,
} from './controlParts';

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
    expect(map.bands[2]).toMatchObject({
      label: '1.',
      prose: 'Authorized users;',
    });
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
        label: '',
        prose: 'Identify users.',
        depth: 0,
        statement: undefined,
        required: true,
      },
    ]);
  });
});

describe('implementationSummary', () => {
  it('counts the statements, those a component implements, and implementations by status', () => {
    const summary = implementationSummary(
      partMap(control, {
        uuid: 'r',
        controlId: 'ac-2',
        byComponents: [bc('w', 'c1', 'partial')],
        statements: [
          {
            uuid: 's1',
            statementId: 'ac-2_smt.a',
            byComponents: [bc('a1', 'c1', 'implemented'), bc('a2', 'c2')],
          },
        ],
      } as ImplementedRequirement),
    );
    expect(summary).toEqual({
      statements: 3,
      implemented: 1,
      statusCounts: [
        { status: 'implemented', count: 1 },
        { status: 'partial', count: 1 },
        { status: 'no-status', count: 1 },
      ],
    });
  });

  it('counts a control without parts as one statement, implemented by whole-control components', () => {
    const plain = {
      id: 'ac-3',
      title: 'Access Enforcement',
      parts: [],
    } as Control;
    expect(implementationSummary(partMap(plain, undefined))).toEqual({
      statements: 1,
      implemented: 0,
      statusCounts: [],
    });
    expect(
      implementationSummary(
        partMap(plain, {
          uuid: 'r',
          controlId: 'ac-3',
          byComponents: [bc('w', 'c1', 'planned'), bc('x', 'c2', 'planned')],
        } as ImplementedRequirement),
      ),
    ).toMatchObject({
      statements: 1,
      implemented: 1,
      statusCounts: [{ status: 'planned', count: 2 }],
    });
  });
});

describe('implementation required', () => {
  const mark = {
    ns: CCF_OSCAL_NAMESPACE,
    name: 'implementation-required',
    value: 'false',
  };

  it('leaves parts that need no statement out of the count', () => {
    const map = partMap(control, {
      uuid: 'r',
      controlId: 'ac-2',
      statements: [
        { uuid: 's1', statementId: 'ac-2_smt.b', props: [mark] },
        {
          uuid: 's2',
          statementId: 'ac-2_smt.b.1',
          byComponents: [bc('b1', 'c1', 'implemented')],
        },
      ],
    } as ImplementedRequirement);
    expect(map.bands.map((b) => b.required)).toEqual([true, false, true]);
    expect(implementationSummary(map)).toMatchObject({
      statements: 2,
      implemented: 1,
    });
  });

  it("sets and clears the mark, keeping the statement's other properties", () => {
    const other = { name: 'note', value: 'x' };
    const marked = withImplementationRequired([other], false);
    expect(marked).toEqual([other, mark]);
    expect(
      implementationRequired({ uuid: 's', statementId: 'x', props: marked }),
    ).toBe(false);
    expect(withImplementationRequired(marked, true)).toEqual([other]);
    expect(implementationRequired(undefined)).toBe(true);
  });
});
