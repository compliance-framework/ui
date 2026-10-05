<template>
  <span class="inline-flex items-center gap-1">
    <i
      v-if="shieldInfo"
      role="img"
      tabindex="0"
      v-tooltip.top="shieldInfo.tooltip"
      class="pi pi-shield text-xs"
      :class="
        shieldInfo.level === 'forbidden'
          ? 'text-red-600 dark:text-red-400'
          : 'text-amber-600 dark:text-amber-400'
      "
      :aria-label="shieldInfo.tooltip"
      :data-test="`shield-${ptr}`"
    />
    <span
      v-if="differs"
      class="text-[0.7rem] text-gray-500 dark:text-slate-400"
      :data-test="`differs-${ptr}`"
      >differs across instances</span
    >
    <button
      v-if="showReset"
      v-tooltip.top="'Reset to file value'"
      type="button"
      class="text-xs text-sky-700 hover:underline disabled:opacity-40 dark:text-sky-300"
      :aria-label="`Reset ${ptr} to the file value`"
      :disabled="disabled"
      :data-test="`reset-${ptr}`"
      @click="$emit('reset')"
    >
      ↺
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditor } from './useEditor';

const props = defineProps<{
  ptr: string;
  disabled?: boolean;
  hideReset?: boolean;
}>();
defineEmits<{ reset: [] }>();

const { has, shield, differsAcrossInstances } = useEditor();
const shieldInfo = computed(() => shield(props.ptr));
const differs = computed(() => differsAcrossInstances(props.ptr));
const showReset = computed(() => !props.hideReset && has(props.ptr));
</script>
