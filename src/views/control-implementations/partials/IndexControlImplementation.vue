<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import Drawer from '@/volt/Drawer.vue';
import Message from '@/volt/Message.vue';
import type { ImplementedRequirement, Statement } from '@/oscal';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/oscal';
import { computed, ref, watchEffect, watch } from 'vue';
import { useToggle } from '@/composables/useToggle';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import InheritedResponsibilityRows from './InheritedResponsibilityRows.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { Control } from '@/oscal';
import TooltipTitle from '@/components/TooltipTitle.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import ExportStatementDialog from '@/components/system-security-plans/ExportStatementDialog.vue';
import type {
  SSPLeverageLink,
  SubscribeResponseMeta,
} from '@/types/ssp-leverage';
import {
  type ImplementationStatusCue,
  statementInheritedCount,
  uniformImplementationStatusCue,
} from './implementation-status';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();

const emit = defineEmits<{
  exported: [];
  imported: [
    payload: { links: SSPLeverageLink[]; meta?: SubscribeResponseMeta },
  ];
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

// Purple to match the Inherited convention in SharedResponsibilityBlocks.
const inheritedChipClass =
  'rounded px-2 py-0.5 text-xs font-medium bg-purple-600 text-white dark:bg-purple-400 dark:text-purple-950';

const selectedStatementInherited = computed(
  () =>
    !!selectedPart.value &&
    statementInheritedCount(
      statements.value[selectedPart.value.id]?.byComponents,
    ) > 0,
);

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

// The Export button appears on statements whose implementation is uniformly implemented or
// alternative — the states where there is a working implementation worth sharing. An
// INHERITED statement never gets one: re-exporting a capability the SSP merely consumes
// would rebroadcast the upstream provider's implementation as this system's own.
function isExportableStatement(
  cue: ImplementationStatusCue | undefined,
  statement: Statement | undefined,
): boolean {
  if (cue?.state !== 'implemented' && cue?.state !== 'alternative') {
    return false;
  }
  return statementInheritedCount(statement?.byComponents) === 0;
}

const showExportDialog = ref(false);
const exportTarget = ref<{
  statementId: string;
  statementText: string;
} | null>(null);

function openExportDialog(part: Part) {
  exportTarget.value = {
    statementId: part.id,
    statementText: getText(part) ?? '',
  };
  showExportDialog.value = true;
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
      class="rounded-lg border border-ccf-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
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
                <span
                  v-if="
                    statementInheritedCount(statements[part.id]?.byComponents) >
                    0
                  "
                  :class="inheritedChipClass"
                >
                  Inherited
                </span>
                <PermissionGate
                  :resource="RESOURCES.SSP"
                  :action="ACTIONS.UPDATE"
                >
                  <PermissionGate
                    :resource="RESOURCES.SSP"
                    :action="ACTIONS.EXPORT"
                  >
                    <SecondaryButton
                      v-if="
                        isExportableStatement(statusCue, statements[part.id])
                      "
                      type="button"
                      size="small"
                      class="ml-auto"
                      title="Share this implementation with other systems"
                      @click.stop="openExportDialog(part)"
                    >
                      Export
                    </SecondaryButton>
                  </PermissionGate>
                </PermissionGate>
              </div>
              <InheritedResponsibilityRows
                :control-id="control.id"
                :statement-id="part.id"
                :statement="statements[part.id]"
                @select="onPartSelect($event, part)"
              />
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
        <span v-if="selectedStatementInherited" :class="inheritedChipClass">
          Inherited
        </span>
      </div>
    </template>
    <ControlStatementImplementation
      v-if="selectedPart && selectedImplementation"
      @updated="updateStatement"
      @imported="emit('imported', $event)"
      :implementation="selectedImplementation"
      :ssp-id="system.securityPlan?.uuid"
      :statement="statements[selectedPart.id]"
      :partid="selectedPart.id"
    />
    <div v-else-if="selectedPart && !selectedImplementation" class="p-4">
      <Message severity="info" variant="simple">
        <span class="flex items-center gap-2">
          <i class="pi pi-spin pi-spinner"></i>
          Loading implementation...
        </span>
      </Message>
    </div>
    <div v-else class="p-4">
      <Message severity="secondary">No part selected.</Message>
    </div>
  </Drawer>

  <ExportStatementDialog
    v-if="exportTarget && system.securityPlan"
    v-model:visible="showExportDialog"
    :ssp-id="system.securityPlan.uuid"
    :ssp-title="system.securityPlan.metadata?.title ?? 'This system'"
    :control-id="control.id"
    :statement-id="exportTarget.statementId"
    :statement-text="exportTarget.statementText"
    @saved="emit('exported')"
  />
</template>

<style>
.part-display .hover {
  background-color: rgb(243 244 246);
  cursor: pointer;
}

.dark .part-display .hover {
  background-color: rgb(44 57 74);
}
</style>
