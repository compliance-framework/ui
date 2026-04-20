<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Drawer from '@/volt/Drawer.vue';
import type { ImplementedRequirement, Statement } from '@/oscal';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/oscal';
import { computed, ref, watchEffect, watch } from 'vue';
import { useToggle } from '@/composables/useToggle';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { Control } from '@/oscal';
import TooltipTitle from '@/components/TooltipTitle.vue';
import {
  type ImplementationStatusCue,
  uniformImplementationStatusCue,
} from './implementation-status';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();
const selectedPart = ref<Part>();
const { value: statementDrawerOpen, set: setStatementDrawer } = useToggle();
const drawerLoading = useToggle();
const { system } = useSystemStore();
const showCreateStatementModal = ref(false);

const selectedImplementation = ref<ImplementedRequirement | undefined>();
const statements = ref<{ [key: string]: Statement }>({});

const neutralCountClass =
  'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
const neutralPanelClass =
  'border-transparent bg-transparent dark:border-transparent dark:bg-transparent';

const statementStatusCuesByPartId = computed(() => {
  const cues = new Map<string, ImplementationStatusCue>();
  for (const [statementId, statement] of Object.entries(statements.value)) {
    const cue = uniformImplementationStatusCue(statement.byComponents);
    if (cue) {
      cues.set(statementId, cue);
    }
  }
  return cues;
});

const selectedStatementStatusCue = computed(() => {
  if (!selectedPart.value) {
    return null;
  }

  return statementStatusCuesByPartId.value.get(selectedPart.value.id) ?? null;
});

watchEffect(() => {
  statements.value = {};
  for (const statement of implementation?.statements || []) {
    statements.value[statement.statementId] = statement;
  }
});

watch(
  () => implementation,
  (newImplementation) => {
    if (newImplementation) {
      selectedImplementation.value = newImplementation;
    } else {
      selectedImplementation.value = undefined;
    }
  },
  { immediate: true },
);

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
  drawerLoading.set(true);

  if (!selectedImplementation.value) {
    try {
      const response = await executeCreate({
        data: {
          uuid: uuidv4(),
          controlId: control.id,
        } as ImplementedRequirement,
      });
      if (response.data.value && response.data.value.data) {
        selectedImplementation.value = response.data.value.data;
      } else {
        throw new Error(
          'Failed to create implemented requirement: response data is missing.',
        );
      }
    } catch (error) {
      console.error('Error creating implemented requirement:', error);
      setStatementDrawer(false);
      drawerLoading.set(false);
      return;
    }
  }

  setStatementDrawer(true);
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
          <template
            v-for="statusCue in [statementStatusCuesByPartId.get(part.id)]"
            :key="`${part.id}-${statusCue?.label ?? 'none'}`"
          >
            <div
              class="rounded-md border p-2"
              :class="statusCue?.panelClass ?? neutralPanelClass"
            >
              <p
                v-if="getText(part)"
                class="prose prose-slate dark:prose-invert"
              >
                {{ getText(part) ?? '' }}
              </p>
              <div
                v-if="statements[part.id]?.byComponents"
                class="mt-2 flex flex-wrap items-center gap-2"
              >
                <span
                  class="rounded px-2 py-0.5 text-xs font-bold"
                  :class="statusCue?.countClass ?? neutralCountClass"
                >
                  {{ statements[part.id].byComponents?.length }}
                </span>
                <span
                  v-if="statusCue"
                  class="rounded px-2 py-0.5 text-xs font-medium"
                  :class="statusCue.countClass"
                >
                  {{ statusCue.label }}
                </span>
              </div>
            </div>
          </template>
        </template>
      </PartDisplay>
    </div>
  </div>

  <Drawer
    v-model:visible="statementDrawerOpen"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <template #header>
      <div class="flex flex-wrap items-center gap-2">
        <TooltipTitle
          text="Implementation Statement"
          tooltip-key="system.implementation.statement.drawer"
          position="bottom"
        />
        <span
          v-if="selectedStatementStatusCue"
          class="rounded px-2 py-0.5 text-xs font-medium"
          :class="selectedStatementStatusCue.countClass"
        >
          {{ selectedStatementStatusCue.label }}
        </span>
      </div>
    </template>
    <ControlStatementImplementation
      v-if="selectedPart && selectedImplementation"
      @updated="updateStatement"
      :implementation="selectedImplementation"
      :ssp-id="system.securityPlan?.uuid"
      :statement="statements[selectedPart.id]"
      :partid="selectedPart.id"
    />
    <div v-else-if="selectedPart && !selectedImplementation" class="p-4">
      <p class="text-gray-600">Loading implementation...</p>
    </div>
    <div v-else class="p-4">
      <p class="text-gray-600">No part selected</p>
    </div>
  </Drawer>
</template>

<style>
.part-display .hover {
  background-color: rgb(243 244 246);
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .part-display .hover {
    background-color: rgb(71 85 105);
  }
}
</style>
