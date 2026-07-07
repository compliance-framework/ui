<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
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

const router = useRouter();
const scopeStore = useLineageScopeStore();
const { fetchRoots, fetchChildren, clearCache, usingFixtures } = useLineage();

const nodes = ref<LineageTreeNode[]>([]);
const expandedKeys = ref<Record<string, boolean>>({});
const loading = ref(false);

const selectedNode = ref<LineageNode | null>(null);
const drawerVisible = ref(false);

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
  expandedKeys.value = {};
  try {
    nodes.value = await fetchRoots(scopeStore.scope);
  } finally {
    loading.value = false;
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
  const route = nodeDetailRoute(node.data);
  if (route) {
    router.push(route);
    return;
  }
  selectedNode.value = node.data;
  drawerVisible.value = true;
}

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
          Compliance Lineage
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
