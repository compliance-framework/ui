<script setup lang="ts">
/**
 * A control's statements in the Implementation tree: each statement part with its components
 * count, uniform implementation status, Inherited, Export (share it) and Open statement, which
 * opens the statement editor in a drawer (creating the control's implementation first if there
 * isn't one). The script is the classic view's.
 */
import Button from '@/ds/components/Button/Button.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { v4 as uuidv4 } from 'uuid';
import type { ImplementedRequirement, Statement } from '@/oscal';
import type { Part } from '@/oscal';
import { computed, ref, watchEffect, watch } from 'vue';
import { useToggle } from '@/composables/useToggle';
import ControlStatementImplementation from '@/views/control-implementations/partials/ControlStatementImplementation.vue';
import InheritedResponsibilityRows from './InheritedResponsibilityRows.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { Control } from '@/oscal';
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

const controlDescription = computed(() => {
  const statementPart = control.parts?.find(
    (part) => part.name === 'statement',
  );
  return statementPart?.prose ?? '';
});

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
// Statement parts, depth first, as one list: their labels (a., 1.) carry the nesting.
const statementParts = computed(() => {
  const out: Part[] = [];
  const walk = (parts: Part[] | undefined) => {
    for (const part of parts ?? []) {
      out.push(part);
      walk(part.parts);
    }
  };
  walk(control.parts?.filter((part) => part.name == 'statement'));
  return out;
});
const { can } = usePermissions();
const mayExport = computed(
  () =>
    can(RESOURCES.SSP, ACTIONS.UPDATE) && can(RESOURCES.SSP, ACTIONS.EXPORT),
);
</script>

<style>
.part-display .hover {
  background-color: rgb(243 244 246);
  cursor: pointer;
}

.dark .part-display .hover {
  background-color: rgb(44 57 74);
}

/* Separates sibling statement parts (top-level items and nested a./b./c.
   sub-items alike) so it's clear where one part's badges/rows end and the
   next part begins. */
.part-display [data-type='part'] + [data-type='part'] {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(226 232 240);
}

.dark .part-display [data-type='part'] + [data-type='part'] {
  border-top-color: rgb(51 65 85);
}
</style>

<template>
  <Stack gap="3" as="ul">
    <li v-for="part in statementParts" :key="part.id">
      <Stack gap="2">
        <Text v-if="getText(part)">{{ getText(part) }}</Text>
        <Cluster gap="2">
          <Tag
            v-if="statements[part.id]?.byComponents"
            :label="`${statements[part.id]!.byComponents!.length} component${statements[part.id]!.byComponents!.length === 1 ? '' : 's'}`"
          />
          <Tag
            v-if="statementStatusCuesByPartId.get(part.id)"
            :label="statementStatusCuesByPartId.get(part.id)!.label"
          />
          <Tag
            v-if="
              statementInheritedCount(statements[part.id]?.byComponents) > 0
            "
            label="Inherited"
          />
          <Button size="sm" icon="next" @click="onPartSelect($event, part)"
            >Open statement</Button
          >
          <Button
            v-if="
              mayExport &&
              isExportableStatement(
                statementStatusCuesByPartId.get(part.id),
                statements[part.id],
              )
            "
            size="sm"
            icon="share"
            @click="openExportDialog(part)"
            >Export</Button
          >
        </Cluster>
        <InheritedResponsibilityRows
          :control-id="control.id"
          :statement-id="part.id"
          :statement="statements[part.id]"
          @select="onPartSelect($event, part)"
        />
      </Stack>
    </li>
  </Stack>
  <Drawer
    v-model:open="statementDrawerOpen"
    :title="`${control.id} ${control.title ?? ''}`.trim()"
    :description="controlDescription || undefined"
  >
    <Stack gap="4">
      <Cluster gap="2">
        <Text as="span" variant="label">Implementation statement</Text>
        <Tag
          v-if="selectedStatementStatusCue"
          :label="selectedStatementStatusCue.label"
        />
        <Tag v-if="selectedStatementInherited" label="Inherited" />
      </Cluster>
      <ControlStatementImplementation
        v-if="selectedPart && selectedImplementation"
        :implementation="selectedImplementation"
        :statement="statements[selectedPart.id]"
        :ssp-id="system.securityPlan?.uuid"
        :partid="selectedPart.id"
        @updated="updateStatement"
        @imported="emit('imported', $event)"
      />
      <Text v-else-if="selectedPart" variant="caption"
        >Loading the implementation…</Text
      >
      <Text v-else variant="caption">No statement chosen.</Text>
    </Stack>
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
