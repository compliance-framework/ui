import { describe, expect, it } from 'vitest';
import { insertParams, partMarkdown, partOutline } from './oscal-parts';

describe('partMarkdown', () => {
  it('renders labelled sub-parts indented under their parent', () => {
    expect(
      partMarkdown({
        id: 's',
        name: 'statement',
        prose: 'The organization:',
        parts: [
          {
            id: 's.a',
            name: 'item',
            prose: 'Defines accounts;',
            props: [{ name: 'label', value: 'a.' }],
          },
          {
            id: 's.wrap',
            name: 'item',
            parts: [{ id: 's.b', name: 'item', prose: 'Reviews them.' }],
          },
        ],
      }),
    ).toBe('The organization:\n  a. Defines accounts;\n  Reviews them.\n');
  });
});

describe('insertParams', () => {
  const params = [
    { id: 'p1', label: 'prerequisites and criteria' },
    { id: 'p2', values: ['24 hours'] },
    { id: 'p3', label: 'time period' },
    {
      id: 'p4',
      select: {
        howMany: 'one-or-more' as const,
        choice: [
          'lock for {{ insert: param, p3 }} ',
          'notify the administrator',
        ],
      },
    },
  ];

  it('writes out assignments, values and selections as NIST prints them', () => {
    expect(
      insertParams(
        'Require {{ insert: param, p1 }}; within {{insert: param, p2}}; {{ insert: param, p4 }}.',
        params,
      ),
    ).toBe(
      'Require [Assignment: organization-defined prerequisites and criteria]; within 24 hours; [Selection (one or more): lock for [Assignment: organization-defined time period]; notify the administrator].',
    );
  });

  it('keeps an unknown parameter as its ID', () => {
    expect(insertParams('Use {{ insert: param, x9 }}.')).toBe('Use [x9].');
  });
});

describe('partOutline', () => {
  const label = (value: string) => [{ name: 'label', value }];
  it('keeps every item, its label, text and ID, at every depth', () => {
    const outline = partOutline({
      id: 'ac-1_smt',
      name: 'statement',
      parts: [
        {
          id: 'ac-1_smt.a',
          name: 'item',
          props: label('a.'),
          prose: 'Develop:',
          parts: [
            {
              id: 'ac-1_smt.a.1',
              name: 'item',
              props: label('1.'),
              prose: 'A policy that:',
              parts: [
                {
                  id: 'ac-1_smt.a.1.a',
                  name: 'item',
                  props: label('(a)'),
                  prose: 'Addresses purpose;',
                },
              ],
            },
          ],
        },
        {
          id: 'ac-1_smt.b',
          name: 'item',
          props: label('b.'),
          prose: 'Designate.',
        },
      ],
    });
    expect(outline.map((i) => [i.id, i.label, i.text])).toEqual([
      ['ac-1_smt.a', 'a.', 'Develop:'],
      ['ac-1_smt.b', 'b.', 'Designate.'],
    ]);
    expect(outline[0]!.items[0]!.items[0]).toMatchObject({
      id: 'ac-1_smt.a.1.a',
      label: '(a)',
      text: 'Addresses purpose;',
    });
  });

  it('skips a part with neither label nor prose in favour of its parts', () => {
    const outline = partOutline({
      id: 'x_smt',
      name: 'statement',
      parts: [
        {
          id: 'x_smt.w',
          name: 'wrapper',
          parts: [
            { id: 'x_smt.a', name: 'item', props: label('a.'), prose: 'One.' },
          ],
        },
      ],
    });
    expect(outline.map((i) => i.id)).toEqual(['x_smt.a']);
  });
});
