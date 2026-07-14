<template>
  <div class="space-y-4">
    <!-- The allow-list is opt-in: the API only enforces it when it is non-empty, so an empty
         list is not "nobody" but "anybody". Say so, or publishing reads as a no-op. -->
    <Message v-if="!allowed.length" severity="info" variant="simple">
      Any downstream may subscribe to this offering. Add a system security plan
      to restrict it to an allow-list.
    </Message>

    <div v-else class="space-y-2">
      <div
        v-for="entry in allowed"
        :key="entry.id"
        class="p-3 border border-ccf-200 dark:border-slate-600 rounded flex justify-between items-center"
      >
        <span class="text-sm dark:text-slate-300">
          {{ sspTitle(entry.downstreamSspId) }}
        </span>
        <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.EXPORT">
          <button
            type="button"
            class="text-red-500 hover:text-red-700 text-sm shrink-0 ml-2"
            :disabled="removingIds.has(entry.downstreamSspId)"
            @click="remove(entry)"
          >
            Remove
          </button>
        </PermissionGate>
      </div>
    </div>

    <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.EXPORT">
      <div class="pt-3 border-t border-gray-200 dark:border-slate-700">
        <Label for="allowlist-downstream-picker">Allow a downstream</Label>
        <Select
          id="allowlist-downstream-picker"
          v-model="selectedSspId"
          :options="selectableSsps"
          option-label="label"
          option-value="id"
          placeholder="Select a system security plan"
          class="w-full"
        />
        <div class="flex justify-end mt-2">
          <PrimaryButton
            type="button"
            :disabled="!selectedSspId || adding"
            @click="add"
          >
            Add Downstream
          </PrimaryButton>
        </div>
      </div>
    </PermissionGate>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Select from '@/volt/Select.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import type { SystemSecurityPlan } from '@/oscal';
import type { AllowedDownstream } from '@/types/ssp-export-offerings';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  offeringId: string;
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

// Hand-written camelCase endpoints — no decamelizeKeys.
const baseUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offeringId}/allowed-downstreams`,
);

const allowed = ref<AllowedDownstream[]>([]);
const selectedSspId = ref<string | null>(null);
const adding = ref(false);
const removingIds = reactive(new Set<string>());

const { data: ssps } = useDataApi<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);

const sspTitleById = computed(() => {
  const map = new Map<string, string>();
  for (const ssp of ssps.value ?? []) {
    map.set(ssp.uuid, ssp.metadata?.title ?? ssp.uuid);
  }
  return map;
});

function sspTitle(id: string): string {
  return sspTitleById.value.get(id) ?? id;
}

const selectableSsps = computed(() => {
  const already = new Set(allowed.value.map((a) => a.downstreamSspId));
  return (
    (ssps.value ?? [])
      // The offering's own SSP is the upstream — it can't be its own downstream.
      .filter((ssp) => ssp.uuid !== props.sspId && !already.has(ssp.uuid))
      .map((ssp) => ({
        id: ssp.uuid,
        label: ssp.metadata?.title ?? ssp.uuid,
      }))
  );
});

function errorDetail(error: unknown, fallback: string): string {
  const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
  return errorResponse.response?.data?.errors?.body || fallback;
}

async function load() {
  try {
    const response = await axiosInstance.get<DataResponse<AllowedDownstream[]>>(
      baseUrl.value,
    );
    allowed.value = response.data.data ?? [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to load the downstream allow-list.'),
      life: 5000,
    });
  }
}

watch(baseUrl, () => void load(), { immediate: true });

async function add() {
  if (!selectedSspId.value) return;
  adding.value = true;
  try {
    const response = await axiosInstance.post<DataResponse<AllowedDownstream>>(
      baseUrl.value,
      { downstreamSspId: selectedSspId.value },
    );
    allowed.value = [...allowed.value, response.data.data];
    selectedSspId.value = null;
    toast.add({
      severity: 'success',
      summary: 'Downstream allowed.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to allow the downstream.'),
      life: 5000,
    });
  } finally {
    adding.value = false;
  }
}

async function remove(entry: AllowedDownstream) {
  removingIds.add(entry.downstreamSspId);
  try {
    await axiosInstance.delete(`${baseUrl.value}/${entry.downstreamSspId}`);
    allowed.value = allowed.value.filter(
      (a) => a.downstreamSspId !== entry.downstreamSspId,
    );
    toast.add({
      severity: 'success',
      summary: 'Downstream removed.',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorDetail(error, 'Failed to remove the downstream.'),
      life: 5000,
    });
  } finally {
    removingIds.delete(entry.downstreamSspId);
  }
}
</script>
