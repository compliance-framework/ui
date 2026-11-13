<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { describeSubject } from '@/types/subjects';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';

/**
 * What the evidence is about: find subjects (GET /api/subjects), add them, remove them. Replaces
 * the classic SubjectPicker. Hidden when the API has no subjects endpoint.
 */
const props = defineProps<{ required?: boolean; error?: string }>();
const subjects = defineModel<{ subjectUuid: string; title: string }[]>({
  required: true,
});

const { suggestions, unsupported, search } = useSubjectSearch();
const query = ref('');
const pick = ref('');

let timer: ReturnType<typeof setTimeout> | undefined;
watch(query, (text) => {
  clearTimeout(timer);
  timer = setTimeout(() => void search(text), 250);
});
void search('');

const options = computed(() => [
  { value: '', label: 'Choose a subject' },
  ...suggestions.value
    .filter(
      (s) =>
        !subjects.value.some((chosen) => chosen.subjectUuid === s.subjectUuid),
    )
    .map((s) => ({
      value: s.subjectUuid,
      label: `${s.title} (${describeSubject(s)})`,
    })),
]);

function add(): void {
  const subject = suggestions.value.find((s) => s.subjectUuid === pick.value);
  if (!subject) return;
  subjects.value = [
    ...subjects.value,
    { subjectUuid: subject.subjectUuid, title: subject.title },
  ];
  pick.value = '';
}

function remove(uuid: string): void {
  subjects.value = subjects.value.filter((s) => s.subjectUuid !== uuid);
}
</script>

<template>
  <Stack v-if="!unsupported" gap="2">
    <Text variant="label"
      >Subjects{{ props.required ? ' (required)' : '' }}</Text
    >
    <Text variant="caption">What this evidence is about.</Text>
    <Stack v-if="subjects.length" gap="1" as="ul">
      <Cluster
        v-for="subject in subjects"
        :key="subject.subjectUuid"
        as="li"
        gap="2"
      >
        <Text as="span">{{ subject.title }}</Text>
        <Button size="sm" icon="close" @click="remove(subject.subjectUuid)"
          >Remove {{ subject.title }}</Button
        >
      </Cluster>
    </Stack>
    <Text v-else variant="secondary">No subjects chosen.</Text>
    <Cluster gap="2" align="end">
      <FormField label="Find a subject">
        <TextInput
          v-model="query"
          type="search"
          placeholder="Name, e.g. payments-db"
        />
      </FormField>
      <FormField label="Subject to add">
        <Select v-model="pick" :options="options" />
      </FormField>
      <Button
        icon="add"
        :disabled-reason="pick ? undefined : 'Choose a subject first.'"
        @click="add"
        >Add subject</Button
      >
    </Cluster>
    <InlineMessage v-if="error" tone="error" :title="error" />
  </Stack>
</template>
