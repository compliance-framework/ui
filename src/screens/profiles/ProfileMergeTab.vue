<script setup lang="ts">
/**
 * A profile's merge settings (/profiles/:id/merge; not on the tab bar, as before): how imported
 * controls are combined. The script is the classic page's.
 */
import {
  type Merge,
  type MergeCombineOptions,
  type MergeOptions,
} from '@/oscal';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const updateDenied = computed(() =>
  can(RESOURCES.PROFILE, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing profiles.",
);
const route = useRoute();
const toast = useToast();
const id = route.params.id as string;

const {
  data: merge,
  error: loadError,
  execute: reloadMerge,
} = useDataApi<Merge>(`/api/oscal/profiles/${id}/merge`);
const { data: updatedMerge, execute: updateMergeExecute } = useDataApi<Merge>(
  `/api/oscal/profiles/${id}/merge`,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

watch(
  merge,
  () => {
    if (merge.value) {
      mergeType.value = merge.value.asIs
        ? 'asIs'
        : merge.value.flat
          ? 'flat'
          : 'custom';
      combineEnabled.value = !!merge.value.combine;
    }
  },
  { immediate: true },
);

const mergeType = ref<MergeOptions>('asIs');
const combineEnabled = ref(false);

async function updateMerge() {
  if (!merge.value) return;
  try {
    await updateMergeExecute({
      data: merge.value,
    });
    merge.value = updatedMerge.value;
    toast.add({
      severity: 'success',
      summary: 'Merge settings updated successfully',
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: `Error updating merge settings - ${errorResponse.response?.statusText || 'Unknown error'}`,
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while updating merge settings.',
      life: 3000,
    });
  }
}

// Watch mergeType and update merge object
watch(mergeType, (type) => {
  if (!merge.value) return;
  if (type === 'asIs') {
    merge.value.asIs = true;
    delete merge.value.flat;
  } else if (type === 'custom') {
    // not implemented yet
  } else {
    merge.value.flat = {};
    delete merge.value.asIs;
  }
});

// Watch combineEnabled and update merge.combine
watch(combineEnabled, (enabled) => {
  if (!merge.value) return;
  if (enabled) {
    if (!merge.value.combine) {
      merge.value.combine = { method: 'use-first' };
    }
  } else {
    merge.value.combine = undefined;
  }
});

const mergeTypeModel = computed({
  get: () => mergeType.value as string,
  set: (value: string) => {
    mergeType.value = value as MergeOptions;
  },
});
const combineMethod = computed({
  get: () => merge.value?.combine?.method ?? 'use-first',
  set: (value: string) => {
    if (merge.value?.combine)
      merge.value.combine.method = value as MergeCombineOptions;
  },
});
</script>

<template>
  <DataState
    v-if="!merge"
    :status="loadError ? 'error' : 'loading'"
    subject="merge settings"
    skeleton="panel"
    @retry="reloadMerge().catch(() => undefined)"
  />
  <form v-else novalidate @submit.prevent="updateMerge()">
    <Stack gap="4">
      <RadioGroup
        v-model="mergeTypeModel"
        legend="Merge type"
        :options="[
          {
            value: 'asIs',
            label: 'As is',
            description: 'Keep the imported catalogs’ structure.',
          },
          {
            value: 'flat',
            label: 'Flat',
            description: 'List every control without groups.',
          },
        ]"
      />
      <Checkbox
        v-model="combineEnabled"
        label="Combine controls imported more than once"
      />
      <FormField v-if="combineEnabled && merge.combine" label="Combine method">
        <Select
          v-model="combineMethod"
          :options="[
            { value: 'use-first', label: 'Use first' },
            { value: 'flat', label: 'Flat' },
          ]"
        />
      </FormField>
      <div>
        <Button variant="primary" type="submit" :disabled-reason="updateDenied"
          >Save merge settings</Button
        >
      </div>
    </Stack>
  </form>
</template>
