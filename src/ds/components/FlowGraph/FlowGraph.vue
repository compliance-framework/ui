<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '../StatusBadge/StatusBadge.vue';
import type { StatusKey } from '../StatusBadge/statuses';
import { FLOW_NODE, layoutFlow } from './flowLayout';

/**
 * A dependency graph laid out left to right (workflow steps): each node is a button (title, a
 * detail line, an optional status badge and notes), edges are arrows from what a node depends on.
 * `selected` marks one node; its dependencies and incoming edges are emphasised and the rest
 * recede. The graph scrolls sideways when wider than its container. It is a picture of order; a
 * table beside it should carry the same steps for anyone who doesn't use the graph.
 */
export interface FlowGraphNode {
  id: string;
  title: string;
  order: number;
  dependsOn: string[];
  detail?: string;
  status?: StatusKey;
  /** Short notes shown under the title, e.g. "Evidence required". */
  notes?: string[];
}

const props = withDefaults(
  defineProps<{
    label: string;
    nodes: FlowGraphNode[];
    selected?: string | null;
  }>(),
  { selected: null },
);
const emit = defineEmits<{ select: [id: string] }>();

const layout = computed(() => layoutFlow(props.nodes));
const byId = computed(() => new Map(props.nodes.map((n) => [n.id, n])));
const focusIds = computed(() => {
  const node = props.selected ? byId.value.get(props.selected) : undefined;
  return node ? new Set([node.id, ...node.dependsOn]) : null;
});
const arrowId = `flow-arrow-${Math.random().toString(36).slice(2)}`;
</script>

<template>
  <div class="flow-graph" role="group" :aria-label="label">
    <svg
      class="flow-graph__canvas"
      :width="layout.width"
      :height="layout.height"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
    >
      <defs>
        <marker
          :id="arrowId"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path class="flow-graph__arrow" d="M0,0 L8,4 L0,8 z" />
        </marker>
      </defs>
      <path
        v-for="edge in layout.edges"
        :key="`${edge.from}-${edge.to}`"
        class="flow-graph__edge"
        :class="{ 'flow-graph__edge--emphasised': edge.to === selected }"
        :d="edge.path"
        :marker-end="`url(#${arrowId})`"
        aria-hidden="true"
      />
      <foreignObject
        v-for="position in layout.nodes"
        :key="position.id"
        :x="position.x"
        :y="position.y"
        :width="FLOW_NODE.width"
        :height="FLOW_NODE.height"
      >
        <button
          type="button"
          class="flow-graph__node"
          :class="{
            'flow-graph__node--selected': position.id === selected,
            'flow-graph__node--related':
              focusIds?.has(position.id) && position.id !== selected,
            'flow-graph__node--receded': focusIds && !focusIds.has(position.id),
          }"
          :aria-pressed="position.id === selected"
          :title="byId.get(position.id)?.title"
          @click="emit('select', position.id)"
        >
          <span class="flow-graph__title">{{
            byId.get(position.id)?.title
          }}</span>
          <span
            v-if="byId.get(position.id)?.detail"
            class="flow-graph__detail"
            >{{ byId.get(position.id)?.detail }}</span
          >
          <span class="flow-graph__meta">
            <StatusBadge
              v-if="byId.get(position.id)?.status"
              :status="byId.get(position.id)!.status!"
            />
            <span
              v-for="note in byId.get(position.id)?.notes ?? []"
              :key="note"
              class="flow-graph__note"
              >{{ note }}</span
            >
          </span>
        </button>
      </foreignObject>
    </svg>
  </div>
</template>

<style scoped>
.flow-graph {
  max-width: 100%;
  overflow-x: auto;
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
}
.flow-graph__canvas {
  display: block;
}
.flow-graph__edge {
  fill: none;
  stroke: var(--ds-color-border-strong);
  stroke-width: var(--ds-border-width);
}
.flow-graph__edge--emphasised {
  stroke: var(--ds-color-indicator);
  stroke-width: var(--ds-border-width-indicator);
}
.flow-graph__arrow {
  fill: var(--ds-color-border-strong);
}
.flow-graph__node {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--ds-space-1);
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: var(--ds-space-2) var(--ds-space-3);
  overflow: hidden;
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-left-width: var(--ds-border-width-indicator);
  border-radius: var(--ds-radius-none);
  background: var(--ds-color-surface-raised);
  color: var(--ds-color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.flow-graph__node:hover {
  background: var(--ds-color-surface-hover);
}
.flow-graph__node--selected {
  border-color: var(--ds-color-border-strong);
  border-left-color: var(--ds-color-indicator);
  background: var(--ds-color-surface-selected);
}
.flow-graph__node--related {
  border-color: var(--ds-color-border-strong);
}
.flow-graph__node--receded {
  color: var(--ds-color-text-secondary);
}
.flow-graph__title {
  flex: none;
  overflow: hidden;
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.flow-graph__detail,
.flow-graph__note {
  flex: none;
  overflow: hidden;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.flow-graph__meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-width: 0;
}
</style>
