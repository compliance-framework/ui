<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import type { Edge, Node } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import LineageScopeBar from '@/components/lineage/LineageScopeBar.vue';
import LineageViewSwitch from '@/components/lineage/LineageViewSwitch.vue';
import LineageNodeDrawer from '@/components/lineage/LineageNodeDrawer.vue';
import LineageGraphNode from './LineageGraphNode.vue';
import { layoutGraph } from './layout';
import { useLineage } from '@/composables/useLineage';
import type {
  LineageEdgeKind,
  LineageNode,
} from '@/composables/useLineage/types';
import { useLineageScopeStore } from '@/stores/lineageScope';

const scopeStore = useLineageScopeStore();
const { fetchRootNodes, fetchChildNodes, clearCache, usingFixtures } =
  useLineage();
const { setNodes, setEdges, fitView, onNodeClick, onNodesInitialized } =
  useVueFlow();

// Source of truth for the DAG (deduped by key so a shared node renders ONCE).
const graphNodes = new Map<string, LineageNode>();
const graphEdges = new Map<
  string,
  { id: string; source: string; target: string; kind: LineageEdgeKind }
>();
const expanded = new Set<string>();

const loading = ref(false);
const selectedNode = ref<LineageNode | null>(null);
const drawerVisible = ref(false);

// Procedures are documented, not implemented → dashed, de-emphasised edge.
function edgeKind(child: LineageNode): LineageEdgeKind {
  return String(child.nodeType).startsWith('procedure')
    ? 'documents'
    : 'implements';
}

function rebuild() {
  const rawNodes: Node[] = [...graphNodes.values()].map((n) => ({
    id: n.key,
    type: 'lineage',
    position: { x: 0, y: 0 },
    data: { node: n, expanded: expanded.has(n.key) },
  }));

  const rawEdges: Edge[] = [...graphEdges.values()].map((e) => {
    const documents = e.kind === 'documents';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      class: documents ? 'lineage-edge-documents' : 'lineage-edge-implements',
      style: documents
        ? {
            strokeDasharray: '6 4',
            stroke: '#94a3b8',
            strokeWidth: 1.5,
            opacity: 0.7,
          }
        : { stroke: '#64748b', strokeWidth: 1.5 },
    };
  });

  const layouted = layoutGraph(rawNodes, rawEdges);
  setNodes(layouted);
  setEdges(rawEdges);
  nextTick(() => fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1 }));
}

function reset() {
  graphNodes.clear();
  graphEdges.clear();
  expanded.clear();
}

async function loadRoots() {
  loading.value = true;
  reset();
  try {
    const roots = await fetchRootNodes(scopeStore.scope);
    for (const r of roots) graphNodes.set(r.key, r);
    rebuild();
  } finally {
    loading.value = false;
  }
}

async function expandNode(key: string) {
  if (expanded.has(key)) return;
  const children = await fetchChildNodes(key, scopeStore.scope);
  for (const c of children) {
    if (!graphNodes.has(c.key)) graphNodes.set(c.key, c);
    const edgeId = `${key}->${c.key}`;
    if (!graphEdges.has(edgeId)) {
      graphEdges.set(edgeId, {
        id: edgeId,
        source: key,
        target: c.key,
        kind: edgeKind(c),
      });
    }
  }
  expanded.add(key);
  rebuild();
}

onNodeClick(({ node }) => {
  const data = graphNodes.get(node.id);
  if (data) {
    selectedNode.value = data;
    drawerVisible.value = true;
  }
  expandNode(node.id);
});

// Fit once nodes have real measured dimensions.
onNodesInitialized(() => fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1 }));

onMounted(loadRoots);

watch(
  () => scopeStore.scope,
  () => {
    clearCache();
    loadRoots();
  },
  { deep: true },
);
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-surface-800 dark:text-surface-0">
          Compliance Lineage — Graph
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400">
          The same DAG as a node-link graph. Click a node to expand its children
          and open details. Solid = implements, dashed = documents.
        </p>
      </div>
      <LineageViewSwitch active="graph" />
    </header>

    <LineageScopeBar />

    <p
      v-if="usingFixtures"
      class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Showing demo fixture data — the lineage API isn't connected.
    </p>

    <!-- Vue Flow needs an explicitly-sized parent: its canvas is absolutely
         positioned (zero intrinsic height), and the app layout mounts router-view
         in a content-height wrapper, so `flex-1`/`h-full` would collapse to 0 and
         fitView would clamp to minZoom. Pin a viewport-relative height instead. -->
    <div
      class="h-[70vh] min-h-[500px] overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
    >
      <VueFlow
        class="h-full w-full"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
      >
        <template #node-lineage="props">
          <LineageGraphNode :data="props.data" />
        </template>
      </VueFlow>
    </div>

    <LineageNodeDrawer
      v-model:visible="drawerVisible"
      :node="selectedNode"
      :using-fixtures="usingFixtures"
      :ssp-id="scopeStore.sspId"
    />
  </div>
</template>

<style>
/* Vue Flow renders on a light canvas; give it a surface that works in dark mode. */
.vue-flow__pane {
  background-color: transparent;
}
</style>
