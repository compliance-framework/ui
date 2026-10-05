<template>
  <div v-if="!unsupported" class="space-y-2" data-testid="subject-picker">
    <div class="flex flex-wrap items-center gap-2">
      <AutoComplete
        ref="searchInput"
        v-model="query"
        :suggestions="availableSuggestions"
        optionLabel="title"
        placeholder="Search components, parties, users…"
        dropdown
        class="min-w-64 grow"
        :invalid="invalid"
        aria-label="Search subjects"
        @complete="search($event.query, { ssp: sspId ?? undefined })"
        @option-select="add($event.value)"
      >
        <template #item="{ item }">
          <div class="flex flex-col">
            <span class="font-medium text-gray-900 dark:text-slate-100">
              {{ item.title }}
            </span>
            <span class="text-xs text-gray-500 dark:text-slate-400">
              {{ describeSubject(item) }}
            </span>
          </div>
        </template>
      </AutoComplete>
      <Select
        v-if="canReadSsps"
        v-model="sspId"
        :options="sspOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="SSP: any"
        showClear
        class="w-56"
        aria-label="Limit system components to an SSP"
      />
    </div>

    <div
      v-if="modelValue.length"
      class="flex flex-wrap items-center gap-2"
      data-testid="selected-subjects"
    >
      <span class="text-sm text-gray-600 dark:text-slate-400">Selected</span>
      <span
        v-for="subject in modelValue"
        :key="subject.subjectUuid"
        class="inline-flex items-center"
        data-testid="selected-subject"
      >
        <Chip :label="subject.title" class="text-sm" />
        <TertiaryButton
          type="button"
          class="!px-1"
          :aria-label="`Remove ${subject.title}`"
          @click="remove(subject)"
        >
          <BIconX />
        </TertiaryButton>
      </span>
      <TertiaryButton type="button" @click="focusSearch">
        + Add another
      </TertiaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BIconX } from 'bootstrap-icons-vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import Chip from '@/volt/Chip.vue';
import Select from '@/volt/Select.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useDataApi } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { describeSubject, type SubjectSummary } from '@/types/subjects';

interface SSPListItem {
  id: string;
  metadata?: { title?: string };
}

const props = defineProps<{
  modelValue: SubjectSummary[];
  invalid?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [subjects: SubjectSummary[]];
}>();

const { suggestions, unsupported, search } = useSubjectSearch();
const { can } = usePermissions();

// The SSP narrowing needs SSP read, which submitting evidence doesn't; without it the SSP
// list isn't fetched (it would 403) and the dropdown is left out.
const canReadSsps = computed(() => can(RESOURCES.SSP, ACTIONS.READ));
const { data: sspList, execute: loadSsps } = useDataApi<SSPListItem[]>(
  '/api/oscal/system-security-plans',
  null,
  { immediate: false },
);
watch(
  canReadSsps,
  (allowed) => {
    if (allowed && !sspList.value) {
      void loadSsps();
    }
  },
  { immediate: true },
);

const query = ref<string | SubjectSummary>('');
const sspId = ref<string | null>(null);
const searchInput = ref<{ $el?: HTMLElement } | null>(null);

const sspOptions = computed(() =>
  (sspList.value ?? []).map((ssp) => ({
    label: ssp.metadata?.title || ssp.id,
    value: ssp.id,
  })),
);

// Subjects already picked aren't offered again.
const availableSuggestions = computed(() => {
  const picked = new Set(props.modelValue.map((s) => s.subjectUuid));
  return suggestions.value.filter((s) => !picked.has(s.subjectUuid));
});

function add(subject: SubjectSummary) {
  query.value = '';
  if (props.modelValue.some((s) => s.subjectUuid === subject.subjectUuid)) {
    return;
  }
  emit('update:modelValue', [...props.modelValue, subject]);
}

function remove(subject: SubjectSummary) {
  emit(
    'update:modelValue',
    props.modelValue.filter((s) => s.subjectUuid !== subject.subjectUuid),
  );
}

function focusSearch() {
  searchInput.value?.$el?.querySelector('input')?.focus();
}
</script>
