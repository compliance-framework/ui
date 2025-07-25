<script setup lang="ts">
import Badge from '@/volt/Badge.vue';
import Drawer from '@/volt/Drawer.vue';
import type { Control } from '@/oscal';
import type {
  ImplementedRequirement,
  Statement,
} from '@/stores/system-security-plans.ts';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/stores/types.ts';
import { ref, watchEffect } from 'vue';
import { useToggle } from '@/composables/useToggle'
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue'

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();
const selectedPart = ref<Part>();
const { value: drawerOpen, set: setDrawer } = useToggle();

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
    if (target.closest("*[data-type='part']") instanceof HTMLElement) {
      target.closest("*[data-type='part']")?.classList.add('hover');
    }
  }
}

function onMouseLeave(e: MouseEvent) {
  const { target } = e;
  if (target instanceof HTMLElement) {
    if (target.closest("*[data-type='part']") instanceof HTMLElement) {
      target.closest("*[data-type='part']")?.classList.remove('hover');
    }
  }
}

function onPartSelect(e: Event, part: Part) {
  e.preventDefault();
  selectedPart.value = part
  setDrawer(true)
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
            class="p-0.5"
          >
            <span v-if="getText(part)">{{ getText(part) }}</span>
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

  <Drawer v-model:visible="drawerOpen" header="Implementation" position="right" class="w-full! md:w-1/2! lg:w-3/5!">
    <ControlStatementImplementation v-if="selectedPart && statements[selectedPart.id]" :statement="statements[selectedPart.id]" />
  </Drawer>
</template>

<style>
@reference "@/assets/main.css";

.part-display .hover {
  @apply dark:bg-slate-600 cursor-pointer;
}
</style>
