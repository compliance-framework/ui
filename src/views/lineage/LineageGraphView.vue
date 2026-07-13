<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import LineageScopeBar from '@/components/lineage/LineageScopeBar.vue';
import LineageViewSwitch from '@/components/lineage/LineageViewSwitch.vue';
import LineageNodeRow from '@/components/lineage/LineageNodeRow.vue';
import LineageNodeDrawer from '@/components/lineage/LineageNodeDrawer.vue';
import { nodeCardClass, nodeDetailRoute } from '@/components/lineage/nodeMeta';
import { useLineage } from '@/composables/useLineage';
import type { LineageNode } from '@/composables/useLineage/types';
import { useLineageScopeStore } from '@/stores/lineageScope';
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
const scopeStore = useLineageScopeStore();
const { fetchRootNodes, fetchChildNodes, clearCache, usingFixtures } =
  useLineage();

const columns = ref<Column[]>([]);
const loading = ref(false);
const selectedNode = ref<LineageNode | null>(null);
const drawerVisible = ref(false);

// Refs used to draw the single connector arrow between a selected box and the
// container it opened. Kept in plain Maps (not reactive) — we read them on demand.
const rowEl = ref<HTMLElement>();
const boxEls = new Map<string, HTMLElement>();
const containerEls = new Map<number, HTMLElement>();
const arrows = ref<string[]>([]);

function setBoxRef(colIndex: number, key: string, el: unknown) {
  const k = `${colIndex}:${key}`;
  if (el) boxEls.set(k, el as HTMLElement);
  else boxEls.delete(k);
}
function setContainerRef(colIndex: number, el: unknown) {
  if (el) containerEls.set(colIndex, el as HTMLElement);
  else containerEls.delete(colIndex);
}

async function loadRoots() {
  loading.value = true;
  boxEls.clear();
  containerEls.clear();
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
  await nextTick();
  computeArrows();
}

async function selectNode(colIndex: number, node: LineageNode) {
  columns.value[colIndex].selectedKey = node.key;
  // Drop deeper columns (re-selecting replaces what was to the right).
  columns.value = columns.value.slice(0, colIndex + 1);
  if (node.hasChildren) {
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
  await nextTick();
  computeArrows();
  // Reveal the freshly-opened column.
  containerEls
    .get(columns.value.length - 1)
    ?.scrollIntoView({ inline: 'end', block: 'nearest', behavior: 'smooth' });
}

function onBoxClick(colIndex: number, node: LineageNode) {
  if (node.hasChildren) {
    selectNode(colIndex, node);
  } else {
    // Leaf: just highlight + show details.
    columns.value[colIndex].selectedKey = node.key;
    columns.value = columns.value.slice(0, colIndex + 1);
    openDetails(node);
    nextTick().then(computeArrows);
  }
}

function showMore(colIndex: number) {
  columns.value[colIndex].revealed += COLUMN_PAGE_SIZE;
  nextTick().then(computeArrows);
}

function openDetails(node: LineageNode) {
  // Risk / evidence nodes have their own DetailViews; structural nodes use the drawer.
  const route = nodeDetailRoute(node, scopeStore.scope.sspId);
  if (route) {
    router.push(route);
    return;
  }
  selectedNode.value = node;
  drawerVisible.value = true;
}

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

// Filtering changes column height → the connector arrows may need to move.
function onSearch() {
  nextTick().then(computeArrows);
}

// One arrow per adjacent (selected-box → next-container) pair. Coordinates are
// relative to rowEl, and the SVG lives inside rowEl, so they stay correct while
// the area scrolls.
function computeArrows() {
  const row = rowEl.value;
  if (!row) {
    arrows.value = [];
    return;
  }
  const base = row.getBoundingClientRect();
  const out: string[] = [];
  for (let i = 0; i < columns.value.length - 1; i++) {
    const sel = columns.value[i].selectedKey;
    if (!sel) continue;
    const b = boxEls.get(`${i}:${sel}`);
    const c = containerEls.get(i + 1);
    if (!b || !c) continue;
    const br = b.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    const x1 = br.right - base.left;
    const y1 = br.top - base.top + br.height / 2;
    const x2 = cr.left - base.left;
    // Enter the container near the selected box's height, clamped inside it.
    const y2 = Math.min(
      Math.max(y1, cr.top - base.top + 14),
      cr.bottom - base.top - 14,
    );
    const dx = Math.max((x2 - x1) / 2, 24);
    out.push(`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
  }
  arrows.value = out;
}

onMounted(() => {
  loadRoots();
  window.addEventListener('resize', computeArrows);
});
onUnmounted(() => window.removeEventListener('resize', computeArrows));

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
          Compliance Map — Graph
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400">
          The worst {{ COLUMN_PAGE_SIZE }} nodes at each level, worst first by
          open risk. Click a box to drill into its children; use “…more” to
          reveal more.
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

    <div
      class="min-h-[500px] flex-1 overflow-auto rounded-lg border border-surface-200 bg-surface-50/40 dark:border-surface-700 dark:bg-surface-950/40"
    >
      <div ref="rowEl" class="relative flex min-w-max items-start gap-16 p-6">
        <!-- Connector arrows (behind the columns; they live in the gaps) -->
        <svg
          class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <marker
              id="lineage-arrowhead"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 Z" fill="#94a3b8" />
            </marker>
          </defs>
          <path
            v-for="(d, idx) in arrows"
            :key="idx"
            :d="d"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#lineage-arrowhead)"
          />
        </svg>

        <!-- Columns -->
        <div
          v-for="(col, i) in columns"
          :key="i"
          :ref="(el) => setContainerRef(i, el)"
          class="relative z-10 flex w-[380px] flex-shrink-0 flex-col gap-2 rounded-xl border border-surface-200 bg-surface-0/70 p-3 shadow-sm dark:border-surface-700 dark:bg-surface-900/60"
        >
          <div
            class="truncate text-xs font-semibold tracking-wide text-surface-500 uppercase dark:text-surface-400"
          >
            {{ i === 0 ? 'Top level' : col.parentTitle }}
          </div>

          <input
            v-model="col.query"
            type="search"
            :placeholder="`Search ${col.nodes.length} node${col.nodes.length === 1 ? '' : 's'}…`"
            class="w-full rounded-md border border-surface-300 bg-surface-0 px-2 py-1 text-xs text-surface-700 placeholder:text-surface-400 focus:border-primary focus:outline-none dark:border-surface-600 dark:bg-surface-950 dark:text-surface-0 dark:placeholder:text-surface-500"
            @input="onSearch"
          />

          <p
            v-if="col.query.trim()"
            class="text-[11px] text-surface-400 dark:text-surface-500"
          >
            {{ shownNodes(col).length }} match{{
              shownNodes(col).length === 1 ? '' : 'es'
            }}
          </p>

          <div
            v-for="node in structuralNodes(col)"
            :key="node.key"
            :ref="(el) => setBoxRef(i, node.key, el)"
            class="cursor-pointer rounded-lg border border-l-4 border-surface-200 p-3 transition hover:shadow-md dark:border-surface-700"
            :class="[
              nodeCardClass(node),
              col.selectedKey === node.key
                ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-surface-900'
                : '',
            ]"
            @click="onBoxClick(i, node)"
          >
            <LineageNodeRow :node="node" card />
            <div
              class="mt-1 flex items-center justify-between pl-5 text-xs text-surface-500 dark:text-surface-400"
            >
              <span v-if="node.hasChildren"
                >{{ node.childrenCount }} children ›</span
              >
              <span v-else class="italic">leaf</span>
              <button
                class="rounded px-1.5 py-0.5 hover:bg-surface-200 dark:hover:bg-surface-700"
                @click.stop="openDetails(node)"
              >
                details
              </button>
            </div>
          </div>

          <!-- Risk boxes, bucketed by owning SSP so cross-SSP risks under the
               same control don't look like they belong to one plan. -->
          <div
            v-for="group in riskGroups(col)"
            :key="`ssp:${group.sspId}`"
            class="rounded-lg border border-dashed border-surface-300 p-2 dark:border-surface-600"
          >
            <div
              class="mb-1.5 truncate text-[11px] font-semibold tracking-wide text-surface-500 uppercase dark:text-surface-400"
              v-tooltip.top="group.sspTitle"
            >
              SSP: {{ group.sspTitle }}
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="node in group.nodes"
                :key="node.key"
                :ref="(el) => setBoxRef(i, node.key, el)"
                class="cursor-pointer rounded-lg border border-l-4 border-surface-200 p-3 transition hover:shadow-md dark:border-surface-700"
                :class="[
                  nodeCardClass(node),
                  col.selectedKey === node.key
                    ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-surface-900'
                    : '',
                ]"
                @click="onBoxClick(i, node)"
              >
                <LineageNodeRow :node="node" card />
                <div
                  class="mt-1 flex items-center justify-between pl-5 text-xs text-surface-500 dark:text-surface-400"
                >
                  <span v-if="node.hasChildren"
                    >{{ node.childrenCount }} children ›</span
                  >
                  <span v-else class="italic">leaf</span>
                  <button
                    class="rounded px-1.5 py-0.5 hover:bg-surface-200 dark:hover:bg-surface-700"
                    @click.stop="openDetails(node)"
                  >
                    details
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            v-if="!col.query.trim() && col.nodes.length > col.revealed"
            class="mt-1 rounded-md border border-dashed border-surface-300 px-2 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
            @click="showMore(i)"
          >
            …{{
              Math.min(COLUMN_PAGE_SIZE, col.nodes.length - col.revealed)
            }}
            more (showing {{ Math.min(col.revealed, col.nodes.length) }} of
            {{ col.nodes.length }})
          </button>

          <p
            v-if="!col.nodes.length"
            class="text-sm text-surface-400 italic dark:text-surface-500"
          >
            {{ loading && i === 0 ? 'Loading…' : 'No children.' }}
          </p>
          <p
            v-else-if="col.query.trim() && !shownNodes(col).length"
            class="text-sm text-surface-400 italic dark:text-surface-500"
          >
            No matches for “{{ col.query }}”.
          </p>
        </div>
      </div>
    </div>

    <LineageNodeDrawer
      v-model:visible="drawerVisible"
      :node="selectedNode"
      :using-fixtures="usingFixtures"
      :ssp-id="scopeStore.sspId"
    />
  </div>
</template>
