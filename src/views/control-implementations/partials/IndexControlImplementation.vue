<script setup lang="ts">
import type { Control } from '@/oscal';
import type { ImplementedRequirement } from '@/stores/system-security-plans.ts';
import PartDisplayEditor from '@/components/PartDisplayEditor.vue';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/stores/types.ts';
import { useToggle } from '@/composables/useToggle'

const props = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();

function getLabel(part: Part): string {
  if (part.props) {
    for (const prop of part.props) {
      if (prop.name === 'label') {
        return prop.value ?? '';
      }
    }
  }
  return '';
}

function getText(_part: Part): string | null {
  const label = getLabel(_part);

  if (!label && !_part.prose) {
    return null;
  }

  return `${label ? label + ' ' : ''}${_part.prose ?? ''}`;
}

function onMouseOver(e: MouseEvent) {
  const { target } = e;
  if (target instanceof HTMLElement) {
    if (target.parentNode instanceof HTMLElement) {
      target.parentNode.classList.add('hover');
    }
  }
}

function onMouseLeave(e: MouseEvent) {
  const { target } = e;
  if (target instanceof HTMLElement) {
    if (target.parentNode instanceof HTMLElement) {
      target.parentNode.classList.remove('hover');
    }
  }
}
</script>

<template>
  <div
    class="border-l-8 dark:border-l-slate-700 dark:bg-slate-800 px-4 py-2 rounded-xl part-display"
  >
    <PartDisplay
      v-for="part in control.parts?.filter(
        (part) => part.name == 'statement',
      ) || []"
      :key="part.id"
      :part="part"
      @mouseover="onMouseOver"
      @mouseout="onMouseLeave"
    >
      <template #default="{ part }">
        <p v-if="getText(part)">
          {{ getText(part) }}
        </p>
      </template>
    </PartDisplay>
    <!--    <PartDisplayEditor v-for="part in control.parts?.filter(part => part.name == 'statement') || []" :key="part.id" :part="part"></PartDisplayEditor>-->
  </div>
  {{ implementation }}
</template>

<style>
@reference "@/assets/main.css";

.part-display .hover  {
  @apply bg-blue-500 cursor-pointer outline-1;
}
</style>
