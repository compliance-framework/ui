<script setup lang="ts">
import { ref, watchEffect, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import BurgerMenu from '@/components/BurgerMenu.vue';
import Textarea from '@/volt/Textarea.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import VueMarkdown from 'vue-markdown-render';
import type { ByComponent, Risk, SystemComponent } from '@/oscal';
import {
  getRiskComponentIds,
  getRiskControlIds,
  getRiskImpact,
} from '@/utils/risk-register';
import RiskIndicatorBadge from './RiskIndicatorBadge.vue';

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

const localComponent = ref<ByComponent>(byComponent);
watchEffect(() => {
  localComponent.value = byComponent;
});

const { value: editing, set: setEditing } = useToggle();

const { data: component } = useDataApi<SystemComponent>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid as string}/system-implementation/components/${byComponent.componentUuid}`,
);

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

watch(
  [
    () => sspRisks?.length ?? 0,
    () => byComponent.componentUuid,
    () => controlId,
    riskCount,
  ],
  ([totalRisks, componentUuid, currentControlId, matchedRiskCount]) => {
    if (!componentUuid || !currentControlId || totalRisks === 0) {
      return;
    }
    const sample = (sspRisks ?? []).slice(0, 3).map((risk) => ({
      riskId: risk.uuid,
      controlIds: getRiskControlIds(risk),
      componentIds: getRiskComponentIds(risk),
    }));
    console.debug('[controls:risk] Component match result', {
      componentUuid,
      controlId: currentControlId,
      totalRisks,
      matchedRiskCount,
      matchedRiskIds: relatedRisks.value.map((risk) => risk.uuid),
      sample,
    });
  },
  { immediate: true },
);

function save() {
  emit('save', localComponent.value);
  setEditing(false);
}

async function deleteStatement() {
  emit('delete', localComponent.value);
}

function cancel() {
  setEditing(false);
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
    <BurgerMenu
      :items="[
        {
          label: 'Edit',
          command() {
            setEditing(true);
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
  <div class="text-gray-600 dark:text-slate-400">
    <template v-if="!editing">
      <p class="prose prose-slate dark:prose-invert max-w-full">
        <VueMarkdown :source="localComponent.description" />
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
      <div class="flex gap-x-2">
        <secondary-button @click="cancel">Cancel</secondary-button>
        <primary-button @click="save" v-tooltip="'ctrl + enter to save'"
          >Save</primary-button
        >
      </div>
    </template>
  </div>

  <!-- Export Information -->
  <div v-if="byComponent.export" class="mt-2 text-xs">
    <div v-if="byComponent.export.provided?.length" class="mb-1">
      <span class="font-medium text-green-700 dark:text-green-400"
        >Provided:</span
      >
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
      <span class="font-medium text-orange-700 dark:text-orange-400"
        >Responsibilities:</span
      >
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

  <!-- Satisfied Requirements -->
  <div v-if="byComponent.satisfied?.length" class="mt-2 text-xs">
    <span class="font-medium text-blue-700 dark:text-blue-400">Satisfied:</span>
    <div class="ml-2">
      <div
        v-for="satisfied in byComponent.satisfied"
        :key="satisfied.uuid"
        class="text-blue-600 dark:text-blue-400"
      >
        {{ satisfied.description }}
      </div>
    </div>
  </div>

  <!-- Inherited Requirements -->
  <div v-if="byComponent.inherited?.length" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Inherited:</span
    >
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

  <!-- Implementation Status -->
  <!-- <div v-if="byComponent.implementationStatus" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Implementation Status:</span
    >
    <div class="ml-2">
      <span class="font-medium text-purple-700 dark:text-purple-400"
        >State: {{ byComponent.implementationStatus.state }}</span
      >
    </div>
    <div v-if="byComponent.implementationStatus.remarks">
      <div class="ml-2">
        <span class="font-medium text-purple-700 dark:text-purple-400"
          >Remarks: {{ byComponent.implementationStatus.remarks }}</span
        >
      </div>
    </div>
  </div> -->
</template>
