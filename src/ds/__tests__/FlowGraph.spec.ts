import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FlowGraph from '../components/FlowGraph/FlowGraph.vue';
import { layoutFlow } from '../components/FlowGraph/flowLayout';

const nodes = [
  { id: 'a', title: 'Collect', order: 1, dependsOn: [] },
  { id: 'b', title: 'Review', order: 2, dependsOn: ['a'] },
  { id: 'c', title: 'Approve', order: 3, dependsOn: ['b'] },
  { id: 'd', title: 'Notify', order: 4, dependsOn: ['a'] },
];

describe('layoutFlow', () => {
  it('puts each node to the right of everything it depends on', () => {
    const { nodes: placed, edges } = layoutFlow(nodes);
    const column = Object.fromEntries(placed.map((n) => [n.id, n.column]));
    expect(column.a).toBeLessThan(column.b);
    expect(column.b).toBeLessThan(column.c);
    // A leaf sits just after its parent, not at the far right.
    expect(column.d).toBe(column.a + 1);
    expect(edges.map((e) => `${e.from}>${e.to}`)).toEqual([
      'a>b',
      'b>c',
      'a>d',
    ]);
  });

  it('ignores unknown dependencies and survives a cycle', () => {
    const { nodes: placed, edges } = layoutFlow([
      { id: 'x', title: 'X', order: 1, dependsOn: ['y', 'missing'] },
      { id: 'y', title: 'Y', order: 2, dependsOn: ['x'] },
    ] as never);
    expect(placed).toHaveLength(2);
    expect(edges).toHaveLength(2);
  });

  it('is empty for no nodes', () => {
    expect(layoutFlow([])).toEqual({
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
    });
  });
});

describe('FlowGraph', () => {
  it('renders each node as a button, marks the selected one and emits select', async () => {
    const wrapper = mount(FlowGraph, {
      props: { label: 'Steps', nodes, selected: 'b' },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons.map((b) => b.text())).toEqual([
      'Collect',
      'Review',
      'Approve',
      'Notify',
    ]);
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe(
      'Steps',
    );

    await buttons[2].trigger('click');
    expect(wrapper.emitted('select')).toEqual([['c']]);
  });
});
