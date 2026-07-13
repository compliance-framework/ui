<template>
  <form @submit.prevent="submit" class="space-y-6">
    <div>
      <h4 class="text-sm font-medium dark:text-slate-300 mb-2">
        Items to inherit
      </h4>
      <div class="space-y-3">
        <div
          v-for="item in offering.items ?? []"
          :key="item.id"
          class="p-3 border border-ccf-200 dark:border-slate-600 rounded"
        >
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="selectedItemIds.has(item.id)"
              @change="toggleItem(item.id)"
            />
            <span class="text-sm dark:text-slate-300">
              {{ item.controlId
              }}<span v-if="item.statementId">
                · Statement {{ item.statementId }}</span
              >
            </span>
          </label>

          <div
            v-if="selectedItemIds.has(item.id) && item.responsibilities.length"
            class="mt-2 ml-6 space-y-1"
          >
            <div class="text-xs text-gray-500 dark:text-slate-400">
              Responsibilities we will satisfy:
            </div>
            <label
              v-for="responsibility in item.responsibilities"
              :key="responsibility.responsibilityUuid"
              class="flex items-center gap-2"
            >
              <input
                type="checkbox"
                :checked="
                  isSatisfied(item.id, responsibility.responsibilityUuid)
                "
                @change="
                  toggleSatisfied(item.id, responsibility.responsibilityUuid)
                "
              />
              <span class="text-sm dark:text-slate-300">
                {{ responsibility.description }}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h4 class="text-sm font-medium dark:text-slate-300 mb-2">
        Leveraged Authorization
      </h4>
      <div class="space-y-3">
        <div>
          <Label for="leverage-title" required>Title</Label>
          <InputText
            id="leverage-title"
            v-model="leveragedAuth.title"
            class="w-full"
          />
        </div>
        <div>
          <Label for="leverage-party-uuid" required>Party UUID</Label>
          <InputText
            id="leverage-party-uuid"
            v-model="leveragedAuth.partyUuid"
            placeholder="UUID of the party providing the authorization"
            class="w-full"
          />
        </div>
        <div>
          <Label for="leverage-date-authorized">Date Authorized</Label>
          <input
            id="leverage-date-authorized"
            v-model="leveragedAuth.dateAuthorized"
            type="date"
            class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300"
          />
        </div>
      </div>
    </div>

    <Message v-if="validationError" severity="error">
      {{ validationError }}
    </Message>

    <div
      class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="$emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="submitting">
        {{ submitting ? 'Subscribing...' : 'Subscribe' }}
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type { CatalogOffering } from '@/types/ssp-export-offerings';
import type { SSPLeverageLink, SubscribeRequest } from '@/types/ssp-leverage';
import type { AxiosError } from 'axios';

const props = defineProps<{
  sspId: string;
  offering: CatalogOffering;
}>();

const emit = defineEmits<{
  cancel: [];
  subscribed: [links: SSPLeverageLink[]];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

const selectedItemIds = ref(new Set<string>());
const satisfiedByItem = ref(new Map<string, Set<string>>());
const leveragedAuth = reactive({
  title: '',
  partyUuid: '',
  dateAuthorized: '',
});
const submitting = ref(false);
const validationError = ref('');

function toggleItem(itemId: string) {
  if (selectedItemIds.value.has(itemId)) {
    selectedItemIds.value.delete(itemId);
  } else {
    selectedItemIds.value.add(itemId);
  }
}

function isSatisfied(itemId: string, responsibilityUuid: string): boolean {
  return satisfiedByItem.value.get(itemId)?.has(responsibilityUuid) ?? false;
}

function toggleSatisfied(itemId: string, responsibilityUuid: string) {
  if (!satisfiedByItem.value.has(itemId)) {
    satisfiedByItem.value.set(itemId, new Set());
  }
  const set = satisfiedByItem.value.get(itemId)!;
  if (set.has(responsibilityUuid)) {
    set.delete(responsibilityUuid);
  } else {
    set.add(responsibilityUuid);
  }
}

// Converts an <input type="date"> value ("YYYY-MM-DD") to a full RFC3339 timestamp —
// Go's time.Parse(time.RFC3339, ...) rejects a bare date, which is all a date input gives.
function toRfc3339(dateOnly: string): string {
  return new Date(dateOnly).toISOString().replace(/\.\d+Z$/, 'Z');
}

async function submit() {
  validationError.value = '';
  if (selectedItemIds.value.size === 0) {
    validationError.value = 'Select at least one item to inherit.';
    return;
  }
  if (!leveragedAuth.title.trim() || !leveragedAuth.partyUuid.trim()) {
    validationError.value =
      'Leveraged Authorization title and Party UUID are required.';
    return;
  }

  const body: SubscribeRequest = {
    downstreamSspId: props.sspId,
    leveragedAuthorization: {
      title: leveragedAuth.title.trim(),
      partyUuid: leveragedAuth.partyUuid.trim(),
      ...(leveragedAuth.dateAuthorized
        ? { dateAuthorized: toRfc3339(leveragedAuth.dateAuthorized) }
        : {}),
    },
    items: [...selectedItemIds.value].map((itemId) => ({
      itemId,
      satisfiedResponsibilityUuids: [
        ...(satisfiedByItem.value.get(itemId) ?? []),
      ],
    })),
  };

  submitting.value = true;
  try {
    const response = await axiosInstance.post<DataResponse<SSPLeverageLink[]>>(
      `/api/oscal/ssp-export-offerings/${props.offering.id}/subscribe`,
      body,
    );
    toast.add({
      severity: 'success',
      summary: `Subscribed to ${response.data.data.length} item${response.data.data.length === 1 ? '' : 's'}.`,
      life: 3000,
    });
    emit('subscribed', response.data.data);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body ||
        'Failed to subscribe to export offering.',
      life: 5000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>
