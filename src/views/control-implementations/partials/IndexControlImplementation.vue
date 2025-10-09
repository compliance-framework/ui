<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Badge from '@/volt/Badge.vue';
import Drawer from '@/volt/Drawer.vue';
import type { ImplementedRequirement, Statement } from '@/oscal';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/oscal';
import { ref, watchEffect } from 'vue';
import { useToggle } from '@/composables/useToggle';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { Control } from '@/oscal';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();
const selectedPart = ref<Part>();
const { value: statementDrawerOpen, set: setStatementDrawer } = useToggle();
const drawerLoading = useToggle();
const { system } = useSystemStore();
const showCreateStatementModal = ref(false);

const selectedImplementation = ref<ImplementedRequirement>(
  implementation as ImplementedRequirement,
);
const statements = ref<{ [key: string]: Statement }>({});
watchEffect(() => {
  statements.value = {};
  for (const statement of implementation?.statements || []) {
    statements.value[statement.statementId] = statement;
  }
});

const { execute: executeCreate } = useDataApi<ImplementedRequirement>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/control-implementation/implemented-requirements`,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

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

function updateStatement(statement: Statement) {
  statements.value[statement.statementId] = statement;
  showCreateStatementModal.value = false;
}

async function onPartSelect(e: Event, part: Part) {
  e.preventDefault();
  selectedPart.value = part;
  setStatementDrawer(true);
  drawerLoading.set(true);

  console.log('Selected part', part);

  if (!selectedImplementation.value) {
    console.debug('Creating implemented requirement for control ', control.id);
    const response = await executeCreate({
      data: {
        uuid: uuidv4(),
        controlId: control.id,
      } as ImplementedRequirement,
    });
    if (response.data.value && response.data.value.data) {
      selectedImplementation.value = response.data.value.data;
    } else {
      // Handle error: response.data.value is null or missing data
      throw new Error(
        'Failed to create implemented requirement: response data is missing.',
      );
    }
  }
  drawerLoading.set(false);
}
</script>

<template>
  <div class="part-display">
    <div
      class="px-4 py-2 border-l-8 border-l-ccf-300 dark:border-l-slate-700 bg-ccf-200 dark:bg-slate-800 rounded-xl"
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
          <div class="p-0.5">
            <p v-if="getText(part)" class="prose prose-slate dark:prose-invert">
              {{ getText(part) ?? '' }}
            </p>
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
  </div>

  <Drawer
    v-model:visible="statementDrawerOpen"
    header="Implementation Statement"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <ControlStatementImplementation
      v-if="selectedPart"
      @updated="updateStatement"
      :implementation="selectedImplementation"
      :ssp-id="system.securityPlan?.uuid"
      :statement="statements[selectedPart.id]"
      :partid="selectedPart.id"
    />
  </Drawer>
</template>

<style>
@reference "@/assets/main.css";

.part-display .hover {
  @apply bg-gray-100 dark:bg-slate-600 cursor-pointer;
}
</style>
