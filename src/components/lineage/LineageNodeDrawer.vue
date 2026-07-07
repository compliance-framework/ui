<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Drawer from '@/volt/Drawer.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import RiskHeatBadge from './RiskHeatBadge.vue';
import {
  nodeKind,
  riskStatusBadge,
  severityBadge,
  evidenceStateBadge,
  isRiskMuted,
  formatDate,
  postureBadge,
  implStatusLabel,
} from './nodeMeta';
import type {
  LineageNode,
  LineageSSPRow,
} from '@/composables/useLineage/types';

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

// Per-SSP table: how the control stands (evidence + implementation status) in each
// plan, so one SSP's status doesn't hide another's.
const sspRows = ref<LineageSSPRow[]>([]);
const sspState = ref<'idle' | 'loading' | 'loaded' | 'error' | 'skipped'>(
  'idle',
);

const kind = computed(() => (props.node ? nodeKind(props.node) : 'structural'));

// Risk / evidence node detail (only the fields the API actually sent).
const riskStatus = computed(() =>
  props.node ? riskStatusBadge(props.node.status) : null,
);
// A remediated/accepted risk is grayed out — keep the severity label, drop the
// alarming green/orange/red colour.
const severity = computed(() => {
  if (!props.node) return null;
  const b = severityBadge(props.node);
  if (!b) return null;
  return isRiskMuted(props.node.status)
    ? {
        ...b,
        class:
          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      }
    : b;
});
const evidenceStateVal = computed(() =>
  props.node ? evidenceStateBadge(props.node.status) : null,
);
const riskScore = computed(
  () => props.node?.score ?? props.node?.risk?.openScoreSum ?? 0,
);
const riskDetail = computed(() => {
  const n = props.node;
  if (!n) return [] as { label: string; value: string }[];
  const f: { label: string; value: string }[] = [];
  if (n.likelihood) f.push({ label: 'Likelihood', value: n.likelihood });
  if (n.impact) f.push({ label: 'Impact', value: n.impact });
  if (n.linkedEvidenceCount != null)
    f.push({ label: 'Linked evidence', value: String(n.linkedEvidenceCount) });
  const push = (label: string, iso?: string) => {
    const d = formatDate(iso);
    if (d) f.push({ label, value: d });
  };
  push('Review deadline', n.reviewDeadline);
  push('Last reviewed', n.lastReviewedAt);
  push('First seen', n.firstSeenAt);
  push('Last seen', n.lastSeenAt);
  return f;
});
const evidenceDetail = computed(() => {
  const n = props.node;
  if (!n) return [] as { label: string; value: string }[];
  const f: { label: string; value: string }[] = [];
  const push = (label: string, iso?: string) => {
    const d = formatDate(iso);
    if (d) f.push({ label, value: d });
  };
  push('Collected', n.collectedAt);
  push('Expires', n.expires);
  if (n.relationship) f.push({ label: 'Relationship', value: n.relationship });
  return f;
});

// Full-strength risk statuses vs muted (accepted / mitigated) ones. Muted rows
// stay visible but de-emphasised per the spec.
const riskRows = computed(() => {
  const c = props.node?.risk?.counts;
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

// Monotonic token: two rapid node switches race, so we ignore any response whose
// node key is no longer the selected one by the time it resolves (last-writer-wins
// would otherwise show node A's evidence under node B).
let evidenceRequestKey: string | null = null;

async function loadEvidence(node: LineageNode) {
  evidenceRequestKey = node.key;
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
    // A newer node was selected while this was in flight — drop the stale result.
    if (evidenceRequestKey !== node.key) return;
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
    if (evidenceRequestKey !== node.key) return;
    console.warn('[LineageNodeDrawer] evidence fetch failed', err);
    evidenceState.value = 'error';
  }
}

let sspRequestKey: string | null = null;

async function loadSSPRows(node: LineageNode) {
  sspRequestKey = node.key;
  sspRows.value = [];
  // Per-SSP status is control-scoped and API-only (a fixture build has no plans).
  if (props.usingFixtures || !node.controlId) {
    sspState.value = 'skipped';
    return;
  }
  sspState.value = 'loading';
  try {
    // The table is inherently multi-SSP, so it is NOT scoped to the selected SSP.
    const res = await instance.get(
      `/api/lineage/nodes/${encodeURIComponent(node.key)}/ssps`,
    );
    if (sspRequestKey !== node.key) return;
    const rows = res.data?.data ?? res.data ?? [];
    sspRows.value = Array.isArray(rows) ? (rows as LineageSSPRow[]) : [];
    sspState.value = 'loaded';
  } catch (err) {
    if (sspRequestKey !== node.key) return;
    console.warn('[LineageNodeDrawer] per-SSP fetch failed', err);
    sspState.value = 'error';
  }
}

watch(
  () => [props.visible, props.node?.key] as const,
  ([visible]) => {
    if (visible && props.node) {
      loadEvidence(props.node);
      loadSSPRows(props.node);
    }
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
    class="w-full! md:w-1/2! lg:w-3/5!"
    :header="node?.title ?? 'Node details'"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="node" class="flex flex-col gap-6">
      <!-- Structural nodes: compliance + risk rollups -->
      <template v-if="kind === 'structural'">
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

        <!-- Per-SSP status (control nodes): how the control stands in each plan —
             its posture, evidence status and declared implementation status — so
             one plan's status doesn't hide another's. -->
        <section v-if="node.controlId">
          <h3
            class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-100"
          >
            Per-SSP status
          </h3>
          <p v-if="sspState === 'loading'" class="text-sm text-surface-500">
            Loading per-SSP status…
          </p>
          <p
            v-else-if="sspState === 'skipped'"
            class="text-sm text-surface-500 dark:text-surface-400"
          >
            Per-SSP status is available when connected to the API.
          </p>
          <p
            v-else-if="sspState === 'error'"
            class="text-sm text-surface-500 dark:text-surface-400"
          >
            Could not load per-SSP status.
          </p>
          <p
            v-else-if="sspRows.length === 0"
            class="text-sm text-surface-500 dark:text-surface-400"
          >
            No system security plans.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-surface-200 text-left text-xs uppercase tracking-wide text-surface-500 dark:border-surface-700 dark:text-surface-400"
                >
                  <th class="py-1 pr-2 font-medium">SSP</th>
                  <th class="px-2 py-1 font-medium">Status</th>
                  <th class="px-2 py-1 font-medium">Evidence</th>
                  <th class="py-1 pl-2 font-medium">Implementation</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in sspRows"
                  :key="row.sspId"
                  class="border-b border-surface-100 dark:border-surface-800"
                  :class="!row.inProfile ? 'opacity-60' : ''"
                >
                  <td
                    class="py-1.5 pr-2 font-medium text-surface-700 dark:text-surface-100"
                  >
                    {{ row.sspTitle || 'Untitled SSP' }}
                  </td>
                  <td class="px-2 py-1.5">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
                      :class="postureBadge(row.posture).class"
                      >{{ postureBadge(row.posture).label }}</span
                    >
                  </td>
                  <td class="px-2 py-1.5">
                    <span
                      v-if="row.inProfile"
                      class="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                      :class="evidenceStateBadge(row.evidenceStatus).class"
                      >{{ evidenceStateBadge(row.evidenceStatus).label }}</span
                    >
                    <span v-else class="text-surface-400">—</span>
                  </td>
                  <td class="py-1.5 pl-2">
                    <span
                      v-if="
                        row.inProfile &&
                        implStatusLabel(row.implementationStatus)
                      "
                      class="text-surface-700 dark:text-surface-200"
                      >{{ implStatusLabel(row.implementationStatus) }}</span
                    >
                    <span v-else class="text-surface-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

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
          <p
            v-if="evidenceState === 'loading'"
            class="text-sm text-surface-500"
          >
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
      </template>

      <!-- Risk node detail -->
      <template v-else-if="kind === 'risk'">
        <div
          class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/60"
        >
          <p
            class="text-xs uppercase tracking-wide text-surface-600 dark:text-surface-300"
          >
            Risk score
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <span
              class="text-2xl font-semibold text-surface-800 dark:text-surface-0"
              >{{ riskScore }}</span
            >
            <span
              v-if="riskStatus"
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="riskStatus.class"
              >{{ riskStatus.label }}</span
            >
            <span
              v-if="severity"
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="severity.class"
              >{{ severity.label }}</span
            >
          </div>
        </div>
        <dl
          v-if="riskDetail.length"
          class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm"
        >
          <div v-for="f in riskDetail" :key="f.label">
            <dt
              class="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400"
            >
              {{ f.label }}
            </dt>
            <dd class="text-surface-700 dark:text-surface-100">
              {{ f.value }}
            </dd>
          </div>
        </dl>
        <p class="text-xs text-surface-400 italic dark:text-surface-500">
          Expand this risk in the graph to see its evidence.
        </p>
      </template>

      <!-- Evidence node detail -->
      <template v-else>
        <div
          class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/60"
        >
          <p
            class="text-xs uppercase tracking-wide text-surface-600 dark:text-surface-300"
          >
            Evidence state
          </p>
          <div class="mt-2">
            <span
              v-if="evidenceStateVal"
              class="rounded-full px-2.5 py-1 text-sm font-semibold"
              :class="evidenceStateVal.class"
              >{{ evidenceStateVal.label }}</span
            >
          </div>
        </div>
        <div v-if="node.reason">
          <p
            class="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400"
          >
            Reason
          </p>
          <p class="mt-1 text-sm text-surface-700 dark:text-surface-100">
            {{ node.reason }}
          </p>
        </div>
        <dl
          v-if="evidenceDetail.length"
          class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm"
        >
          <div v-for="f in evidenceDetail" :key="f.label">
            <dt
              class="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400"
            >
              {{ f.label }}
            </dt>
            <dd class="text-surface-700 dark:text-surface-100">
              {{ f.value }}
            </dd>
          </div>
        </dl>
      </template>

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
