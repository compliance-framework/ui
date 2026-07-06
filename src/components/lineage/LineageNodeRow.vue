<script setup lang="ts">
import { computed } from 'vue';
import {
  BIconExclamationTriangleFill,
  BIconCheckCircleFill,
} from 'bootstrap-icons-vue';
import { heatStyle } from './heatScale';
import RiskHeatBadge from './RiskHeatBadge.vue';
import {
  nodeKind,
  nodeSwatchClass,
  nodeHeatScore,
  riskStatusBadge,
  severityBadge,
  evidenceStateBadge,
  formatDate,
} from './nodeMeta';
import type { LineageNode } from '@/composables/useLineage/types';

const props = defineProps<{
  node: LineageNode;
  /**
   * Card layout: the title reads like a heading (larger, wraps to several lines)
   * with the metadata on a row beneath. Default is the compact single-line row
   * used by the tree.
   */
  card?: boolean;
}>();

const kind = computed(() => nodeKind(props.node));

// Map the node type to a short human tag + a subtle, dark-safe colour.
const TYPE_TAGS: Record<string, { label: string; class: string }> = {
  'standard-catalog': {
    label: 'Standard',
    class:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  'policy-catalog': {
    label: 'Policy Catalog',
    class:
      'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
  'procedure-catalog': {
    label: 'Procedure Catalog',
    class: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  group: {
    label: 'Group',
    class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  control: {
    label: 'Control',
    class: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
  },
  'policy-control': {
    label: 'Policy',
    class:
      'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
  'procedure-control': {
    label: 'Procedure',
    class: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  risk: {
    label: 'Risk',
    class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  evidence: {
    label: 'Evidence',
    class: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  },
};

const typeTag = computed(
  () =>
    TYPE_TAGS[props.node.nodeType] ?? {
      label: props.node.nodeType,
      class:
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    },
);

// --- structural ---
const compliancePercent = computed(() =>
  Math.round(props.node.compliance.compliancePercent),
);
const fullyCompliant = computed(() => {
  const c = props.node.compliance;
  return c.totalControls > 0 && c.notSatisfied === 0 && c.unknown === 0;
});
const warning = computed(() => {
  const l = props.node.linkage;
  if (l.unanchored) return 'Unanchored — not linked to any standard';
  if (l.unmapped) return 'Unmapped — no linked controls';
  return null;
});

// --- risk ---
const riskStatus = computed(() => riskStatusBadge(props.node.status));
const severity = computed(() => severityBadge(props.node));
const riskScore = computed(
  () => props.node.score ?? props.node.risk?.openScoreSum ?? 0,
);
const scoreBadgeClass = computed(() => heatStyle(riskScore.value).badgeClass);
const linkedEvidence = computed(
  () => props.node.linkedEvidenceCount ?? props.node.childrenCount,
);

// --- evidence ---
const evidenceState = computed(() => evidenceStateBadge(props.node.status));
const collectedAt = computed(() => formatDate(props.node.collectedAt));
const expires = computed(() => formatDate(props.node.expires));

const swatchTooltip = computed(() =>
  kind.value === 'evidence'
    ? `Evidence state: ${props.node.status ?? 'unknown'}`
    : `Open risk ${nodeHeatScore(props.node)}`,
);

// Shared badge base — colour comes from the per-kind class.
const badgeBase =
  'rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap';
const chipBase =
  'rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600 whitespace-nowrap dark:bg-surface-800 dark:text-surface-300';
</script>

<template>
  <div
    :class="
      card
        ? 'flex flex-col gap-2'
        : 'flex min-w-0 flex-1 items-center gap-2 py-1'
    "
  >
    <!-- Title line -->
    <div
      class="flex min-w-0 gap-2"
      :class="card ? 'items-start' : 'flex-1 items-center'"
    >
      <!-- Heat / state swatch -->
      <span
        class="h-3 w-3 flex-shrink-0 rounded-sm ring-1 ring-black/5"
        :class="[nodeSwatchClass(node), card ? 'mt-1' : '']"
        v-tooltip.top="swatchTooltip"
      ></span>

      <!-- Title: heading in card mode, single truncated line in row mode -->
      <span
        class="min-w-0"
        :class="
          card
            ? 'line-clamp-4 text-sm leading-snug font-semibold text-surface-800 dark:text-surface-0'
            : 'truncate font-medium text-surface-700 dark:text-surface-0'
        "
        :title="node.title"
      >
        {{ node.title }}
      </span>

      <!-- Row mode keeps the type tag inline; card mode moves it below. -->
      <span
        v-if="!card"
        class="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
        :class="typeTag.class"
      >
        {{ typeTag.label }}
      </span>

      <!-- Unanchored / unmapped indicator -->
      <BIconExclamationTriangleFill
        v-if="warning"
        class="h-4 w-4 flex-shrink-0 text-amber-500"
        :class="card ? 'mt-0.5' : ''"
        v-tooltip.top="warning"
      />
    </div>

    <!-- Metadata line -->
    <div
      :class="
        card
          ? 'flex flex-wrap items-center gap-2 pl-5'
          : 'ml-auto flex flex-shrink-0 items-center gap-2'
      "
    >
      <span
        v-if="card"
        class="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
        :class="typeTag.class"
      >
        {{ typeTag.label }}
      </span>

      <!-- STRUCTURAL: compliance pill + aggregate risk -->
      <template v-if="kind === 'structural'">
        <!-- Compliance pill: percent + satisfied/notSatisfied/unknown.
             Turns green when everything is satisfied. -->
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs whitespace-nowrap"
          :class="
            fullyCompliant
              ? 'bg-emerald-100 dark:bg-emerald-500/25'
              : 'bg-surface-100 dark:bg-surface-800'
          "
          v-tooltip.top="
            `${node.compliance.satisfied} satisfied · ${node.compliance.notSatisfied} not satisfied · ${node.compliance.unknown} unknown of ${node.compliance.totalControls}`
          "
        >
          <BIconCheckCircleFill
            v-if="fullyCompliant"
            class="h-3 w-3 text-emerald-600 dark:text-emerald-400"
          />
          <span
            class="font-semibold"
            :class="
              fullyCompliant
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-surface-700 dark:text-surface-0'
            "
            >{{ compliancePercent }}%</span
          >
          <span class="text-surface-400">·</span>
          <span class="font-medium text-emerald-600 dark:text-emerald-400">{{
            node.compliance.satisfied
          }}</span>
          <span class="text-surface-300">/</span>
          <span class="font-medium text-red-600 dark:text-red-400">{{
            node.compliance.notSatisfied
          }}</span>
          <span class="text-surface-300">/</span>
          <span class="font-medium text-slate-500 dark:text-slate-400">{{
            node.compliance.unknown
          }}</span>
        </span>

        <RiskHeatBadge :risk="node.risk" />
      </template>

      <!-- RISK: status + severity + score + linked evidence -->
      <template v-else-if="kind === 'risk'">
        <span :class="[badgeBase, riskStatus.class]">{{
          riskStatus.label
        }}</span>
        <span v-if="severity" :class="[badgeBase, severity.class]">{{
          severity.label
        }}</span>
        <span :class="[badgeBase, scoreBadgeClass]" v-tooltip.top="'Risk score'"
          >score {{ riskScore }}</span
        >
        <span v-if="linkedEvidence" :class="chipBase"
          >{{ linkedEvidence }} evidence</span
        >
      </template>

      <!-- EVIDENCE: state + collected/expires + reason -->
      <template v-else>
        <span :class="[badgeBase, evidenceState.class]">{{
          evidenceState.label
        }}</span>
        <span v-if="collectedAt" :class="chipBase"
          >collected {{ collectedAt }}</span
        >
        <span
          v-if="expires"
          :class="chipBase"
          v-tooltip.top="'Evidence expires'"
          >expires {{ expires }}</span
        >
        <span
          v-if="node.reason"
          class="max-w-[200px] truncate text-xs text-surface-500 italic dark:text-surface-400"
          :title="node.reason"
          >{{ node.reason }}</span
        >
      </template>
    </div>
  </div>
</template>
