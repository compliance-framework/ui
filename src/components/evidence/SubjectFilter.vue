<template>
  <div v-if="!unsupported" class="flex items-center gap-1">
    <AutoComplete
      :modelValue="modelValue"
      :suggestions="suggestions"
      optionLabel="title"
      placeholder="Subject: any"
      dropdown
      forceSelection
      class="w-64"
      aria-label="Filter by subject"
      @complete="search($event.query)"
      @update:modelValue="onChange"
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
    <TertiaryButton
      v-if="modelValue"
      type="button"
      class="!px-1"
      aria-label="Clear subject filter"
      @click="emit('update:modelValue', null)"
    >
      <BIconX />
    </TertiaryButton>
  </div>
</template>

<script setup lang="ts">
import { BIconX } from 'bootstrap-icons-vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { describeSubject, type SubjectSummary } from '@/types/subjects';

defineProps<{
  modelValue: SubjectSummary | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [subject: SubjectSummary | null];
}>();

const { suggestions, unsupported, search } = useSubjectSearch();

// While typing, the AutoComplete reports the text; only a picked subject, or an emptied
// input, changes the filter.
function onChange(value: SubjectSummary | string | null | undefined) {
  if (value && typeof value === 'object') {
    emit('update:modelValue', value);
  } else if (!value) {
    emit('update:modelValue', null);
  }
}
</script>
