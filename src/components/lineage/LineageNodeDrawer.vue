<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Drawer from '@/volt/Drawer.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import RiskHeatBadge from './RiskHeatBadge.vue';
import type { LineageNode } from '@/composables/useLineage/types';

const props = defineProps<{
  node: LineageNode | null;
  visible: boolean;
  /** When fixtures are in play we skip the live evidence fetch. */
  usingFixtures?: boolean;
  /** SSP scope for the evidence queries. */
  sspId?: string | null;
}>();

const emit = defineEmits<{ 'update:visible': [value: boolean] }>();

const instance = useAuthenticatedInstance();

interface EvidenceRow {
  id: string;
  title: string;
  status?: string;
}

const evidence = ref<EvidenceRow[]>([]);
const evidenceState = ref<'idle' | 'loading' | 'loaded' | 'error' | 'skipped'>(
  'idle',
);

// Full-strength risk statuses vs muted (accepted / mitigated) ones. Muted rows
// stay visible but de-emphasised per the spec.
const riskRows = computed(() => {
  const c = props.node?.risk.counts;
  if (!c) return [];
  return [
    {
      label: 'Open',
      count: c.open,
      muted: false,
      tag: 'bg-red-100 text-red-700 dark:bg-red-500/25 dark:text-red-200',
    },
    {
      label: 'Investigating',
      count: c.investigating,
      muted: false,
      tag: 'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200',
    },
    {
      label: 'Mitigating (planned)',
      count: c.mitigatingPlanned,
      muted: false,
      tag: 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200',
    },
    {
      label: 'Mitigating (implemented)',
      count: c.mitigatingImplemented,
      muted: true,
      tag: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    },
    {
      label: 'Accepted',
      count: c.riskAccepted,
      muted: true,
      tag: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    },
  ];
});

const compliancePercent = computed(() =>
  Math.round(props.node?.compliance.compliancePercent ?? 0),
);

async function loadEvidence(node: LineageNode) {
  evidence.value = [];
  // [PoC corner] evidence list only in API-connected mode with a control id.
  if (props.usingFixtures || !node.controlId) {
    evidenceState.value = 'skipped';
    return;
  }
  evidenceState.value = 'loading';
  try {
    const params = props.sspId ? { sspId: props.sspId } : {};
    const res = await instance.get(
      `/api/evidence/for-control/${encodeURIComponent(node.controlId)}`,
      { params },
    );
    const rows = res.data?.data ?? res.data ?? [];
    evidence.value = (Array.isArray(rows) ? rows : []).map(
      (r: Record<string, unknown>, i: number) => ({
        id: String(r.uuid ?? r.id ?? i),
        title: String(r.title ?? r.description ?? r.uuid ?? 'Evidence'),
        status: typeof r.status === 'string' ? r.status : undefined,
      }),
    );
    evidenceState.value = 'loaded';
  } catch (err) {
    console.warn('[LineageNodeDrawer] evidence fetch failed', err);
    evidenceState.value = 'error';
  }
}

watch(
  () => [props.visible, props.node?.key] as const,
  ([visible]) => {
    if (visible && props.node) loadEvidence(props.node);
  },
  { immediate: true },
);

function close() {
  emit('update:visible', false);
}
</script>

<template>
  <Drawer
    :visible="visible"
    position="right"
    :header="node?.title ?? 'Lineage node'"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="node" class="flex flex-col gap-6">
      <!-- Metric header: both scores side by side -->
      <div class="grid grid-cols-2 gap-3">
        <div
          class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40"
        >
          <p
            class="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300"
          >
            Compliance
          </p>
          <p
            class="mt-1 text-2xl font-semibold text-blue-800 dark:text-blue-200"
          >
            {{ compliancePercent }}%
          </p>
          <p class="mt-1 text-xs text-surface-500 dark:text-surface-400">
            <span class="text-emerald-600 dark:text-emerald-400"
              >{{ node.compliance.satisfied }} sat</span
            >
            ·
            <span class="text-red-600 dark:text-red-400"
              >{{ node.compliance.notSatisfied }} not</span
            >
            ·
            <span class="text-slate-500 dark:text-slate-400"
              >{{ node.compliance.unknown }} unknown</span
            >
            / {{ node.compliance.totalControls }}
          </p>
        </div>
        <div
          class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/60"
        >
          <p
            class="text-xs uppercase tracking-wide text-surface-600 dark:text-surface-300"
          >
            Open risk
          </p>
          <div class="mt-2">
            <RiskHeatBadge :risk="node.risk" />
          </div>
          <p class="mt-2 text-xs text-surface-500 dark:text-surface-400">
            {{
              node.compliance.assessedPercent
                ? Math.round(node.compliance.assessedPercent) + '% assessed'
                : ''
            }}
          </p>
        </div>
      </div>

      <!-- Linkage summary -->
      <section>
        <h3
          class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-100"
        >
          Linkage
        </h3>
        <div class="flex flex-wrap gap-2 text-xs">
          <span
            class="rounded-full bg-surface-100 px-2 py-1 dark:bg-surface-800"
            >{{ node.linkage.policies }} policies</span
          >
          <span
            class="rounded-full bg-surface-100 px-2 py-1 dark:bg-surface-800"
            >{{ node.linkage.procedures }} procedures</span
          >
          <span
            class="rounded-full bg-surface-100 px-2 py-1 dark:bg-surface-800"
            >{{ node.linkage.operationalControls }} operational</span
          >
          <span
            v-if="node.linkage.unanchored"
            class="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            >Unanchored</span
          >
          <span
            v-if="node.linkage.unmapped"
            class="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            >Unmapped</span
          >
        </div>
      </section>

      <!-- Risk breakdown by status -->
      <section>
        <h3
          class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-100"
        >
          Risks by status
        </h3>
        <ul class="flex flex-col gap-1">
          <li
            v-for="row in riskRows"
            :key="row.label"
            class="flex items-center justify-between rounded-md px-2 py-1 text-sm"
            :class="row.muted ? 'opacity-60' : ''"
          >
            <span class="inline-flex items-center gap-2">
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                :class="row.tag"
                >{{ row.label }}</span
              >
            </span>
            <span
              class="font-semibold tabular-nums text-surface-700 dark:text-surface-100"
              >{{ row.count }}</span
            >
          </li>
        </ul>
      </section>

      <!-- Evidence (best-effort; API-connected mode) -->
      <section>
        <h3
          class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-100"
        >
          Evidence
        </h3>
        <p v-if="evidenceState === 'loading'" class="text-sm text-surface-500">
          Loading evidence…
        </p>
        <p
          v-else-if="evidenceState === 'skipped'"
          class="text-sm text-surface-500 dark:text-surface-400"
        >
          Evidence list is available when connected to the API. Compliance is
          {{ compliancePercent }}% across
          {{ node.compliance.totalControls }} controls.
        </p>
        <p
          v-else-if="evidenceState === 'error'"
          class="text-sm text-surface-500 dark:text-surface-400"
        >
          Could not load evidence for this control.
        </p>
        <p
          v-else-if="evidenceState === 'loaded' && evidence.length === 0"
          class="text-sm text-surface-500 dark:text-surface-400"
        >
          No evidence found for this control.
        </p>
        <ul v-else class="flex flex-col gap-1">
          <li
            v-for="row in evidence"
            :key="row.id"
            class="flex items-center justify-between rounded-md border border-surface-200 px-2 py-1 text-sm dark:border-surface-700"
          >
            <span class="min-w-0 truncate">{{ row.title }}</span>
            <span
              v-if="row.status"
              class="ml-2 flex-shrink-0 text-xs text-surface-500"
              >{{ row.status }}</span
            >
          </li>
        </ul>
      </section>

      <div class="pt-2">
        <button
          class="rounded-md border border-surface-300 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
          @click="close"
        >
          Close
        </button>
      </div>
    </div>
  </Drawer>
</template>
