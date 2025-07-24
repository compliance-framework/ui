<script setup lang="ts">
import Badge from '@/volt/Badge.vue';
import type { Control } from '@/oscal';
import type {
  ImplementedRequirement,
  Statement,
} from '@/stores/system-security-plans.ts';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/stores/types.ts';
import { ref, watchEffect } from 'vue';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();

const statements = ref<{ [key: string]: Statement }>({});
watchEffect(() => {
  statements.value = {};
  for (const statement of implementation?.statements || []) {
    statements.value[statement.statementId] = statement;
  }
});


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

function onPartSelect(e: Event, asd: Part) {
  e.preventDefault();
  console.log('selected ' + asd.id);
}

function findStatement(part: Part): Statement | null | undefined {
  if (implementation) {
    if (implementation.statements) {
      for (const statement of implementation.statements ?? []) {
        if (statement.statementId == part.id) {
          return statement;
        }
      }
    }
  }
  return;
}
</script>

<template>
  <div class="part-display">
    <div
      class="px-4 py-2 border-l-8 dark:border-l-slate-700 dark:bg-slate-800 rounded-xl"
    >
      <PartDisplay
        v-for="part in control.parts?.filter(
          (part) => part.name == 'statement',
        ) || []"
        :key="part.id"
        :part="part"
        @mouseover="onMouseOver"
        @mouseout="onMouseLeave"
        @selected="onPartSelect"
      >
        <template #default="{ part }">
          <div
            v-if="getText(part)"
            class="p-0.5"
            @mouseover="onMouseOver"
            @mouseout="onMouseLeave"
          >
            <span>{{ getText(part) }}</span>
            <template v-if="statements[part.id]">
              <Badge
                class="ml-2"
                v-if="statements[part.id].byComponents"
                :value="statements[part.id].byComponents?.length"
                severity="info"
              />
            </template>
          </div>
        </template>
      </PartDisplay>
    </div>
    <!--    <PartDisplayEditor v-for="part in control.parts?.filter(part => part.name == 'statement') || []" :key="part.id" :part="part"></PartDisplayEditor>-->
  </div>
  {{ implementation }}
</template>

<style>
@reference "@/assets/main.css";

.part-display .hover {
  @apply dark:bg-slate-600 cursor-pointer;
}
</style>
