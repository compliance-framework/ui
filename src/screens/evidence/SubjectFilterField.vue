<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { describeSubject, type SubjectSummary } from '@/types/subjects';
import ColumnFilter from '@/ds/components/DataTable/ColumnFilter.vue';

/**
 * The Subjects column's title, which filters the list by what evidence is about, like the classic
 * page's subject filter: type to find a subject and choose it (GET /api/subjects; inside a system,
 * narrowed to its components). It filters this view only; a saved filter holds the search alone.
 * The chosen subject's UUID lives in the URL; its title is looked up so the header can name it.
 * Without the API's subjects endpoint it is the plain title.
 */
const props = defineProps<{ label: string; systemId?: string }>();
const subject = defineModel<string>({ default: '' });

const { suggestions, unsupported, search, lookup } = useSubjectSearch();
const chosen = ref<SubjectSummary>();

let timer: ReturnType<typeof setTimeout> | undefined;
function find(text: string): void {
  clearTimeout(timer);
  timer = setTimeout(() => void search(text, { ssp: props.systemId }), 250);
}
void search('', { ssp: props.systemId });

// Name the subject in the URL, whether it was chosen here or arrived in a link, so it can head the
// column and stay among the options.
watch(
  subject,
  async (uuid) => {
    if (!uuid) {
      chosen.value = undefined;
      return;
    }
    if (chosen.value?.subjectUuid === uuid) return;
    const known = suggestions.value.find((s) => s.subjectUuid === uuid);
    chosen.value = known ?? (await lookup([uuid]))[0];
  },
  { immediate: true },
);

const options = computed(() => {
  const list = [...suggestions.value];
  if (
    chosen.value &&
    !list.some((s) => s.subjectUuid === chosen.value!.subjectUuid)
  )
    list.unshift(chosen.value);
  return list.map((s) => ({
    value: s.subjectUuid,
    label: `${s.title} (${describeSubject(s)})`,
  }));
});
</script>

<template>
  <template v-if="unsupported">{{ label }}</template>
  <ColumnFilter
    v-else
    v-model="subject"
    :label="label"
    name="subject"
    :options="options"
    :value-label="chosen?.title"
    remote
    @search="find"
  />
</template>
