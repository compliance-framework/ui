<template>
  <table class="table-auto w-full rounded-full dark:text-slate-300">
    <thead>
      <tr class="border-b border-ccf-300 dark:border-slate-800">
        <th
          class="py-2 pl-4 pr-2 text-left text-sm font-medium"
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
        <td class="py-3 px-2">
          <RouterLink
            class="block break-words max-w-2xl rounded-md text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-500 dark:text-slate-100"
            :to="evidenceRoute(item)"
            @click.stop
          >
            {{ item.title }}
          </RouterLink>
        </td>
        <td class="py-2 px-2 whitespace-nowrap">
          {{ formatDateTime(item.end) }}
        </td>
        <td class="px-2" v-if="configStore.showLabels">
          <div class="h-full flex items-center">
            <button
              v-tooltip.top="'Show hidden labels'"
              type="button"
              class="cursor-pointer mr-2"
              @click.stop="toggle($event, item.labels)"
            >
              <BIconEye />
            </button>
            <LabelList
              :show-all="configStore.showHiddenLabels"
              :labels="item.labels"
            />
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <Popover ref="op" class="max-w-[40rem]">
    <div class="flex gap-2 items-center flex-wrap">
      <Chip
        class="mx-0.5 text-sm"
        v-for="label in popoverLabels"
        :key="label"
        :label="label"
      />
    </div>
  </Popover>
</template>
<script setup lang="ts">
import LabelList from '@/components/LabelList.vue';
import ResultStatusRing from '@/components/ResultStatusRing.vue';
import { useConfigStore } from '@/stores/config.ts';
import Popover from '@/volt/Popover.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
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
  }>(),
  {
    sortBy: 'lastSeenAt',
    sortDirection: 'desc',
  },
);

const emit = defineEmits<{
  sort: [sortBy: EvidenceSortBy];
}>();

const popoverLabels = ref<string[]>([]);
const op = ref();

const configStore = useConfigStore();
const router = useRouter();

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
  popoverLabels.value = labels.map(
    (label: EvidenceLabel) => `${label.name}=${label.value}`,
  );
  op.value.toggle(event);
}

async function openEvidence(item: Evidence) {
  await router.push(evidenceRoute(item));
}

function evidenceRoute(item: Evidence) {
  return {
    name: 'evidence:view',
    params: { id: item.id },
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
