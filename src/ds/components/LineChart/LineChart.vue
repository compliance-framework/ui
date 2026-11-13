<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import Button from '../Button/Button.vue';
import DataTable from '../DataTable/DataTable.vue';
import type { DataTableColumn } from '../DataTable/types';
import Text from '../Text/Text.vue';

/**
 * A line chart for trends (F-17 AC3, F-29). It has a y axis with gridlines and tick labels, x tick
 * labels thinned to fit, axis titles, and a legend. Each series has its own colour
 * (--ds-color-chart-1…3) and marker shape (circle, square, triangle), drawn on every point, so the
 * chart still works in greyscale. The SVG is an image named by a text summary, and "Show as table"
 * swaps in the same values as an accessible table. The surrounding Panel supplies the title.
 * The viewBox follows the rendered width, so tick labels keep their token size on a phone.
 */
interface LineChartSeries {
  name: string;
  points: { x: string; y: number }[];
}

const props = withDefaults(
  defineProps<{
    /** What is charted, in a sentence. Names the image and captions the table. */
    label: string;
    series: LineChartSeries[];
    yLabel: string;
    xLabel: string;
    yMax?: number;
    formatY?: (value: number) => string;
    formatX?: (value: string) => string;
  }>(),
  {
    yMax: 100,
    formatY: (value: number) => `${value}%`,
    formatX: (value: string) => value,
  },
);

const shapes = ['circle', 'square', 'triangle'] as const;
type Shape = (typeof shapes)[number];

const HEIGHT = 260;
const MARGIN = { top: 12, right: 16, bottom: 52, left: 64 };
const MARKER = 4;
/** Approximate advance of one monospace character at the caption size, for tick thinning. */
const CHAR_WIDTH = 7.5;
const TICK_GAP = 16;

const summaryId = useId();
const chartId = useId();
const showTable = ref(false);

const root = ref<HTMLElement | null>(null);
const width = ref(640);
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0)
      width.value = Math.round(entry.contentRect.width);
  });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

const xValues = computed(() => [
  ...new Set(props.series.flatMap((s) => s.points.map((p) => p.x))),
]);
/** Room for half the widest x label past the last point, so it never overflows. */
const longestX = computed(() =>
  Math.max(0, ...xValues.value.map((x) => props.formatX(x).length)),
);
const plot = computed(() => ({
  left: MARGIN.left,
  right:
    width.value - Math.max(MARGIN.right, (longestX.value * CHAR_WIDTH) / 2),
  top: MARGIN.top,
  bottom: HEIGHT - MARGIN.bottom,
}));

function xPos(x: string): number {
  const count = xValues.value.length;
  const { left, right } = plot.value;
  return count < 2
    ? (left + right) / 2
    : left + (xValues.value.indexOf(x) / (count - 1)) * (right - left);
}

function yPos(y: number): number {
  const { top, bottom } = plot.value;
  return (
    bottom -
    (Math.min(Math.max(y, 0), props.yMax) / props.yMax) * (bottom - top)
  );
}

const yTicks = computed(() =>
  [0, 1, 2, 3, 4].map((step) => {
    const value = (props.yMax / 4) * step;
    return { value, y: yPos(value), text: props.formatY(value) };
  }),
);

/** Every nth label, counted back from the latest point so the current one is always labelled. */
const xTicks = computed(() => {
  const labels = xValues.value.map((x) => props.formatX(x));
  const count = xValues.value.length;
  const spacing =
    count < 2 ? Infinity : (plot.value.right - plot.value.left) / (count - 1);
  const every = Math.max(
    1,
    Math.ceil((longestX.value * CHAR_WIDTH + TICK_GAP) / spacing),
  );
  return xValues.value
    .map((x, index) => ({
      x: xPos(x),
      text: labels[index]!,
      show: (count - 1 - index) % every === 0,
    }))
    .filter((tick) => tick.show);
});

const lines = computed(() =>
  props.series.map((s, index) => ({
    name: s.name,
    shape: shapes[index % shapes.length]!,
    colour: `line-chart__series--${(index % 3) + 1}`,
    path: s.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(p.x)},${yPos(p.y)}`)
      .join(' '),
    points: s.points.map((p) => ({
      key: p.x,
      cx: xPos(p.x),
      cy: yPos(p.y),
      title: `${s.name}, ${props.formatX(p.x)}: ${props.formatY(p.y)}`,
    })),
  })),
);

function markerPath(shape: Shape, cx: number, cy: number, r = MARKER): string {
  if (shape === 'square')
    return `M${cx - r},${cy - r} h${r * 2} v${r * 2} h${-r * 2} Z`;
  if (shape === 'triangle')
    return `M${cx},${cy - r * 1.2} L${cx + r * 1.15},${cy + r} L${cx - r * 1.15},${cy + r} Z`;
  return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
}

const summary = computed(() => {
  const parts = props.series.map((s) => {
    const first = s.points[0];
    const last = s.points.at(-1);
    if (!first || !last) return `${s.name}: no data`;
    return `${s.name}: ${props.formatY(first.y)} to ${props.formatY(last.y)}`;
  });
  const first = xValues.value[0];
  const last = xValues.value.at(-1);
  const range =
    first && last
      ? ` From ${props.formatX(first)} to ${props.formatX(last)}.`
      : '';
  return `${props.label}.${range} ${parts.join('; ')}.`;
});

const tableColumns = computed<DataTableColumn[]>(() => [
  { key: 'x', label: props.xLabel, nowrap: true },
  ...props.series.map((s, index) => ({
    key: `s${index}`,
    label: s.name,
    align: 'end' as const,
  })),
]);
const tableRows = computed(() =>
  xValues.value.map((x) => {
    const row: Record<string, string> = { x: props.formatX(x) };
    props.series.forEach((s, index) => {
      const point = s.points.find((p) => p.x === x);
      row[`s${index}`] = point ? props.formatY(point.y) : 'No data';
    });
    return { id: x, ...row };
  }),
);
</script>

<template>
  <Text v-if="series.length === 0" variant="secondary"
    >No data to chart yet.</Text
  >
  <div v-else ref="root" class="line-chart">
    <div class="line-chart__bar">
      <ul v-if="!showTable" class="line-chart__legend" aria-label="Legend">
        <li
          v-for="line in lines"
          :key="line.name"
          class="line-chart__legend-item"
        >
          <svg
            class="line-chart__swatch"
            :class="line.colour"
            viewBox="0 0 24 12"
            aria-hidden="true"
          >
            <path class="line-chart__line" d="M0,6 H24" />
            <path
              class="line-chart__marker"
              :d="markerPath(line.shape, 12, 6)"
            />
          </svg>
          <span>{{ line.name }}</span>
        </li>
      </ul>
      <Button
        size="sm"
        variant="tertiary"
        :icon="showTable ? 'chart' : 'table'"
        :aria-controls="chartId"
        @click="showTable = !showTable"
      >
        {{ showTable ? 'Show as chart' : 'Show as table' }}
      </Button>
    </div>

    <div :id="chartId">
      <DataTable
        v-if="showTable"
        :caption="label"
        :columns="tableColumns"
        :rows="tableRows"
        :row-key="(row) => row.id"
      />
      <template v-else>
        <p :id="summaryId" class="visually-hidden">{{ summary }}</p>
        <svg
          class="line-chart__svg"
          role="img"
          :aria-labelledby="summaryId"
          :viewBox="`0 0 ${width} ${HEIGHT}`"
          preserveAspectRatio="xMinYMin meet"
        >
          <g>
            <template v-for="tick in yTicks" :key="tick.value">
              <line
                :class="
                  tick.value === 0 ? 'line-chart__axis' : 'line-chart__grid'
                "
                :x1="plot.left"
                :x2="plot.right"
                :y1="tick.y"
                :y2="tick.y"
              />
              <text
                class="line-chart__tick"
                :x="plot.left - 8"
                :y="tick.y"
                text-anchor="end"
                dominant-baseline="middle"
              >
                {{ tick.text }}
              </text>
            </template>
            <line
              class="line-chart__axis"
              :x1="plot.left"
              :x2="plot.left"
              :y1="plot.top"
              :y2="plot.bottom"
            />
            <template v-for="tick in xTicks" :key="tick.text">
              <line
                class="line-chart__axis"
                :x1="tick.x"
                :x2="tick.x"
                :y1="plot.bottom"
                :y2="plot.bottom + 4"
              />
              <text
                class="line-chart__tick"
                :x="tick.x"
                :y="plot.bottom + 18"
                text-anchor="middle"
              >
                {{ tick.text }}
              </text>
            </template>
            <text
              class="line-chart__title"
              :x="(plot.left + plot.right) / 2"
              :y="HEIGHT - 8"
              text-anchor="middle"
            >
              {{ xLabel }}
            </text>
            <text
              class="line-chart__title"
              :transform="`translate(14 ${(plot.top + plot.bottom) / 2}) rotate(-90)`"
              text-anchor="middle"
            >
              {{ yLabel }}
            </text>
          </g>
          <g v-for="line in lines" :key="line.name" :class="line.colour">
            <path class="line-chart__line" :d="line.path" />
            <path
              v-for="point in line.points"
              :key="point.key"
              class="line-chart__marker"
              :d="markerPath(line.shape, point.cx, point.cy)"
            >
              <title>{{ point.title }}</title>
            </path>
          </g>
        </svg>
      </template>
    </div>
  </div>
</template>

<style scoped>
.line-chart {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  min-width: 0;
}

.line-chart__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2) var(--ds-space-4);
}

.line-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2) var(--ds-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.line-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.line-chart__swatch {
  flex: none;
  width: var(--ds-space-6);
  height: var(--ds-space-3);
  overflow: visible;
}

.line-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.line-chart__grid {
  stroke: var(--ds-color-border-subtle);
  stroke-width: var(--ds-border-width);
}

.line-chart__axis {
  stroke: var(--ds-color-border-strong);
  stroke-width: var(--ds-border-width);
}

.line-chart__tick,
.line-chart__title {
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-caption);
  fill: var(--ds-color-text-secondary);
}

.line-chart__title {
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  text-transform: uppercase;
}

.line-chart__series--1 {
  color: var(--ds-color-chart-1);
}

.line-chart__series--2 {
  color: var(--ds-color-chart-2);
}

.line-chart__series--3 {
  color: var(--ds-color-chart-3);
}

.line-chart__line {
  fill: none;
  stroke: currentColor;
  stroke-width: calc(var(--ds-border-width) * 2);
  stroke-linejoin: round;
}

.line-chart__marker {
  fill: currentColor;
  stroke: var(--ds-color-surface-raised);
  stroke-width: var(--ds-border-width);
}
</style>
