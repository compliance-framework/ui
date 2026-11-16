<script setup lang="ts">
// The draft's problems at one pointer: blocking ones (errors) and warnings.
import { computed } from 'vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useEditor } from './useEditor';

const props = defineProps<{
  ptr: string;
  extra?: { message: string; blocking: boolean }[];
}>();
const { issuesAt } = useEditor();
const issues = computed(() => [...issuesAt(props.ptr), ...(props.extra ?? [])]);
</script>

<template>
  <Stack v-if="issues.length" gap="1" :data-test="`issues-${ptr}`">
    <Text
      v-for="(i, idx) in issues"
      :key="idx"
      variant="caption"
      :data-blocking="i.blocking ? 'true' : undefined"
      >{{ i.blocking ? 'Error' : 'Warning' }}: {{ i.message }}</Text
    >
  </Stack>
</template>
