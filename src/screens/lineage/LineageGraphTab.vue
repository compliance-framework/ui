<script setup lang="ts">
/**
 * Compliance Map → Graph (/lineage/graph): drill-down columns, worst first by open risk. Each
 * column shows the worst few nodes of a level (more on request, or every match while searching);
 * showing a node's children opens the next column, and risks are grouped by the SSP they belong
 * to. The drill-down path and the drawer survive a revisit (UI store). The script is the classic
 * graph view's, without its hand-drawn connector arrows: the selected card is marked instead.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { nodeDetailRoute } from '@/components/lineage/nodeMeta';
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import ColumnBrowser from '@/ds/components/ColumnBrowser/ColumnBrowser.vue';
import ColumnBrowserItem from '@/ds/components/ColumnBrowser/ColumnBrowserItem.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LineageNodeDrawer from './LineageNodeDrawer.vue';
import LineageNodeSummary from './LineageNodeSummary.vue';
import LineageScopeFilters from './LineageScopeFilters.vue';
import { useLineage } from '@/composables/useLineage';
import type { LineageNode } from '@/composables/useLineage/types';
import { useLineageScopeStore } from '@/stores/lineageScope';
import { useUIStore } from '@/stores/ui';
import {
  COLUMN_PAGE_SIZE,
  worstFirst,
  structuralNodes as structuralNodesOf,
  riskGroups as riskGroupsOf,
} from './ranking';

// One column = the (worst-first) children of a selected node, revealed 5 at a
// time. columns[0] holds the roots. Selecting a box in column i drops everything
// to its right and opens column i+1 with that node's children.
interface Column {
  parentKey: string | null;
  parentTitle: string;
  nodes: LineageNode[];
  revealed: number;
  selectedKey: string | null;
  query: string;
}

const router = useRouter();
const browser = ref<InstanceType<typeof ColumnBrowser>>();
const scopeStore = useLineageScopeStore();
const uiStore = useUIStore();
const {
  fetchRootNodes,
  fetchChildNodes,
  clearCache,
  refresh,
  generatedAt,
  usingFixtures,
} = useLineage();

const columns = ref<Column[]>([]);
const loading = ref(false);
const selectedNode = ref<LineageNode | null>(null);
const drawerVisible = computed({
  get: () => uiStore.lineageGraphDrawerOpen,
  set: (val) => uiStore.setLineageGraphDrawerOpen(val),
});

async function loadRoots() {
  loading.value = true;
  try {
    const roots = await fetchRootNodes(scopeStore.scope);
    columns.value = [
      {
        parentKey: null,
        parentTitle: 'Top level',
        nodes: worstFirst(roots),
        revealed: COLUMN_PAGE_SIZE,
        selectedKey: null,
        query: '',
      },
    ];
  } finally {
    loading.value = false;
  }
  // Columns are rebuilt from scratch on every load, so replay the persisted
  // drill-down path (and reopen the drawer) before drawing the connectors.
  await restoreGraphPath();
  restoreGraphSelection();
}

// Persists the ordered selected keys (one per column) so the drill-down can
// be replayed after a remount.
function syncGraphPath() {
  const path = columns.value
    .map((c) => c.selectedKey)
    .filter((k): k is string => k !== null);
  uiStore.setLineageGraphPath(path);
}

// Replays a persisted drill-down path against the freshly-fetched roots,
// fetching each column's children just like a real click would.
async function restoreGraphPath() {
  for (const key of uiStore.lineageGraphPath) {
    const colIndex = columns.value.length - 1;
    const col = columns.value[colIndex];
    const node = col.nodes.find((n) => n.key === key);
    if (!node) {
      // Stale path (e.g. node no longer in scope) — trim it to what restored.
      syncGraphPath();
      return;
    }
    col.selectedKey = key;
    if (!node.hasChildren) {
      // Leaf: nothing more to drill into, so trim any stale trailing entries.
      syncGraphPath();
      return;
    }
    const children = await fetchChildNodes(node.key, scopeStore.scope);
    columns.value.push({
      parentKey: node.key,
      parentTitle: node.title,
      nodes: worstFirst(children),
      revealed: COLUMN_PAGE_SIZE,
      selectedKey: null,
      query: '',
    });
  }
}

// Reconciles the persisted selection/drawer state against the rebuilt
// columns (the selected-for-details node need not be on the drill path).
function restoreGraphSelection() {
  const key = uiStore.lineageGraphSelectedNodeKey;
  if (!key || !uiStore.lineageGraphDrawerOpen) return;
  for (const col of columns.value) {
    const found = col.nodes.find((n) => n.key === key);
    if (found) {
      selectedNode.value = found;
      return;
    }
  }
  // Stale selection — clear it.
  selectedNode.value = null;
  uiStore.setLineageGraphSelectedNodeKey(null);
  uiStore.setLineageGraphDrawerOpen(false);
}

async function selectNode(colIndex: number, node: LineageNode) {
  // Clicking a box that's already selected with its child column open
  // toggles it closed instead of re-opening the same column.
  const alreadyOpen =
    columns.value[colIndex].selectedKey === node.key &&
    columns.value[colIndex + 1]?.parentKey === node.key;
  columns.value[colIndex].selectedKey = alreadyOpen ? null : node.key;
  // Drop deeper columns (re-selecting replaces what was to the right).
  columns.value = columns.value.slice(0, colIndex + 1);
  if (node.hasChildren && !alreadyOpen) {
    const token = node.key;
    const children = await fetchChildNodes(node.key, scopeStore.scope);
    // Bail if a newer click in this column superseded us while awaiting —
    // otherwise this stale response appends a column for the wrong selection.
    if (columns.value[colIndex]?.selectedKey !== token) return;
    columns.value.push({
      parentKey: node.key,
      parentTitle: node.title,
      nodes: worstFirst(children),
      revealed: COLUMN_PAGE_SIZE,
      selectedKey: null,
      query: '',
    });
  }
  syncGraphPath();
  // Reveal the freshly-opened column.
  await browser.value?.revealLast();
}

function onBoxClick(colIndex: number, node: LineageNode) {
  if (node.hasChildren) {
    selectNode(colIndex, node);
  } else {
    // Leaf: just highlight + show details.
    columns.value[colIndex].selectedKey = node.key;
    columns.value = columns.value.slice(0, colIndex + 1);
    syncGraphPath();
    openDetails(node);
  }
}

function showMore(colIndex: number) {
  columns.value[colIndex].revealed += COLUMN_PAGE_SIZE;
}

function openDetails(node: LineageNode) {
  // Risk / evidence nodes have their own DetailViews; structural nodes use the drawer.
  const route = nodeDetailRoute(node, scopeStore.scope.sspId);
  if (route) {
    router.push(route);
    return;
  }
  selectedNode.value = node;
  uiStore.setLineageGraphSelectedNodeKey(node.key);
  drawerVisible.value = true;
}

// Clear the persisted selection whenever the drawer closes.
watch(drawerVisible, (isOpen) => {
  if (!isOpen) {
    selectedNode.value = null;
    uiStore.setLineageGraphSelectedNodeKey(null);
  }
});

// Boxes to render in a column: while a search is active, show every match (so the
// user can reach nodes beyond the worst-N page); otherwise the worst-N page.
function shownNodes(col: Column): LineageNode[] {
  const q = col.query.trim().toLowerCase();
  if (q) {
    return col.nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.controlId ?? '').toLowerCase().includes(q),
    );
  }
  return col.nodes.slice(0, col.revealed);
}

// Non-risk boxes in a column, rendered individually as before.
function structuralNodes(col: Column): LineageNode[] {
  return structuralNodesOf(shownNodes(col));
}

// Risk boxes in a column, bucketed into one container per owning SSP.
function riskGroups(col: Column) {
  return riskGroupsOf(shownNodes(col));
}

onMounted(loadRoots);

// Reload with current data from the API, replaying the drill-down path.
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

watch(
  () => scopeStore.scope,
  () => {
    clearCache();
    loadRoots();
  },
  { deep: true },
);

const browserColumns = computed(() =>
  columns.value.map((col, index) => ({
    key: `lineage-column-${index}`,
    title: index === 0 ? 'Top level' : col.parentTitle,
  })),
);
const status = computed(() => {
  if (loading.value && !columns.value[0]?.nodes.length) return 'loading';
  return columns.value[0]?.nodes.length ? 'ready' : 'empty';
});
const isOpenParent = (colIndex: number, node: LineageNode) =>
  columns.value[colIndex].selectedKey === node.key &&
  columns.value[colIndex + 1]?.parentKey === node.key;
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
          >The worst {{ COLUMN_PAGE_SIZE }} nodes at each level, worst first by
          open risk. Show a node's children to open the next column.</Text
        >
        <ColumnBrowser
          ref="browser"
          label="Compliance map columns"
          :heading-level="2"
          :columns="browserColumns"
        >
          <template #column="{ index }">
            <template v-if="columns[index]">
              <TextInput
                v-model="columns[index].query"
                type="search"
                :label="`Search ${browserColumns[index].title}`"
                :placeholder="`Search ${columns[index].nodes.length} nodes`"
              />
              <Text
                v-if="columns[index].query.trim()"
                as="span"
                variant="caption"
                role="status"
                >{{ shownNodes(columns[index]).length }} match{{
                  shownNodes(columns[index]).length === 1 ? '' : 'es'
                }}</Text
              >
              <ColumnBrowserItem
                v-for="node in structuralNodes(columns[index])"
                :key="node.key"
                :selected="columns[index].selectedKey === node.key"
              >
                <LineageNodeSummary :node="node" />
                <Cluster gap="2">
                  <Button
                    v-if="node.hasChildren"
                    size="sm"
                    :icon="isOpenParent(index, node) ? 'back' : 'next'"
                    :aria-expanded="isOpenParent(index, node)"
                    @click="onBoxClick(index, node)"
                    >{{
                      isOpenParent(index, node)
                        ? 'Hide children'
                        : `Show ${plural(node.childrenCount ?? 0, 'child', 'children')}`
                    }}</Button
                  >
                  <Button
                    size="sm"
                    icon="details"
                    :aria-label="`Details for ${node.title}`"
                    @click="
                      node.hasChildren
                        ? openDetails(node)
                        : onBoxClick(index, node)
                    "
                    >Details</Button
                  >
                </Cluster>
              </ColumnBrowserItem>
              <Panel
                v-for="group in riskGroups(columns[index])"
                :key="`ssp:${group.sspId}`"
                :title="`Risks in ${group.sspTitle}`"
                :level="3"
                dense
              >
                <Stack gap="2">
                  <ColumnBrowserItem
                    v-for="node in group.nodes"
                    :key="node.key"
                    :selected="columns[index].selectedKey === node.key"
                  >
                    <LineageNodeSummary :node="node" />
                    <Cluster gap="2">
                      <Button
                        v-if="node.hasChildren"
                        size="sm"
                        :icon="isOpenParent(index, node) ? 'back' : 'next'"
                        :aria-expanded="isOpenParent(index, node)"
                        @click="onBoxClick(index, node)"
                        >{{
                          isOpenParent(index, node)
                            ? 'Hide children'
                            : `Show ${plural(node.childrenCount ?? 0, 'child', 'children')}`
                        }}</Button
                      >
                      <Button
                        size="sm"
                        icon="details"
                        :aria-label="`Details for ${node.title}`"
                        @click="
                          node.hasChildren
                            ? openDetails(node)
                            : onBoxClick(index, node)
                        "
                        >Details</Button
                      >
                    </Cluster>
                  </ColumnBrowserItem>
                </Stack>
              </Panel>
              <Button
                v-if="
                  !columns[index].query.trim() &&
                  columns[index].nodes.length > columns[index].revealed
                "
                size="sm"
                variant="tertiary"
                @click="showMore(index)"
                >Show
                {{
                  Math.min(
                    COLUMN_PAGE_SIZE,
                    columns[index].nodes.length - columns[index].revealed,
                  )
                }}
                more ({{
                  Math.min(columns[index].revealed, columns[index].nodes.length)
                }}
                of {{ columns[index].nodes.length }} shown)</Button
              >
              <Text
                v-if="!columns[index].nodes.length"
                as="span"
                variant="secondary"
                >No children.</Text
              >
              <Text
                v-else-if="
                  columns[index].query.trim() &&
                  !shownNodes(columns[index]).length
                "
                as="span"
                variant="secondary"
                >Nothing matches “{{ columns[index].query }}”.</Text
              >
            </template>
          </template>
        </ColumnBrowser>
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
