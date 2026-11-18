<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { describeSubject, type SubjectSummary } from '@/types/subjects';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';

/**
 * Filter evidence by what it is about, like the classic page's subject filter: type to find a
 * subject and choose it, in one field (GET /api/subjects; inside a system, narrowed to its
 * components). The chosen
 * subject's UUID lives in the URL; its title is looked up so the chip can name it. Hidden when the
 * API has no subjects endpoint.
 */
const props = defineProps<{ systemId?: string }>();
const subject = defineModel<string>({ default: '' });
const emit = defineEmits<{ titled: [title: string] }>();

const { suggestions, unsupported, search, lookup } = useSubjectSearch();
const chosen = ref<SubjectSummary>();
const open = ref(Boolean(subject.value));

let timer: ReturnType<typeof setTimeout> | undefined;
function find(text: string): void {
  clearTimeout(timer);
  timer = setTimeout(() => void search(text, { ssp: props.systemId }), 250);
}
void search('', { ssp: props.systemId });

// Name the subject in the URL, whether it was chosen here or arrived in a link.
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
    emit('titled', chosen.value?.title ?? 'Unknown subject');
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
  <Disclosure v-if="!unsupported" v-model:open="open" label="Subject">
    <FormField label="Subject">
      <Combobox
        v-model="subject"
        :options="options"
        remote
        clearable
        placeholder="Type a name, e.g. payments-db"
        empty-text="No subjects match."
        @search="find"
      />
    </FormField>
  </Disclosure>
</template>
