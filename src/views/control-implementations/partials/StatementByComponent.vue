<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import BurgerMenu from '@/components/BurgerMenu.vue';
import Textarea from '@/volt/Textarea.vue';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SharedResponsibilityBlocks from '@/components/system-security-plans/SharedResponsibilityBlocks.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import VueMarkdown from 'vue-markdown-render';
import type { ByComponent, Risk, SystemComponent } from '@/oscal';
import {
  getRiskComponentIds,
  getRiskControlIds,
  getRiskImpact,
  isClosedStatus,
} from '@/utils/risk-register';
import RiskIndicatorBadge from './RiskIndicatorBadge.vue';
import {
  implementationStatusLabel,
  implementationStatusOptionsWithNone,
  normalizeByComponentImplementationStatus,
} from './implementation-status';

// No statementId / editSharedResponsibility here, unlike the SSP-editor copy of this
// component: on the Controls surface, SharedResponsibilityPanel owns the export-authoring
// affordance. Both callers (IndexView, ControlStatementByComponents) render this without a
// statement id and neither listens for the event, so the button this pair fed was
// unreachable — it read as if it worked.
const { byComponent, controlId, sspRisks, riskFetchLimit } = defineProps<{
  byComponent: ByComponent;
  controlId?: string;
  sspRisks?: Risk[];
  riskFetchLimit?: number;
}>();
const emit = defineEmits<{
  save: [byComponent: ByComponent];
  delete: [byComponent: ByComponent];
}>();

const { system } = useSystemStore();
const router = useRouter();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

function cloneByComponent(value: ByComponent): ByComponent {
  return JSON.parse(JSON.stringify(value)) as ByComponent;
}

const localComponent = ref<ByComponent>(cloneByComponent(byComponent));
watch(
  () => byComponent,
  (updatedByComponent) => {
    localComponent.value = cloneByComponent(updatedByComponent);
  },
);

const { value: editing, set: setEditing } = useToggle();

const componentUrl = computed(() => {
  if (!system.securityPlan?.uuid || !byComponent.componentUuid) return null;
  return `/api/oscal/system-security-plans/${system.securityPlan.uuid}/system-implementation/components/${byComponent.componentUuid}`;
});

const { data: component, execute: fetchComponent } =
  useDataApi<SystemComponent>(
    null,
    {
      method: 'GET',
    },
    { immediate: false },
  );

watch(
  componentUrl,
  async (url) => {
    if (!url) return;
    await fetchComponent(url);
  },
  {
    immediate: true,
  },
);

const statusState = computed({
  get: () => localComponent.value.implementationStatus?.state ?? '',
  set: (state: string) => {
    if (!state) {
      localComponent.value.implementationStatus = undefined;
      return;
    }
    localComponent.value.implementationStatus = {
      ...(localComponent.value.implementationStatus ?? {}),
      state,
    };
  },
});

const statusInputId = computed(() => `by-component-status-${byComponent.uuid}`);
const statusRemarksInputId = computed(
  () => `by-component-status-remarks-${byComponent.uuid}`,
);

const statusRemarks = computed({
  get: () => localComponent.value.implementationStatus?.remarks ?? '',
  set: (remarks: string) => {
    if (!statusState.value) {
      return;
    }
    if (!localComponent.value.implementationStatus) {
      localComponent.value.implementationStatus = {
        state: statusState.value,
      };
    }
    localComponent.value.implementationStatus.remarks = remarks;
  },
});

const persistedImplementationStatusDisplayLabel = computed(() => {
  const state = byComponent.implementationStatus?.state;
  return implementationStatusLabel(state);
});

function normalizeId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

const relatedRisks = computed(() => {
  if (!sspRisks?.length || !byComponent.componentUuid || !controlId) {
    return [];
  }

  const normalizedComponentId = normalizeId(byComponent.componentUuid);
  const normalizedControlId = normalizeId(controlId);

  return sspRisks.filter((risk) => {
    if (isClosedStatus(risk.status)) return false;
    const componentIds = getRiskComponentIds(risk).map((id) => normalizeId(id));
    if (!componentIds.includes(normalizedComponentId)) {
      return false;
    }
    const controlIds = getRiskControlIds(risk).map((id) => normalizeId(id));
    return controlIds.includes(normalizedControlId);
  });
});

const riskCount = computed(() => relatedRisks.value.length);
const isRiskCountCapped = computed(() => {
  if (!riskFetchLimit || riskFetchLimit <= 0) {
    return false;
  }
  return riskCount.value >= riskFetchLimit;
});

const highestSeverity = computed(() => {
  if (!relatedRisks.value.length) return undefined;

  const hasCritical = relatedRisks.value.some(
    (risk) => getRiskImpact(risk) === 'critical',
  );
  if (hasCritical) return 'high';

  const hasHigh = relatedRisks.value.some(
    (risk) => getRiskImpact(risk) === 'high',
  );
  if (hasHigh) return 'high';

  const hasMedium = relatedRisks.value.some((risk) => {
    const impact = getRiskImpact(risk);
    return impact === 'medium' || impact === 'moderate';
  });
  if (hasMedium) return 'medium';

  const hasLow = relatedRisks.value.some(
    (risk) => getRiskImpact(risk) === 'low' || getRiskImpact(risk) === '',
  );
  if (hasLow) return 'low';

  return 'low';
});

function save() {
  emit(
    'save',
    normalizeByComponentImplementationStatus(
      cloneByComponent(localComponent.value),
    ),
  );
  localComponent.value = cloneByComponent(byComponent);
  setEditing(false);
}

async function deleteStatement() {
  emit('delete', byComponent);
}

function cancel() {
  localComponent.value = cloneByComponent(byComponent);
  setEditing(false);
}

function edit() {
  localComponent.value = cloneByComponent(byComponent);
  setEditing(true);
}

function openRisksForControl() {
  if (!controlId) {
    return;
  }
  void router.push({
    name: 'risks:index',
    query: {
      controlId,
    },
  });
}
</script>

<template>
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-2">
      <h4 class="font-medium">{{ component?.title }}</h4>
      <RiskIndicatorBadge
        v-if="system.securityPlan?.uuid && byComponent.componentUuid"
        :risk-count="riskCount"
        :is-capped="isRiskCountCapped"
        :highest-severity="highestSeverity"
        clickable
        @click="openRisksForControl"
      />
    </div>
    <div class="flex items-center gap-2">
      <BurgerMenu
        :items="[
          {
            label: 'Edit',
            command() {
              edit();
            },
          },
          {
            label: 'Delete',
            command() {
              confirmDeleteDialog(() => deleteStatement(), {
                itemType: 'implementation statement',
              });
            },
          },
        ]"
      />
    </div>
  </div>
  <div class="text-gray-600 dark:text-slate-400">
    <template v-if="!editing">
      <p class="prose prose-slate dark:prose-invert max-w-full">
        <VueMarkdown :source="byComponent.description" />
      </p>
    </template>
    <template v-else>
      <Textarea
        v-model="localComponent.description"
        autoResize
        class="resize-none w-full"
        placeholder="Description"
        @keyup.ctrl.enter="save"
      />
      <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label :for="statusInputId">Implementation Status</Label>
          <Select
            :id="statusInputId"
            v-model="statusState"
            :options="implementationStatusOptionsWithNone"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div>
          <Label :for="statusRemarksInputId">Status Remarks</Label>
          <Textarea
            :id="statusRemarksInputId"
            v-model="statusRemarks"
            autoResize
            class="resize-none w-full"
            :disabled="!statusState"
            placeholder="Implementation status remarks"
          />
        </div>
      </div>
      <div class="flex gap-x-2">
        <SecondaryButton type="button" @click="cancel">Cancel</SecondaryButton>
        <PrimaryButton
          type="button"
          @click="save"
          v-tooltip="'ctrl + enter to save'"
        >
          Save
        </PrimaryButton>
      </div>
    </template>
  </div>

  <div
    v-if="!editing && byComponent.implementationStatus?.state"
    class="mt-2 text-xs"
  >
    <span class="font-medium text-gray-700 dark:text-slate-300"
      >Implementation Status:</span
    >
    <span class="ml-1 text-gray-600 dark:text-slate-400">
      {{ persistedImplementationStatusDisplayLabel }}
    </span>
    <div
      v-if="byComponent.implementationStatus.remarks"
      class="mt-1 text-gray-600 dark:text-slate-400"
    >
      {{ byComponent.implementationStatus.remarks }}
    </div>
  </div>

  <SharedResponsibilityBlocks :by-component="byComponent" />
</template>
