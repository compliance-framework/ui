<script setup lang="ts">
/**
 * One Compliance Map node, as a tree row or a graph card: its title and type (and, for a linked
 * catalog, whether it implements or documents its parent), then by kind: a structural node's
 * compliance, posture in the selected SSP, inheritance, posture distribution and open-risk heat;
 * a risk's status, severity, score and evidence; or an evidence item's state and dates. Every
 * badge has text, and the distribution bar repeats its breakdown in words.
 */
import { computed } from 'vue';
import {
  formatDate,
  nodeKind,
  postureDisplay,
  postureDistribution,
} from '@/components/lineage/nodeMeta';
import type { LineageNode } from '@/composables/useLineage/types';
import DistributionBar from '@/ds/components/DistributionBar/DistributionBar.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  NODE_TYPE_LABELS,
  distributionSegments,
  evidenceBadge,
  leverageBadge,
  postureBadge,
  riskStatusBadge,
  severityBadge,
  structuralBadge,
} from './lineageStatus';

const props = defineProps<{ node: LineageNode }>();

const kind = computed(() => nodeKind(props.node));
const typeLabel = computed(
  () => NODE_TYPE_LABELS[props.node.nodeType] ?? props.node.nodeType,
);
const relationship = computed(() =>
  ['implements', 'documents'].includes(props.node.relationship ?? '')
    ? props.node.relationship
    : undefined,
);

// Structural ------------------------------------------------------------------------------------
const compliance = computed(() => {
  const c = props.node.compliance;
  const parts = [
    `${c.satisfied} satisfied`,
    ...((c.inherited ?? 0) > 0 ? [`${c.inherited} inherited`] : []),
    `${c.notSatisfied} not satisfied`,
    `${c.unknown} unknown`,
  ];
  return `${Math.round(c.compliancePercent)}% compliant · ${parts.join(', ')} of ${c.totalControls}`;
});
// In SSP scope the posture chip explains a control's state; satisfied/not satisfied are
// already in the compliance line.
const posture = computed(() => {
  const display = postureDisplay(props.node);
  return display?.label ? postureBadge(props.node.ssp?.posture) : undefined;
});
const leverage = computed(() =>
  props.node.ssp?.posture === 'inherited'
    ? undefined
    : leverageBadge(props.node.ssp?.leverage),
);
const linkage = computed(() => {
  if (postureDisplay(props.node)) return [];
  const l = props.node.linkage;
  return [
    ...(l.unanchored ? ['Unanchored: not linked to any standard'] : []),
    ...(l.unmapped ? ['Unmapped: no linked controls'] : []),
  ];
});
const distribution = computed(() => postureDistribution(props.node));
const breakdown = computed(() =>
  distribution.value
    ? distribution.value.segments.map((s) => `${s.count} ${s.label}`).join(', ')
    : '',
);
const heat = computed(() => structuralBadge(props.node));

// Risk ------------------------------------------------------------------------------------------
const riskStatus = computed(() => riskStatusBadge(props.node.status));
const severity = computed(() => severityBadge(props.node));
const riskScore = computed(
  () => props.node.score ?? props.node.risk?.openScoreSum ?? 0,
);
const linkedEvidence = computed(
  () => props.node.linkedEvidenceCount ?? props.node.childrenCount,
);

// Evidence --------------------------------------------------------------------------------------
const evidence = computed(() => evidenceBadge(props.node.status));
const evidenceDates = computed(() =>
  [
    formatDate(props.node.collectedAt) &&
      `Collected ${formatDate(props.node.collectedAt)}`,
    formatDate(props.node.expires) &&
      `expires ${formatDate(props.node.expires)}`,
  ]
    .filter(Boolean)
    .join(', '),
);
</script>

<template>
  <Stack gap="2">
    <Cluster gap="2">
      <Text as="span" variant="label">{{ node.title }}</Text>
      <Tag :label="typeLabel" />
      <Tag v-if="relationship" :label="relationship" />
    </Cluster>

    <template v-if="kind === 'structural'">
      <Cluster gap="2">
        <StatusBadge :status="heat.status" :label="heat.label" />
        <StatusBadge
          v-if="posture"
          :status="posture.status"
          :label="posture.label"
        />
        <StatusBadge
          v-if="leverage"
          :status="leverage.status"
          :label="leverage.label"
        />
        <Tag v-for="item in linkage" :key="item" :label="item" />
      </Cluster>
      <Text as="span" variant="caption">{{ compliance }}</Text>
      <Stack v-if="distribution" gap="1">
        <DistributionBar :segments="distributionSegments(distribution)" />
        <Text as="span" variant="caption"
          >{{ distribution.caption }}: {{ breakdown }}</Text
        >
      </Stack>
    </template>

    <Cluster v-else-if="kind === 'risk'" gap="2">
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
      <Text as="span" variant="caption"
        >Score {{ riskScore
        }}<template v-if="linkedEvidence">
          · {{ linkedEvidence }} evidence</template
        ></Text
      >
    </Cluster>

    <Stack v-else gap="1">
      <Cluster gap="2">
        <StatusBadge :status="evidence.status" :label="evidence.label" />
        <Text v-if="evidenceDates" as="span" variant="caption">{{
          evidenceDates
        }}</Text>
      </Cluster>
      <Text v-if="node.reason" as="span" variant="caption">{{
        node.reason
      }}</Text>
    </Stack>
  </Stack>
</template>
