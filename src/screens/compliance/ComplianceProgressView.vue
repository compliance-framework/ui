<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import type { ProfileComplianceProgress } from '@/types/compliance';
import { leverageTooltip } from '@/utils/compliance';
import { plural } from '@/ds/format';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import DistributionBar from '@/ds/components/DistributionBar/DistributionBar.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import MetricTile from '@/ds/components/MetricTile/MetricTile.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import ProgressBar from '@/ds/components/ProgressBar/ProgressBar.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import {
  controlStatus,
  evidenceSegments,
  filterControls,
  leverageLabel,
  readView,
  viewQuery,
  type ComplianceView,
  type ControlStatus,
} from './complianceView';

/**
 * One profile's compliance progress: totals, overall and per-group breakdowns, implementation
 * coverage, and every control with its status and evidence. Each total filters the controls; the
 * status filter and search live in the URL. Used by This System > Compliance and by a profile's
 * Compliance tab; `systemId` adds links to the system's inherited capabilities.
 */
const props = defineProps<{
  progress: ProfileComplianceProgress;
  systemId?: string;
}>();

const route = useRoute();
const router = useRouter();
const view = computed(() => readView(route.query));

function withView(next: ComplianceView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of ['exclude', 'status', 'q']) delete query[key];
  return { ...query, ...viewQuery(next) };
}
function go(patch: Partial<ComplianceView>): void {
  void router.push({ query: withView({ ...view.value, ...patch }) });
}

const progress = computed(() => props.progress);
// Totals --------------------------------------------------------------------------------------

const summary = computed(() => progress.value?.summary);
const statusLink = (s: ControlStatus | '') => ({
  query: withView({ ...view.value, status: s }),
  hash: '#controls',
});
const tiles = computed(() => {
  const s = summary.value;
  if (!s) return [];
  return [
    {
      key: 'satisfied',
      label: 'Satisfied',
      value: String(s.satisfied),
      to: statusLink('satisfied'),
    },
    {
      key: 'inherited',
      label: 'Inherited',
      value: String(s.inherited ?? 0),
      to: statusLink('inherited'),
    },
    {
      key: 'not-satisfied',
      label: 'Not satisfied',
      value: String(s.notSatisfied),
      to: statusLink('not-satisfied'),
    },
    {
      key: 'unknown',
      label: 'Unknown',
      value: String(s.unknown),
      to: statusLink('unknown'),
    },
    {
      key: 'compliance',
      label: 'Compliance',
      value: `${s.compliancePercent}%`,
      description: `of ${plural(s.totalControls, 'control')}`,
      to: statusLink(''),
    },
    {
      key: 'assessed',
      label: 'Assessed',
      value: `${s.assessedPercent}%`,
      description: 'have evidence',
      to: statusLink(''),
    },
  ];
});
const overall = computed(() => {
  const s = summary.value;
  return s
    ? [
        { status: 'satisfied' as const, count: s.satisfied },
        { status: 'inherited' as const, count: s.inherited ?? 0 },
        { status: 'not-satisfied' as const, count: s.notSatisfied },
        { status: 'unknown' as const, count: s.unknown },
      ]
    : [];
});
const groups = computed(() =>
  (progress.value?.groups ?? []).map((group) => {
    const notImplemented = (progress.value?.controls ?? []).filter(
      (c) => c.groupId === group.id && c.implemented === false,
    ).length;
    return {
      ...group,
      segments: [
        { status: 'satisfied' as const, count: group.satisfied },
        { status: 'inherited' as const, count: group.inherited ?? 0 },
        { status: 'not-satisfied' as const, count: group.notSatisfied },
        { status: 'unknown' as const, count: group.unknown },
      ],
      caption: [
        `${group.satisfied} satisfied`,
        (group.inherited ?? 0) > 0 ? `${group.inherited} inherited` : '',
        `${group.notSatisfied} not satisfied`,
        `${group.unknown} unknown`,
        progress.value?.implementation
          ? `${notImplemented} not implemented`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }),
);

// Controls ------------------------------------------------------------------------------------

const draft = ref(view.value.q);
watch(
  () => view.value.q,
  (q) => (draft.value = q),
);
const statusOptions = [
  { value: '', label: 'Any status' },
  { value: 'satisfied', label: 'Satisfied' },
  { value: 'inherited', label: 'Inherited' },
  { value: 'not-satisfied', label: 'Not satisfied' },
  { value: 'unknown', label: 'Unknown' },
];
const chips = computed(() => [
  ...(view.value.q
    ? [{ label: `Search: ${view.value.q}`, remove: { q: '' } }]
    : []),
  ...(view.value.status
    ? [
        {
          label: `Status: ${statusOptions.find((o) => o.value === view.value.status)?.label}`,
          remove: { status: '' as const },
        },
      ]
    : []),
]);
const rows = computed(() =>
  filterControls(progress.value?.controls ?? [], view.value).map((control) => ({
    id: `${control.catalogId}:${control.controlId}`,
    control,
    group: control.groupTitle || 'Ungrouped',
    status: controlStatus(control),
    evidence: evidenceSegments(control),
  })),
);
const summaryText = computed(() =>
  chips.value.length ? `${plural(rows.value.length, 'control')} match.` : '',
);
</script>

<template>
  <Stack gap="6">
    <Grid min="sm" gap="3">
      <MetricTile
        v-for="tile in tiles"
        :key="tile.key"
        :label="tile.label"
        :value="tile.value"
        :description="tile.description"
        :to="tile.to"
      />
    </Grid>

    <Grid min="lg" gap="4">
      <Panel
        title="Overall compliance"
        :description="`${summary?.compliancePercent}% compliant`"
      >
        <Stack gap="2">
          <DistributionBar :segments="overall" />
          <Text variant="caption"
            >{{ summary?.satisfied }} satisfied ·
            {{ summary?.inherited ?? 0 }} inherited ·
            {{ summary?.notSatisfied }} not satisfied ·
            {{ summary?.unknown }} unknown</Text
          >
        </Stack>
      </Panel>
      <Panel v-if="progress?.implementation" title="Implementation coverage">
        <ProgressBar
          label="Controls implemented"
          :value="progress.implementation.implementedControls"
          :max="
            progress.implementation.implementedControls +
            progress.implementation.unimplementedControls
          "
          tone="success"
        />
      </Panel>
    </Grid>

    <Panel v-if="groups.length" title="By group">
      <Stack gap="4">
        <Stack v-for="group in groups" :key="group.id" gap="1">
          <Text variant="label"
            >{{ group.title }} · {{ group.compliancePercent }}% compliant</Text
          >
          <DistributionBar :segments="group.segments" />
          <Text variant="caption">{{ group.caption }}</Text>
        </Stack>
      </Stack>
    </Panel>

    <Panel
      id="controls"
      title="Controls"
      :description="plural(progress?.controls.length ?? 0, 'control')"
    >
      <Stack gap="4">
        <FilterBar
          v-model:query="draft"
          label="Filter controls"
          search-label="Search controls"
          search-placeholder="ID, title or group, e.g. ac-2"
          :chips="chips"
          :summary="summaryText"
          @search="go({ q: draft.trim() })"
          @remove="(index) => go(chips[index]!.remove)"
          @clear="go({ q: '', status: '' })"
        >
          <FormField label="Status">
            <Select
              :model-value="view.status"
              :options="statusOptions"
              @update:model-value="
                (value) => go({ status: value as ControlStatus })
              "
            />
          </FormField>
        </FilterBar>
        <DataTable
          v-if="rows.length"
          caption="Controls and their status"
          caption-hidden
          :columns="[
            { key: 'control', label: 'Control', minWidth: 'md' },
            { key: 'group', label: 'Group' },
            { key: 'status', label: 'Status', nowrap: true },
            { key: 'evidence', label: 'Evidence', minWidth: 'sm' },
          ]"
          :rows="rows"
          :row-key="(r) => r.id"
        >
          <template #cell-control="{ row: r }">
            <Stack gap="1">
              <Text as="span" variant="label">{{ r.control.controlId }}</Text>
              <Text as="span">{{ r.control.title }}</Text>
              <template v-if="r.control.leverage && systemId">
                <TextLink
                  :to="{
                    name: 'system-security-plan-inherited-capabilities',
                    params: { id: systemId },
                  }"
                  >{{ leverageLabel(r.control.leverage) }}</TextLink
                >
                <Text as="span" variant="caption">{{
                  leverageTooltip(r.control.leverage)
                }}</Text>
              </template>
            </Stack>
          </template>
          <template #cell-status="{ row: r }"
            ><StatusBadge :status="r.status"
          /></template>
          <template #cell-evidence="{ row: r }">
            <Stack gap="1">
              <DistributionBar :segments="r.evidence" />
              <Text as="span" variant="caption"
                >{{ r.evidence[0]!.count }} satisfied ·
                {{ r.evidence[1]!.count }} not satisfied ·
                {{ r.evidence[2]!.count }} unknown</Text
              >
            </Stack>
          </template>
        </DataTable>
        <Text v-else variant="secondary">No controls match.</Text>
      </Stack>
    </Panel>
  </Stack>
</template>
