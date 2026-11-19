import { describe, expect, it } from 'vitest';
import type { TreeNode } from '@/composables/useCatalogTree';
import type { Control, Group } from '@/oscal';
import { controlSections } from './controlSections';

const control = (id: string, title = id, children: TreeNode[] = []) =>
  ({
    key: id,
    label: title,
    type: 'control',
    data: { id, title } as Control,
    children,
  }) as TreeNode;
const group = (title: string, children: TreeNode[]) =>
  ({
    key: title,
    label: title,
    type: 'group',
    data: { id: title, title } as Group,
    children,
  }) as TreeNode;
const profile = (children: TreeNode[]) => group('profile', children);
const ids = (sections: ReturnType<typeof controlSections>) =>
  sections.map((s) => [s.title, s.controls.map((c) => c.id)]);

describe('controlSections', () => {
  it('merges the groups profiles share and lists a shared control once', () => {
    const a = profile([group('Access', [control('ac-1'), control('ac-2')])]);
    const b = profile([
      group('Access', [control('ac-2'), control('ac-3')]),
      group('Audit', [control('au-1')]),
    ]);
    expect(ids(controlSections([a, b], ''))).toEqual([
      ['Access', ['ac-1', 'ac-2', 'ac-3']],
      ['Audit', ['au-1']],
    ]);
  });

  it('makes each nested group a section, leaving out enhancements and withdrawn controls', () => {
    const withdrawn = control('ac-13');
    (withdrawn.data as Control).props = [
      { name: 'status', value: 'withdrawn' },
    ];
    const p = profile([
      group('Access', [
        control('ac-2', 'Accounts', [control('ac-2.1')]),
        withdrawn,
        group('Remote', [control('ac-17')]),
      ]),
      control('x-1'),
    ]);
    expect(ids(controlSections([p], ''))).toEqual([
      ['Access', ['ac-2']],
      ['Access › Remote', ['ac-17']],
      ['Ungrouped', ['x-1']],
    ]);
  });

  it('keeps the controls matching the search by ID or title, dropping empty sections', () => {
    const p = profile([
      group('Access', [control('ac-2', 'Account management')]),
      group('Audit', [control('au-1', 'Audit policy')]),
    ]);
    expect(ids(controlSections([p], ' ACCOUNT '))).toEqual([
      ['Access', ['ac-2']],
    ]);
  });
});
