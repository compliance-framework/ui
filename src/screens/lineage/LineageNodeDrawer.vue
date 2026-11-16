<script setup lang="ts">
/**
 * A Compliance Map node's details in a drawer. A structural node: compliance and open risk, each
 * SSP's status for a control, inherited capabilities, linkage, risks by status and evidence (the
 * last three loaded from the API). A risk: its score, status, severity and dates. Evidence: its
 * state, reason and dates. The script is the classic drawer's.
 */
import { computed, ref, watch } from 'vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import {
  restoreUnscopedRefresh,
  takeUnscopedRefresh,
} from '@/composables/useLineage';
import {
  nodeKind,
  formatDate,
  implStatusLabel,
} from '@/components/lineage/nodeMeta';
import {
  evidenceBadge,
  leverageBadge,
  postureBadge,
  responsibilityBadge,
  riskHeatBadge,
  riskStatusBadge,
  satisfactionBadge,
  severityBadge,
  type MapBadge,
} from './lineageStatus';
import type {
  LineageNode,
  LineageSSPRow,
  LineageLeverageRow,
  LineageLeverageLink,
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

// Inherited-capabilities detail: which downstream SSPs inherit this control from an
// upstream offering, with per-responsibility posture (GET /nodes/:key/leverage).
const leverageRows = ref<LineageLeverageRow[]>([]);
const leverageState = ref<'idle' | 'loading' | 'loaded' | 'error' | 'skipped'>(
  'idle',
);

// A single link's badge (drifted/revoked/superseded vs plain Inherited). leverageBadge
// keys off `.links`/`.status`, so we hand it a one-link summary synthesised from the
// link. Never null here (links: 1), but keep a fallback for the type.
function linkLeverageBadge(link: LineageLeverageLink): MapBadge {
  return (
    leverageBadge({
      links: 1,
      status: link.status,
      satisfaction: link.satisfaction,
      outstandingCount: link.outstandingResponsibilities?.length ?? 0,
      totalResponsibilities: link.responsibilities?.length ?? 0,
    }) ?? { status: 'inherited' }
  );
}

// The union of a link's full + outstanding responsibilities (deduped by uuid), each
// carrying its live evidence posture from the UUID-keyed responsibilityPosture map.
function responsibilityRows(link: LineageLeverageLink) {
  const descriptions = new Map<string, string>();
  for (const responsibility of link.responsibilities ?? []) {
    descriptions.set(
      responsibility.responsibilityUuid,
      responsibility.description,
    );
  }
  for (const outstanding of link.outstandingResponsibilities ?? []) {
    if (!descriptions.has(outstanding.responsibilityUuid)) {
      descriptions.set(outstanding.responsibilityUuid, outstanding.description);
    }
  }
  return [...descriptions].map(([responsibilityUuid, description]) => ({
    responsibilityUuid,
    description,
    posture: link.responsibilityPosture?.[responsibilityUuid],
  }));
}

const kind = computed(() => (props.node ? nodeKind(props.node) : 'structural'));

// Risk / evidence node detail (only the fields the API actually sent).
const riskStatus = computed(() =>
  props.node ? riskStatusBadge(props.node.status) : undefined,
);
// A remediated/accepted risk is grayed out — keep the severity label, drop the
// alarming green/orange/red colour.
const severity = computed(() =>
  props.node ? severityBadge(props.node) : undefined,
);
const evidenceStateVal = computed(() =>
  props.node ? evidenceBadge(props.node.status) : undefined,
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
    },
    {
      label: 'Investigating',
      count: c.investigating,
      muted: false,
    },
    {
      label: 'Mitigating (planned)',
      count: c.mitigatingPlanned,
      muted: false,
    },
    {
      label: 'Mitigating (implemented)',
      count: c.mitigatingImplemented,
      muted: true,
    },
    {
      label: 'Accepted',
      count: c.riskAccepted,
      muted: true,
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
  const refresh = takeUnscopedRefresh();
  try {
    // The table is inherently multi-SSP, so it is NOT scoped to the selected SSP.
    // After a view refresh it rebuilds the unscoped data it reads, too.
    const url = `/api/lineage/nodes/${encodeURIComponent(node.key)}/ssps`;
    const res = refresh
      ? await instance.get(url, { params: { refresh: 'true' } })
      : await instance.get(url);
    if (sspRequestKey !== node.key) return;
    const rows = res.data?.data ?? res.data ?? [];
    sspRows.value = Array.isArray(rows) ? (rows as LineageSSPRow[]) : [];
    sspState.value = 'loaded';
  } catch (err) {
    // The rebuild may not have happened: leave it for the next request.
    if (refresh) restoreUnscopedRefresh();
    if (sspRequestKey !== node.key) return;
    console.warn('[LineageNodeDrawer] per-SSP fetch failed', err);
    sspState.value = 'error';
  }
}

let leverageRequestKey: string | null = null;

async function loadLeverage(node: LineageNode) {
  leverageRequestKey = node.key;
  leverageRows.value = [];
  // Control-scoped and API-only — a fixture build has no downstream SSPs to inherit.
  if (props.usingFixtures || !node.controlId) {
    leverageState.value = 'skipped';
    return;
  }
  leverageState.value = 'loading';
  try {
    // The fetch shows ALL downstream SSPs (mirrors /ssps); it is not scoped to the
    // lineage view's sspId. responsibilityPosture is UUID-keyed — fencing it from the
    // camelCase interceptor is REQUIRED or its keys stop matching any responsibility.
    const res = await instance.get(
      `/api/lineage/nodes/${encodeURIComponent(node.key)}/leverage`,
      { camelcaseStopPaths: ['data.links.responsibilityPosture'] },
    );
    if (leverageRequestKey !== node.key) return;
    leverageRows.value = Array.isArray(res.data?.data) ? res.data.data : [];
    leverageState.value = 'loaded';
  } catch (err) {
    if (leverageRequestKey !== node.key) return;
    console.warn('[LineageNodeDrawer] leverage fetch failed', err);
    leverageState.value = 'error';
  }
}

watch(
  () => [props.visible, props.node?.key] as const,
  ([visible]) => {
    if (visible && props.node) {
      loadEvidence(props.node);
      loadSSPRows(props.node);
      loadLeverage(props.node);
    }
  },
  { immediate: true },
);

const SSP_COLUMNS: DataTableColumn[] = [
  { key: 'sspTitle', label: 'SSP', minWidth: 'sm' },
  { key: 'posture', label: 'Status' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'implementation', label: 'Implementation' },
];
const EVIDENCE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'Evidence', minWidth: 'sm' },
  { key: 'status', label: 'Status' },
];
const linkageFacts = computed(() =>
  props.node
    ? [
        {
          key: 'policies',
          label: 'Policies',
          value: props.node.linkage.policies,
        },
        {
          key: 'procedures',
          label: 'Procedures',
          value: props.node.linkage.procedures,
        },
        {
          key: 'operational',
          label: 'Operational controls',
          value: props.node.linkage.operationalControls,
        },
      ]
    : [],
);
const riskFacts = computed(() =>
  riskRows.value.map((row) => ({
    key: row.label,
    label: row.muted ? `${row.label} (not open)` : row.label,
    value: row.count,
  })),
);
const toFacts = (rows: { label: string; value: string }[]) =>
  rows.map((row) => ({ key: row.label, label: row.label, value: row.value }));
const sspTableRows = computed(() =>
  sspRows.value.map((row) => ({ ...row, id: row.sspId })),
);

const open = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});
</script>

<template>
  <Drawer v-model:open="open" :title="node?.title ?? 'Node details'">
    <Stack v-if="node" gap="6">
      <template v-if="kind === 'structural'">
        <Grid min="sm" gap="3">
          <Panel title="Compliance" :level="3" dense>
            <Text variant="metric">{{ compliancePercent }}%</Text>
            <Text variant="caption"
              >{{ node.compliance.satisfied }} satisfied,
              {{ node.compliance.notSatisfied }} not satisfied,
              {{ node.compliance.unknown }} unknown, of
              {{ node.compliance.totalControls }}</Text
            >
          </Panel>
          <Panel title="Open risk" :level="3" dense>
            <Stack gap="2">
              <StatusBadge
                :status="riskHeatBadge(node.risk).status"
                :label="riskHeatBadge(node.risk).label"
              />
              <Text v-if="node.risk.mutedScoreSum > 0" variant="caption"
                >Plus {{ node.risk.mutedScoreSum }} accepted or mitigated</Text
              >
              <Text v-if="node.compliance.assessedPercent" variant="caption"
                >{{ Math.round(node.compliance.assessedPercent) }}%
                assessed</Text
              >
            </Stack>
          </Panel>
        </Grid>

        <PanelSection
          v-if="node.controlId"
          title="Status in each SSP"
          :level="3"
        >
          <Text v-if="sspState === 'loading'" variant="secondary"
            >Loading each SSP's status…</Text
          >
          <Text v-else-if="sspState === 'skipped'" variant="secondary"
            >Each SSP's status is shown when connected to the API.</Text
          >
          <Text v-else-if="sspState === 'error'" variant="secondary"
            >Each SSP's status didn't load.</Text
          >
          <Text v-else-if="sspRows.length === 0" variant="secondary"
            >No system security plans.</Text
          >
          <DataTable
            v-else
            caption="Status in each SSP"
            caption-hidden
            :columns="SSP_COLUMNS"
            :rows="sspTableRows"
            :row-key="(row) => row.id"
          >
            <template #cell-sspTitle="{ row }">{{
              row.sspTitle || 'Untitled SSP'
            }}</template>
            <template #cell-posture="{ row }">
              <Cluster gap="1">
                <StatusBadge
                  :status="postureBadge(row.posture).status"
                  :label="postureBadge(row.posture).label"
                />
                <StatusBadge
                  v-if="
                    row.posture !== 'inherited' && leverageBadge(row.leverage)
                  "
                  :status="leverageBadge(row.leverage)!.status"
                  :label="leverageBadge(row.leverage)!.label"
                />
              </Cluster>
            </template>
            <template #cell-evidence="{ row }">
              <StatusBadge
                v-if="row.inProfile"
                :status="evidenceBadge(row.evidenceStatus).status"
                :label="evidenceBadge(row.evidenceStatus).label"
              />
              <template v-else>Not in profile</template>
            </template>
            <template #cell-implementation="{ row }">{{
              (row.inProfile && implStatusLabel(row.implementationStatus)) ||
              'Not set'
            }}</template>
          </DataTable>
        </PanelSection>

        <PanelSection
          v-if="node.controlId"
          title="Inherited capabilities"
          :level="3"
        >
          <Text v-if="leverageState === 'loading'" variant="secondary"
            >Loading inherited capabilities…</Text
          >
          <Text v-else-if="leverageState === 'skipped'" variant="secondary"
            >Inherited capabilities are shown when connected to the API.</Text
          >
          <Text v-else-if="leverageState === 'error'" variant="secondary"
            >Inherited capabilities didn't load.</Text
          >
          <Text v-else-if="leverageRows.length === 0" variant="secondary"
            >This control inherits no capabilities.</Text
          >
          <Stack v-else gap="4">
            <Stack v-for="row in leverageRows" :key="row.sspId" gap="2">
              <Text as="strong" variant="label">{{
                row.sspTitle || 'Untitled SSP'
              }}</Text>
              <Panel
                v-for="link in row.links"
                :key="link.id"
                :aria-label="link.inheritedFrom.offeringTitle"
                dense
              >
                <Stack gap="2">
                  <Cluster gap="2">
                    <Text as="span" variant="label"
                      >{{ link.inheritedFrom.offeringTitle }} · v{{
                        link.inheritedFrom.offeringVersion
                      }}</Text
                    >
                    <StatusBadge
                      :status="linkLeverageBadge(link).status"
                      :label="linkLeverageBadge(link).label"
                    />
                    <StatusBadge
                      :status="satisfactionBadge(link.satisfaction).status"
                      :label="satisfactionBadge(link.satisfaction).label"
                    />
                    <Text as="span" variant="caption"
                      >From {{ link.inheritedFrom.upstreamSspTitle }}</Text
                    >
                  </Cluster>
                  <Stack as="ul" gap="1">
                    <li
                      v-for="resp in responsibilityRows(link)"
                      :key="resp.responsibilityUuid"
                    >
                      <Cluster gap="2">
                        <StatusBadge
                          :status="responsibilityBadge(resp.posture).status"
                          :label="responsibilityBadge(resp.posture).label"
                        />
                        <Text as="span">{{ resp.description }}</Text>
                      </Cluster>
                    </li>
                  </Stack>
                </Stack>
              </Panel>
            </Stack>
          </Stack>
        </PanelSection>

        <PanelSection title="Linkage" :level="3">
          <Stack gap="2">
            <DescriptionList :items="linkageFacts" layout="inline" />
            <Cluster
              v-if="node.linkage.unanchored || node.linkage.unmapped"
              gap="2"
            >
              <Tag
                v-if="node.linkage.unanchored"
                label="Unanchored: not linked to any standard"
              />
              <Tag
                v-if="node.linkage.unmapped"
                label="Unmapped: no linked controls"
              />
            </Cluster>
          </Stack>
        </PanelSection>

        <PanelSection title="Risks by status" :level="3">
          <DescriptionList :items="riskFacts" layout="inline" />
        </PanelSection>

        <PanelSection title="Evidence" :level="3">
          <Text v-if="evidenceState === 'loading'" variant="secondary"
            >Loading evidence…</Text
          >
          <Text v-else-if="evidenceState === 'skipped'" variant="secondary"
            >The evidence list is shown when connected to the API. Compliance is
            {{ compliancePercent }}% across
            {{ node.compliance.totalControls }} controls.</Text
          >
          <Text v-else-if="evidenceState === 'error'" variant="secondary"
            >Evidence for this control didn't load.</Text
          >
          <Text
            v-else-if="evidenceState === 'loaded' && evidence.length === 0"
            variant="secondary"
            >No evidence for this control.</Text
          >
          <DataTable
            v-else
            caption="Evidence"
            caption-hidden
            :columns="EVIDENCE_COLUMNS"
            :rows="evidence"
            :row-key="(row) => row.id"
          >
            <template #cell-status="{ row }">{{
              row.status || 'Not known'
            }}</template>
          </DataTable>
        </PanelSection>
      </template>

      <template v-else-if="kind === 'risk'">
        <Panel title="Risk score" :level="3" dense>
          <Cluster gap="2">
            <Text as="span" variant="metric">{{ riskScore }}</Text>
            <StatusBadge
              v-if="riskStatus"
              :status="riskStatus.status"
              :label="riskStatus.label"
            />
            <StatusBadge
              v-if="severity"
              :status="severity.status"
              :label="severity.label"
            />
          </Cluster>
        </Panel>
        <DescriptionList
          v-if="riskDetail.length"
          :items="toFacts(riskDetail)"
        />
        <Text variant="caption"
          >Expand this risk on the map to see its evidence.</Text
        >
      </template>

      <template v-else>
        <Panel title="Evidence state" :level="3" dense>
          <StatusBadge
            v-if="evidenceStateVal"
            :status="evidenceStateVal.status"
            :label="evidenceStateVal.label"
          />
        </Panel>
        <DescriptionList
          v-if="node.reason || evidenceDetail.length"
          :items="[
            ...(node.reason
              ? [{ key: 'reason', label: 'Reason', value: node.reason }]
              : []),
            ...toFacts(evidenceDetail),
          ]"
        />
      </template>
    </Stack>
  </Drawer>
</template>
