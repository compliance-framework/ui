<template>
  <div v-if="hasAny">
    <!-- Export -->
    <div v-if="byComponent.export" class="mt-2 text-xs">
      <div v-if="byComponent.export.provided?.length" class="mb-1">
        <Badge severity="success">Provided</Badge>
        <div class="ml-2">
          <div
            v-for="provided in byComponent.export.provided"
            :key="provided.uuid"
            class="text-green-600 dark:text-green-400"
          >
            {{ provided.description }}
          </div>
        </div>
      </div>
      <div v-if="byComponent.export.responsibilities?.length" class="mb-1">
        <Badge severity="warn">Responsibilities</Badge>
        <div class="ml-2">
          <div
            v-for="responsibility in byComponent.export.responsibilities"
            :key="responsibility.uuid"
            class="text-orange-600 dark:text-orange-400"
          >
            {{ responsibility.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- Inherited. Satisfied entries are deliberately NOT shown here: they're the
         downstream's "how we handle this" notes, authored and displayed in the dedicated
         Inherited responsibilities section, so repeating them here just confused readers. -->
    <div v-if="byComponent.inherited?.length" class="mt-2 text-xs">
      <span
        class="inline-flex h-6 items-center rounded-md bg-purple-100 px-2 text-xs font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-200"
      >
        Inherited
      </span>
      <div class="ml-2">
        <div
          v-for="inherited in byComponent.inherited"
          :key="inherited.uuid"
          class="text-purple-600 dark:text-purple-400"
        >
          {{ inherited.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/volt/Badge.vue';
import type { ByComponent } from '@/oscal';

// The read-only Provided / Responsibilities / Inherited display for one by-component. Both
// StatementByComponent partials (the SSP editor's and the Controls view's) render this, so
// the blocks can't drift apart again. Satisfied entries are intentionally omitted — they're
// surfaced in the dedicated Inherited responsibilities section instead.
const props = defineProps<{
  byComponent: ByComponent;
}>();

const hasAny = computed(
  () =>
    !!(
      props.byComponent.export?.provided?.length ||
      props.byComponent.export?.responsibilities?.length ||
      props.byComponent.inherited?.length
    ),
);
</script>
