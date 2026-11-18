import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LineChart from '../components/LineChart/LineChart.vue';

const series = (count: number) => [
  {
    name: 'Agents responding',
    points: Array.from({ length: count }, (_, i) => ({
      x: `t${String(i).padStart(5, '0')}`,
      y: i % 5,
    })),
  },
];
// Plotted markers carry a title; the legend's key marker doesn't.
const plotted = (wrapper: ReturnType<typeof mountChart>) =>
  wrapper
    .findAll('.line-chart__marker')
    .filter((m) => m.find('title').exists());
const mountChart = (count: number) =>
  mount(LineChart, {
    props: {
      label: 'Agents responding over time',
      series: series(count),
      yLabel: 'Agents',
      xLabel: 'Time',
      yMax: 5,
    },
    global: { stubs: { Tooltip: { template: '<slot />' } } },
  });

describe('LineChart', () => {
  it('marks every point of a short line', () => {
    const wrapper = mountChart(30);
    expect(plotted(wrapper)).toHaveLength(30);
    expect(
      wrapper.find('.line-chart__series--1 .line-chart__line').exists(),
    ).toBe(true);
  });

  it('draws only the line when there are too many points to mark', () => {
    const wrapper = mountChart(5000);
    expect(plotted(wrapper)).toHaveLength(0);
    // The last line path is the plotted one; the legend's key comes first.
    const path = wrapper.findAll('.line-chart__line').at(-1)!.attributes('d')!;
    // Every point is still on the line, spread from left to right.
    expect(path.split(' ')).toHaveLength(5000);
    const xs = path
      .split(' ')
      .map((step) => Number(step.slice(1).split(',')[0]));
    expect(xs[0]).toBeLessThan(xs[4999]!);
  });
});
