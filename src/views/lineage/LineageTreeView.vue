<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Tree from '@/volt/Tree.vue';
import LineageScopeBar from '@/components/lineage/LineageScopeBar.vue';
import LineageViewSwitch from '@/components/lineage/LineageViewSwitch.vue';
import LineageNodeRow from '@/components/lineage/LineageNodeRow.vue';
import LineageNodeDrawer from '@/components/lineage/LineageNodeDrawer.vue';
import { nodeDetailRoute } from '@/components/lineage/nodeMeta';
import { useLineage } from '@/composables/useLineage';
import type {
  LineageNode,
  LineageTreeNode,
} from '@/composables/useLineage/types';
import { useLineageScopeStore } from '@/stores/lineageScope';
import { useUIStore } from '@/stores/ui';

const router = useRouter();
const scopeStore = useLineageScopeStore();
const uiStore = useUIStore();
const { fetchRoots, fetchChildren, clearCache, usingFixtures } = useLineage();

const nodes = ref<LineageTreeNode[]>([]);
const loading = ref(false);

const expandedKeys = computed({
  get: () => uiStore.lineageExpandedKeys,
  set: (val) => uiStore.setLineageExpandedKeys(val),
});

const selectedNode = ref<LineageNode | null>(null);
const drawerVisible = computed({
  get: () => uiStore.lineageDrawerOpen,
  set: (val) => uiStore.setLineageDrawerOpen(val),
});

function findNode(
  key: string,
  list: LineageTreeNode[],
): LineageTreeNode | null {
  for (const n of list) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findNode(key, n.children);
      if (found) return found;
    }
  }
  return null;
}

async function loadRoots() {
  loading.value = true;
  try {
    nodes.value = await fetchRoots(scopeStore.scope);
  } finally {
    loading.value = false;
  }
  // Children are fetched lazily on user expand, so a restored expandedKeys
  // map (from a prior visit) refers to nodes with no children loaded yet —
  // walk it down and fetch each expanded branch before restoring selection.
  await hydrateExpandedNodes(nodes.value);
  restoreSelection();
}

async function hydrateExpandedNodes(list: LineageTreeNode[]) {
  for (const node of list) {
    if (!expandedKeys.value[node.key]) continue;
    if (!node.children) {
      node.loading = true;
      try {
        node.children = await fetchChildren(node.key, scopeStore.scope);
      } finally {
        node.loading = false;
      }
    }
    if (node.children?.length) {
      await hydrateExpandedNodes(node.children);
    }
  }
}

// Reconcile the persisted selection/drawer state against freshly-fetched
// data (e.g. after a remount or a scope change).
function restoreSelection() {
  const key = uiStore.lineageSelectedNodeKey;
  if (!key || !uiStore.lineageDrawerOpen) return;
  const found = findNode(key, nodes.value);
  if (found) {
    selectedNode.value = found.data;
  } else {
    // Stale selection (e.g. node no longer in scope) — clear it.
    selectedNode.value = null;
    uiStore.setLineageSelectedNodeKey(null);
    uiStore.setLineageDrawerOpen(false);
  }
}

async function onNodeExpand(node: LineageTreeNode) {
  // Lazy one-level load; the composable caches so re-expanding is cheap.
  const target = findNode(node.key, nodes.value) ?? node;
  if (target.children && target.children.length) return;
  target.loading = true;
  try {
    target.children = await fetchChildren(target.key, scopeStore.scope);
  } finally {
    target.loading = false;
  }
}

function onNodeSelect(node: LineageTreeNode) {
  // Risk / evidence nodes open their own DetailView; structural nodes use the drawer.
  const route = nodeDetailRoute(node.data, scopeStore.scope.sspId);
  if (route) {
    router.push(route);
    return;
  }
  selectedNode.value = node.data;
  uiStore.setLineageSelectedNodeKey(node.key);
  drawerVisible.value = true;
}

// Clear the persisted selection whenever the drawer closes, whether via the
// drawer's own close button or the reconciliation above.
watch(drawerVisible, (isOpen) => {
  if (!isOpen) {
    selectedNode.value = null;
    uiStore.setLineageSelectedNodeKey(null);
  }
});

onMounted(loadRoots);

// Refetch when the scope changes (SSP / component / types).
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
          Compliance Map
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400">
          Standard → Policy → Controls → Evidence, with per-node compliance and
          open-risk heat.
        </p>
      </div>
      <LineageViewSwitch active="tree" />
    </header>

    <LineageScopeBar />

    <p
      v-if="usingFixtures"
      class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Showing demo fixture data — the lineage API isn't connected.
    </p>

    <div
      class="min-h-0 flex-1 overflow-auto rounded-lg border border-surface-200 dark:border-surface-700"
    >
      <Tree
        v-model:expandedKeys="expandedKeys"
        :value="nodes"
        :loading="loading"
        selectionMode="single"
        class="h-full"
        @node-expand="onNodeExpand"
        @node-select="onNodeSelect"
      >
        <template #default="{ node }">
          <LineageNodeRow :node="(node as LineageTreeNode).data" />
        </template>
      </Tree>
    </div>

    <LineageNodeDrawer
      v-model:visible="drawerVisible"
      :node="selectedNode"
      :using-fixtures="usingFixtures"
      :ssp-id="scopeStore.sspId"
    />
  </div>
</template>
