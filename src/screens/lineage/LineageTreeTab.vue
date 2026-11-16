<script setup lang="ts">
/**
 * Compliance Map → Tree (/lineage): standards, policies and procedures down to controls, risks and
 * evidence, each node with its compliance and open-risk heat. Children load when a node first
 * opens; what is open and selected survives a revisit (UI store). The script is the classic tree
 * view's.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DataState from '@/ds/components/DataState/DataState.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Tree from '@/ds/components/TreeItem/Tree.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LineageNodeDrawer from './LineageNodeDrawer.vue';
import LineageScopeFilters from './LineageScopeFilters.vue';
import LineageTreeItem from './LineageTreeItem.vue';
import { provideLineageTree } from './lineageTree';
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
const {
  fetchRoots,
  fetchChildren,
  clearCache,
  refresh,
  generatedAt,
  usingFixtures,
} = useLineage();

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

provideLineageTree({
  isOpen: (key) => Boolean(expandedKeys.value[key]),
  setOpen(node, open) {
    const next = { ...expandedKeys.value };
    if (open) next[node.key] = true;
    else delete next[node.key];
    expandedKeys.value = next;
    if (open) void onNodeExpand(node);
  },
  select: onNodeSelect,
});

const status = computed(() => {
  if (loading.value && !nodes.value.length) return 'loading';
  return nodes.value.length ? 'ready' : 'empty';
});

// Reload with current data from the API, keeping what is expanded and selected.
// The button stays disabled until the whole reload is done, not just the roots,
// so a second click cannot start a replay alongside this one.
const refreshing = ref(false);
async function onRefresh() {
  refreshing.value = true;
  try {
    refresh();
    await loadRoots();
  } finally {
    refreshing.value = false;
  }
}

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
  <Stack gap="4">
    <LineageScopeFilters
      :generated-at="generatedAt"
      :refreshing="loading || refreshing"
      @refresh="onRefresh"
    />
    <InlineMessage v-if="usingFixtures" tone="warning" title="Demo data">
      <p>The lineage API isn't connected, so this is sample data.</p>
    </InlineMessage>
    <DataState
      :status="status"
      subject="the compliance map"
      empty-title="Nothing in scope"
      empty-body="No standards, policies or procedures match this scope."
      icon="complianceMap"
    >
      <Stack gap="2">
        <Text variant="caption"
          >Open a node to see what it contains; Details shows its compliance,
          risks and evidence.</Text
        >
        <Tree label="Compliance map">
          <LineageTreeItem v-for="node in nodes" :key="node.key" :node="node" />
        </Tree>
      </Stack>
    </DataState>
    <LineageNodeDrawer
      v-model:visible="drawerVisible"
      :node="selectedNode"
      :using-fixtures="usingFixtures"
      :ssp-id="scopeStore.sspId"
    />
  </Stack>
</template>
