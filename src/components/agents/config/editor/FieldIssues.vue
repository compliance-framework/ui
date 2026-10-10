<template>
  <ul
    v-if="issues.length"
    class="mt-1 space-y-0.5 text-xs"
    :data-test="`issues-${ptr}`"
  >
    <li
      v-for="(i, idx) in issues"
      :key="idx"
      :class="
        i.blocking
          ? 'text-red-600 dark:text-red-400'
          : 'text-amber-700 dark:text-amber-300'
      "
    >
      <i
        :class="
          i.blocking ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'
        "
        class="mr-1 text-[0.7rem]"
      />{{ i.message }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditor } from './useEditor';

const props = defineProps<{
  ptr: string;
  extra?: { message: string; blocking: boolean }[];
}>();
const { issuesAt } = useEditor();
const issues = computed(() => [...issuesAt(props.ptr), ...(props.extra ?? [])]);
</script>
