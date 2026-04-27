<template>
  <table class="table-fixed w-full rounded-full dark:text-slate-300">
    <colgroup>
      <col class="w-24" />
      <col class="w-[30%]" />
      <col class="w-48" />
      <col v-if="configStore.showLabels" />
    </colgroup>
    <thead>
      <tr class="border-b border-ccf-300 dark:border-slate-800">
        <th
          class="py-2 pl-4 pr-2 text-left text-sm font-medium whitespace-nowrap"
          :aria-sort="getAriaSort('status')"
        >
          <button
            type="button"
            data-testid="sort-status"
            class="inline-flex items-center gap-1 rounded-md text-left hover:text-ccf-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            @click="emit('sort', 'status')"
          >
            <span>Status</span>
            <span class="text-xs" aria-hidden="true">
              {{ getSortIndicator('status') }}
            </span>
            <span class="sr-only">{{ getSortLabel('status') }}</span>
          </button>
        </th>
        <th
          class="py-2 px-2 text-left text-sm font-medium"
          :aria-sort="getAriaSort('name')"
        >
          <button
            type="button"
            data-testid="sort-evidence-name"
            class="inline-flex items-center gap-1 rounded-md text-left hover:text-ccf-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            @click="emit('sort', 'name')"
          >
            <span>Evidence Name</span>
            <span class="text-xs" aria-hidden="true">
              {{ getSortIndicator('name') }}
            </span>
            <span class="sr-only">{{ getSortLabel('name') }}</span>
          </button>
        </th>
        <th
          class="py-2 px-2 text-left text-sm font-medium"
          :aria-sort="getAriaSort('lastSeenAt')"
        >
          <button
            type="button"
            data-testid="sort-last-seen-at"
            class="inline-flex items-center gap-1 rounded-md text-left hover:text-ccf-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            @click="emit('sort', 'lastSeenAt')"
          >
            <span>Last Seen At</span>
            <span class="text-xs" aria-hidden="true">
              {{ getSortIndicator('lastSeenAt') }}
            </span>
            <span class="sr-only">{{ getSortLabel('lastSeenAt') }}</span>
          </button>
        </th>
        <th
          v-if="configStore.showLabels"
          class="py-2 px-2 text-left text-sm font-medium"
        >
          Labels
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        class="cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
        v-for="item in evidence"
        :key="item.uuid"
        @click="openEvidence(item)"
      >
        <td class="py-2 pl-4 pr-2 w-[1%]">
          <ResultStatusRing
            class="p-0 m-0 whitespace-normal"
            :state="item.status.state?.toLowerCase()"
          ></ResultStatusRing>
        </td>
        <td class="py-3 px-2 min-w-0">
          <RouterLink
            class="block max-w-full break-words rounded-md text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 dark:text-slate-100"
            :to="evidenceRoute(item)"
            :aria-label="`Open evidence ${item.title}`"
            @click.stop
          >
            {{ item.title }}
          </RouterLink>
        </td>
        <td class="py-2 px-2 whitespace-nowrap">
          {{ formatDateTime(item.end) }}
        </td>
        <td class="px-2 py-2 min-w-0" v-if="configStore.showLabels">
          <div class="h-full flex min-w-0 max-w-full items-center gap-2">
            <button
              v-tooltip.top="'View All Labels'"
              type="button"
              class="inline-flex shrink-0 cursor-pointer items-center rounded-md text-gray-600 hover:text-ccf-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:text-ccf-300 dark:focus-visible:ring-offset-slate-900"
              aria-label="View All Labels"
              @click.stop="toggle($event, item.labels)"
            >
              <BIconEye />
            </button>
            <div
              data-testid="label-preview"
              class="flex min-w-0 flex-1 flex-wrap items-start gap-1 py-1"
              :title="labelPreviews[item.id]?.previewTooltip"
            >
              <template v-if="labelPreviews[item.id]?.preview.length">
                <span
                  v-for="(label, index) in labelPreviews[item.id]?.preview"
                  :key="`${item.uuid}-preview-${index}-${label}`"
                  class="inline-block max-w-full min-w-0 whitespace-normal break-words rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm leading-snug text-gray-700 [overflow-wrap:anywhere] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  :title="label"
                >
                  {{ label }}
                </span>
                <button
                  v-if="labelPreviews[item.id]?.hiddenCount"
                  v-tooltip.top="labelPreviews[item.id]?.remainingTooltip"
                  type="button"
                  class="inline-block shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                  :aria-label="labelPreviews[item.id]?.remainingAriaLabel"
                  @click.stop="toggle($event, item.labels)"
                >
                  +{{ labelPreviews[item.id]?.hiddenCount }} more
                  {{
                    labelPreviews[item.id]?.hiddenCount === 1
                      ? 'label'
                      : 'labels'
                  }}
                </button>
              </template>
              <span
                v-else
                class="inline-block shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                No labels
              </span>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <Popover ref="op" class="max-w-[40rem]">
    <div class="flex gap-2 items-center flex-wrap">
      <Chip
        class="mx-0.5 max-w-full whitespace-normal text-sm [overflow-wrap:anywhere]"
        v-for="(label, index) in popoverLabels"
        :key="`popover-${index}-${label}`"
        :label="label"
      />
    </div>
  </Popover>
</template>
<script setup lang="ts">
import ResultStatusRing from '@/components/ResultStatusRing.vue';
import { useConfigStore } from '@/stores/config.ts';
import Popover from '@/volt/Popover.vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import type {
  Evidence,
  EvidenceLabel,
  EvidenceSortBy,
  SortDirection,
} from '@/stores/evidence.ts';
import Chip from '@/volt/Chip.vue';
import { BIconEye } from 'bootstrap-icons-vue';

const props = withDefaults(
  defineProps<{
    evidence: Evidence[];
    sortBy?: EvidenceSortBy;
    sortDirection?: SortDirection;
    navigationQuery?: LocationQueryRaw;
  }>(),
  {
    sortBy: 'lastSeenAt',
    sortDirection: 'desc',
    navigationQuery: undefined,
  },
);

const emit = defineEmits<{
  sort: [sortBy: EvidenceSortBy];
}>();

const popoverLabels = ref<string[]>([]);
const op = ref();

const configStore = useConfigStore();
const route = useRoute();
const router = useRouter();
const LABEL_PREVIEW_LIMIT = 5;

interface LabelPreview {
  preview: string[];
  hiddenCount: number;
  remainingTooltip: string;
  remainingAriaLabel: string;
  previewTooltip: string;
}

function getAriaSort(field: EvidenceSortBy) {
  if (props.sortBy !== field) {
    return 'none';
  }

  return props.sortDirection === 'asc' ? 'ascending' : 'descending';
}

function getSortIndicator(field: EvidenceSortBy) {
  if (props.sortBy !== field) {
    return '-';
  }

  return props.sortDirection === 'asc' ? '^' : 'v';
}

function getSortLabel(field: EvidenceSortBy) {
  if (props.sortBy !== field) {
    return 'Not sorted. Activate to sort this column.';
  }

  const direction = props.sortDirection === 'asc' ? 'ascending' : 'descending';
  return `Sorted ${direction}. Activate to reverse sort direction.`;
}

function toggle(event: Event, labels: EvidenceLabel[]) {
  popoverLabels.value = labels.map(formatLabel);
  op.value?.toggle?.(event);
}

function isHiddenLabel(label: EvidenceLabel) {
  return label.name.startsWith('_');
}

function visibleLabels(labels: EvidenceLabel[]) {
  if (configStore.showHiddenLabels) {
    return labels;
  }

  return labels.filter((label) => !isHiddenLabel(label));
}

function formatLabel(label: EvidenceLabel) {
  return `${label.name}=${label.value}`;
}

function previewLabels(labels: EvidenceLabel[]) {
  return labels.slice(0, LABEL_PREVIEW_LIMIT).map(formatLabel);
}

function hiddenLabelCount(labels: EvidenceLabel[]) {
  return Math.max(labels.length - LABEL_PREVIEW_LIMIT, 0);
}

function remainingLabelsTooltip(labels: EvidenceLabel[]) {
  return labels.slice(LABEL_PREVIEW_LIMIT).map(formatLabel).join('\n');
}

function remainingLabelsAriaText(labels: EvidenceLabel[]) {
  return labels.slice(LABEL_PREVIEW_LIMIT).map(formatLabel).join('; ');
}

function remainingLabelsAriaLabel(labels: EvidenceLabel[]) {
  const hiddenCount = hiddenLabelCount(labels);

  if (hiddenCount === 0) {
    return '';
  }

  return `View all labels. +${hiddenCount} more ${
    hiddenCount === 1 ? 'label' : 'labels'
  }: ${remainingLabelsAriaText(labels)}`;
}

function labelPreviewText(labels: EvidenceLabel[]) {
  if (labels.length === 0) {
    return 'No labels';
  }

  const suffix = labels.length === 1 ? 'label' : 'labels';
  return `${labels.length} ${suffix}`;
}

function labelPreviewTooltip(labels: EvidenceLabel[]) {
  if (labels.length === 0) {
    return 'No labels available';
  }

  return `View ${labelPreviewText(labels)}`;
}

function buildLabelPreview(item: Evidence): LabelPreview {
  const visible = visibleLabels(item.labels);

  return {
    preview: previewLabels(visible),
    hiddenCount: hiddenLabelCount(visible),
    remainingTooltip: remainingLabelsTooltip(visible),
    remainingAriaLabel: remainingLabelsAriaLabel(visible),
    previewTooltip: labelPreviewTooltip(visible),
  };
}

const labelPreviews = computed<Record<string, LabelPreview>>(() => {
  return Object.fromEntries(
    props.evidence.map((item) => [item.id, buildLabelPreview(item)]),
  );
});

async function openEvidence(item: Evidence) {
  await router.push(evidenceRoute(item));
}

function evidenceRoute(item: Evidence) {
  return {
    name: 'evidence:view',
    params: { id: item.id },
    query: props.navigationQuery ?? route.query,
  };
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}
</script>
