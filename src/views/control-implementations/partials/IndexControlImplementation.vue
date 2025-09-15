<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Badge from '@/volt/Badge.vue';
import Drawer from '@/volt/Drawer.vue';
import type {
  CreateStatementRequest,
  ImplementedRequirement,
  Statement,
} from '@/stores/system-security-plans.ts';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/oscal';
import { ref, watchEffect } from 'vue';
import { useToggle } from '@/composables/useToggle';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import VueMarkdown from 'vue-markdown-render';
import type { Control } from '@/oscal';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();
const selectedPart = ref<Part>();
const { value: drawerOpen, set: setDrawer } = useToggle();
const drawerLoading = useToggle();
const { system } = useSystemStore();

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

const { execute: executeCreateStatement } = useDataApi<Statement>(
  null,
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
}

async function onPartSelect(e: Event, part: Part) {
  e.preventDefault();
  selectedPart.value = part;
  setDrawer(true);
  drawerLoading.set(true);

  if (!selectedImplementation.value) {
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

  if (!statements.value[selectedPart.value.id]) {
    const response = await executeCreateStatement(
      `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/control-implementation/implemented-requirements/${selectedImplementation.value.uuid}/statements`,
      {
        data: {
          uuid: uuidv4(),
          statementId: selectedPart.value.id,
          byComponents: [],
          props: [],
          links: [],
        } as CreateStatementRequest,
      },
    );
    if (response.data.value) {
      statements.value[selectedPart.value.id] = response.data.value.data;
    } else {
      console.error(
        'Failed to create statement: response.data.value is null or undefined',
        response,
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
            <div
              v-if="getText(part)"
              class="prose prose-slate dark:prose-invert"
            >
              <VueMarkdown :source="getText(part) ?? ''" />
            </div>
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
    v-model:visible="drawerOpen"
    header="Implementation"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <ControlStatementImplementation
      v-if="selectedPart && statements[selectedPart.id]"
      @updated="updateStatement"
      :implementation="selectedImplementation"
      :statement="statements[selectedPart.id]"
    />
  </Drawer>
</template>

<style>
@reference "@/assets/main.css";

.part-display .hover {
  @apply bg-gray-100 dark:bg-slate-600 cursor-pointer;
}
</style>
