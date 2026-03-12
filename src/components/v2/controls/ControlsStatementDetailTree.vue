<script setup lang="ts">
import { computed } from 'vue';
import type { Part, Statement } from '@/oscal';

defineOptions({
  name: 'ControlsStatementDetailTree',
});

const props = withDefaults(
  defineProps<{
    part: Part;
    depth?: number;
    statementMap?: Record<string, Statement | undefined>;
  }>(),
  {
    depth: 0,
    statementMap: () => ({}),
  },
);

const emit = defineEmits<{
  select: [part: Part];
}>();

const displayText = computed(() => {
  const labelProp = props.part.props?.find((prop) => prop.name === 'label');
  const label = String(labelProp?.value || '').trim();
  const prose = String(props.part.prose || '').trim();
  const title = String(props.part.title || '').trim();

  if (label && prose) {
    return `${label} ${prose}`;
  }

  return prose || label || title || 'No statement detail available.';
});

const componentCount = computed(
  () =>
    props.statementMap[String(props.part.id || '')]?.byComponents?.length || 0,
);

function handleSelect(part: Part): void {
  emit('select', part);
}
</script>

<template>
  <div class="space-y-1.5">
    <div
      class="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-3 border-l border-[var(--ui-v2-border)] py-1.5 pl-3"
      :style="{ marginLeft: `${depth * 16}px` }"
    >
      <button
        type="button"
        class="min-w-0 space-y-1 text-left transition-colors hover:text-[var(--ui-v2-primary)]"
        @click="handleSelect(part)"
      >
        <p
          v-if="part.id"
          class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ part.id }}
        </p>
        <p
          class="font-[var(--ui-v2-font-secondary)] text-[12px] font-medium leading-6 text-[var(--ui-v2-foreground)]"
        >
          {{ displayText }}
        </p>
      </button>

      <div class="flex justify-end pt-0.5">
        <span
          v-if="componentCount > 0"
          class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] font-[var(--ui-v2-font-secondary)] text-[10px] font-extrabold text-[var(--ui-v2-primary)]"
        >
          {{ componentCount }}
        </span>
      </div>
    </div>

    <div v-if="part.parts?.length" class="space-y-1.5">
      <ControlsStatementDetailTree
        v-for="child in part.parts"
        :key="child.id || child.name || child.title || `${depth}`"
        :part="child"
        :depth="depth + 1"
        :statement-map="statementMap"
        @select="handleSelect"
      />
    </div>
  </div>
</template>
