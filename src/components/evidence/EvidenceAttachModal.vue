<template>
  <div class="p-6">
    <div class="mb-4">
      <h4 class="text-md font-medium text-gray-700 dark:text-slate-300">
        Link Evidence by Label Filters
      </h4>
      <p class="text-sm text-gray-600 dark:text-slate-400 mt-1">
        Enter a label filter (e.g., <code>foo=bar AND baz!=qux</code>), search,
        and select evidence to link to this implementation statement.
      </p>
    </div>

    <form @submit.prevent="onSearch">
      <div class="flex gap-2 items-stretch">
        <input
          v-model="filterText"
          type="text"
          placeholder="foo=bar AND (bat=baz OR bat=bay)"
          class="grow px-3 py-2 border border-ccf-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-300"
        />
        <button
          type="submit"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="searchLoading"
        >
          {{ searchLoading ? 'Searching…' : 'Search' }}
        </button>
      </div>
      <p v-if="error" class="mt-2 text-red-600 dark:text-red-400 text-sm">
        {{ error }}
      </p>
    </form>

    <div class="mt-4">
      <h5 class="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        Results ({{ results?.length || 0 }})
      </h5>
      <div v-if="searchLoading" class="text-gray-500 dark:text-slate-400">
        Loading evidence…
      </div>
      <div v-else class="space-y-2 max-h-96 overflow-auto">
        <div
          v-for="ev in results || []"
          :key="ev.uuid"
          class="flex items-start justify-between border border-ccf-300 dark:border-slate-700 rounded-md p-3 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <div class="pr-3">
            <div class="font-medium text-gray-900 dark:text-slate-300">
              {{ ev.title || ev.id }}
            </div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ ev.uuid }}
            </div>
            <div
              class="text-sm text-gray-700 dark:text-slate-400 mt-1 truncate"
            >
              {{ ev.description }}
            </div>
          </div>
          <div class="pl-3 flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4"
              :checked="isSelected(ev)"
              @change="toggleSelection(ev)"
            />
          </div>
        </div>
        <div
          v-if="(results || []).length === 0"
          class="text-gray-500 dark:text-slate-400"
        >
          No evidence matched the filter.
        </div>
      </div>
    </div>

    <div
      class="mt-6 border-t border-ccf-300 dark:border-slate-700 pt-4 flex justify-end gap-3"
    >
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
      >
        Cancel
      </button>
      <button
        type="button"
        @click="save"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Evidence } from '@/stores/evidence.ts';
import type { ByComponent, Link, Property } from '@/oscal';

const props = defineProps<{
  byComponent: ByComponent;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [byComponent: ByComponent];
}>();

const filterText = ref<string>('');
const selectedIds = ref<Set<string>>(new Set());
const error = ref<string | null>(null);

// Evidence search API
const {
  data: searchResults,
  execute: executeSearch,
  isLoading: searchLoading,
} = useDataApi<Evidence[]>(
  '/api/evidence/search',
  {
    method: 'POST',
  },
  { immediate: false },
);

const results = computed(() => searchResults.value || []);

function loadExistingState() {
  // Pre-populate filter from props.byComponent.props name='evidence-filter'
  const filterProp = (props.byComponent.props || []).find(
    (p: Property) => p?.name === 'evidence-filter',
  );
  if (filterProp?.value) {
    filterText.value = filterProp.value;
  }

  // Pre-select evidence from existing links with rel='related-evidence'
  for (const link of props.byComponent.links || []) {
    if (link.rel === 'related-evidence' && link.href) {
      const id = extractEvidenceId(link.href);
      if (id) selectedIds.value.add(id);
    }
  }
}

function extractEvidenceId(href: string): string | null {
  try {
    // Expecting '/evidence/:id' pattern
    const parts = href.split('/').filter(Boolean);
    const idx = parts.lastIndexOf('evidence');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

function isSelected(ev: Evidence): boolean {
  return selectedIds.value.has(ev.id);
}

function toggleSelection(ev: Evidence) {
  if (selectedIds.value.has(ev.id)) {
    selectedIds.value.delete(ev.id);
  } else {
    selectedIds.value.add(ev.id);
  }
}

async function onSearch() {
  error.value = null;
  try {
    const parsed = new FilterParser(filterText.value || '').parse();
    await executeSearch({ data: { filter: parsed } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Invalid filter expression';
  }
}

function ensureArrays(target: ByComponent) {
  if (!target.props) target.props = [];
  if (!target.links) target.links = [];
}

function upsertFilterProp(target: ByComponent) {
  if (!filterText.value) {
    // Remove existing evidence-filter prop if clearing
    target.props = (target.props || []).filter(
      (p) => p?.name !== 'evidence-filter',
    );
    return;
  }
  const existing = (target.props || []).find(
    (p) => p?.name === 'evidence-filter',
  );
  if (existing) {
    existing.value = filterText.value;
  } else {
    target.props!.push({
      name: 'evidence-filter',
      value: filterText.value,
    } as Property);
  }
}

function upsertEvidenceLinks(target: ByComponent) {
  const links = target.links || [];
  const hrefSet = new Set((links || []).map((l) => l.href));
  // Remove existing related-evidence links that are no longer selected
  target.links = links.filter((l) => {
    if (l.rel !== 'related-evidence') return true;
    const id = l.href ? extractEvidenceId(l.href) : null;
    return id ? selectedIds.value.has(id) : false;
  });
  // Add new links for selected IDs not present
  for (const id of selectedIds.value) {
    const href = `/evidence/${id}`;
    if (!hrefSet.has(href)) {
      const item = (results.value || []).find((r) => r.id === id);
      target.links!.push({
        href,
        rel: 'related-evidence',
        text: item?.title || id,
      } as Link);
    }
  }
}

function save() {
  const target = props.byComponent;
  ensureArrays(target);
  // Ensure arrays are copies to trigger reactivity correctly when splicing/filtering
  target.props = [...(target.props || [])];
  target.links = [...(target.links || [])];
  upsertFilterProp(target);
  upsertEvidenceLinks(target);
  emit('saved', target);
}

onMounted(() => {
  loadExistingState();
  // Auto-search if we have a pre-populated filter
  if (filterText.value) {
    onSearch();
  }
});
</script>
