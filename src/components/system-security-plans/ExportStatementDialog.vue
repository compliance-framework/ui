<template>
  <Dialog
    v-model:visible="visible"
    size="xl"
    modal
    header="Share this implementation"
  >
    <div class="space-y-1 mb-4">
      <div class="text-sm font-medium dark:text-slate-300">
        {{ controlId }} · Statement {{ statementId }}
      </div>
      <p
        v-if="statementText"
        class="text-xs text-gray-500 dark:text-slate-400 line-clamp-2"
      >
        {{ statementText }}
      </p>
    </div>

    <div
      v-if="loading"
      class="py-6 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2"
    >
      <i class="pi pi-spin pi-spinner"></i>
      Loading what this system currently shares…
    </div>

    <Message
      v-else-if="stepError && stepError.step === 'load'"
      severity="error"
      variant="outlined"
    >
      <div class="flex items-center justify-between gap-3">
        <span>{{ stepErrorCopy(stepError) }}</span>
        <SecondaryButton type="button" size="small" @click="reload">
          Retry
        </SecondaryButton>
      </div>
    </Message>

    <form v-else-if="ready" class="space-y-6" @submit.prevent="share">
      <!-- What this system provides -->
      <section>
        <h4 class="text-sm font-medium dark:text-slate-300">
          What this system provides
        </h4>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
          Describe what downstream systems get when they inherit this. Leave
          empty to share the full implementation.
        </p>
        <div
          v-if="!providedDrafts.length"
          class="mb-2 p-3 border border-dashed border-ccf-200 dark:border-slate-600 rounded text-xs text-gray-500 dark:text-slate-400"
        >
          Nothing specific listed — the full implementation of this statement
          will be shared as:
          <span class="italic">“{{ fullScopePreview }}”</span>
        </div>
        <div
          v-for="(entry, index) in providedDrafts"
          :key="entry.uuid ?? `new-provided-${index}`"
          class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded space-y-2"
        >
          <Textarea
            v-model="entry.description"
            class="w-full"
            rows="2"
            placeholder="e.g. Org-wide MFA is enforced for every consumer of this platform"
          />
          <div class="flex justify-end">
            <button
              type="button"
              class="text-red-500 hover:text-red-700 text-sm"
              @click="removeProvided(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <SecondaryButton type="button" size="small" @click="addProvided">
          Add a capability
        </SecondaryButton>
      </section>

      <!-- What consumers remain responsible for -->
      <section>
        <h4 class="text-sm font-medium dark:text-slate-300">
          What consumers remain responsible for
        </h4>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
          Anything a downstream system must still do themselves.
        </p>
        <div
          v-for="(entry, index) in responsibilityDrafts"
          :key="entry.uuid ?? `new-responsibility-${index}`"
          class="mb-2 p-3 border border-ccf-200 dark:border-slate-600 rounded space-y-2"
        >
          <Textarea
            v-model="entry.description"
            class="w-full"
            rows="2"
            placeholder="e.g. Enforce MFA for any local accounts outside our SSO"
          />
          <div class="flex items-center justify-between gap-2">
            <div v-if="providedDrafts.length > 1" class="flex-1">
              <Label :for="`responsibility-applies-${index}`">
                Applies to
              </Label>
              <Select
                :id="`responsibility-applies-${index}`"
                v-model="entry.providedIndex"
                :options="providedOptions"
                option-label="label"
                option-value="index"
                class="w-full"
              />
            </div>
            <button
              type="button"
              class="text-red-500 hover:text-red-700 text-sm shrink-0 ml-auto"
              @click="removeResponsibility(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <SecondaryButton type="button" size="small" @click="addResponsibility">
          Add a responsibility
        </SecondaryButton>
      </section>

      <!-- Who can import this -->
      <section>
        <h4 class="text-sm font-medium dark:text-slate-300 mb-1">
          Who can import this
        </h4>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-2">
          Applies to everything this system shares, not just this statement.
        </p>
        <SelectButton
          v-model="visibilityMode"
          :options="visibilityOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
        />
        <p
          v-if="visibilityMode === 'anyone'"
          class="text-xs text-gray-500 dark:text-slate-400 mt-2"
        >
          Any other system in this workspace can import this capability.
        </p>
        <div v-else class="mt-2">
          <MultiSelect
            v-model="selectedSspIds"
            :options="state?.sspOptions ?? []"
            option-label="label"
            option-value="id"
            placeholder="Select a system security plan"
            class="w-full"
            filter
          />
        </div>
      </section>

      <Message v-if="validationError" severity="error">
        {{ validationError }}
      </Message>

      <Message
        v-if="stepError && stepError.step !== 'load'"
        severity="error"
        variant="outlined"
      >
        <div class="flex items-center justify-between gap-3">
          <span>{{ stepErrorCopy(stepError) }}</span>
          <SecondaryButton
            type="button"
            size="small"
            :disabled="saving"
            @click="share"
          >
            Retry
          </SecondaryButton>
        </div>
      </Message>

      <div
        class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="visible = false">
          Cancel
        </SecondaryButton>
        <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.UPDATE">
          <PrimaryButton type="submit" :disabled="saving">
            {{ saving ? 'Sharing…' : 'Share' }}
          </PrimaryButton>
        </PermissionGate>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Label from '@/volt/Label.vue';
import Message from '@/volt/Message.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Select from '@/volt/Select.vue';
import SelectButton from '@/volt/SelectButton.vue';
import Textarea from '@/volt/Textarea.vue';
import PermissionGate from '@/components/auth/PermissionGate.vue';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  fullScopeProvidedDescription,
  stepErrorCopy,
  useStatementExport,
  type ProvidedDraft,
  type ResponsibilityDraft,
} from '@/composables/useStatementExport';

const props = defineProps<{
  sspId: string;
  sspTitle: string;
  controlId: string;
  // The OSCAL part id (e.g. "ac-2_smt.a") — the composable resolves the uuids.
  statementId: string;
  statementText?: string;
  // Optional anchor hint when editing a specific rollup row.
  byComponentUuid?: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  saved: [];
}>();

const toast = useToast();

const { state, loading, saving, stepError, load, save } = useStatementExport(
  () => ({
    sspId: props.sspId,
    sspTitle: props.sspTitle,
    controlId: props.controlId,
    statementId: props.statementId,
    byComponentUuid: props.byComponentUuid,
  }),
);

const providedDrafts = ref<ProvidedDraft[]>([]);
const responsibilityDrafts = ref<ResponsibilityDraft[]>([]);
const visibilityMode = ref<'anyone' | 'selected'>('anyone');
const selectedSspIds = ref<string[]>([]);
const validationError = ref('');

const ready = computed(() => !loading.value && state.value !== null);

const fullScopePreview = computed(() =>
  fullScopeProvidedDescription(props.sspTitle),
);

const visibilityOptions = [
  { label: 'Anyone', value: 'anyone' },
  { label: 'Only selected systems', value: 'selected' },
];

const providedOptions = computed(() =>
  providedDrafts.value.map((entry, index) => ({
    index,
    label: entry.description.trim() || `Capability ${index + 1}`,
  })),
);

async function reload() {
  const loaded = await load();
  if (!loaded || !state.value) return;
  providedDrafts.value = state.value.provided.map((p) => ({ ...p }));
  responsibilityDrafts.value = state.value.responsibilities.map((r) => ({
    ...r,
  }));
  selectedSspIds.value = [...state.value.allowedSspIds];
  visibilityMode.value = state.value.allowedSspIds.length
    ? 'selected'
    : 'anyone';
  validationError.value = '';
}

// immediate: the dialog is often mounted (v-if) at the same moment it is opened, so the
// first "open" would otherwise never trip the watcher.
watch(
  visible,
  (isOpen) => {
    if (isOpen) {
      void reload();
    }
  },
  { immediate: true },
);

function addProvided() {
  providedDrafts.value.push({ description: '' });
}

function removeProvided(index: number) {
  providedDrafts.value.splice(index, 1);
  // Re-point responsibilities that referenced the removed block.
  for (const entry of responsibilityDrafts.value) {
    if (entry.providedIndex >= providedDrafts.value.length) {
      entry.providedIndex = Math.max(providedDrafts.value.length - 1, 0);
    }
  }
}

function addResponsibility() {
  responsibilityDrafts.value.push({ description: '', providedIndex: 0 });
}

function removeResponsibility(index: number) {
  responsibilityDrafts.value.splice(index, 1);
}

async function share() {
  if (saving.value) return;
  validationError.value = '';

  const provided = providedDrafts.value.filter((p) => p.description.trim());
  const responsibilities = responsibilityDrafts.value.filter((r) =>
    r.description.trim(),
  );
  // An entry that exists but was blanked out is ambiguous — make the user either write it
  // or remove it, instead of silently deleting.
  if (
    provided.length !== providedDrafts.value.length ||
    responsibilities.length !== responsibilityDrafts.value.length
  ) {
    validationError.value =
      'Some entries are empty. Write a description or remove them.';
    return;
  }
  if (visibilityMode.value === 'selected' && !selectedSspIds.value.length) {
    validationError.value =
      'Select at least one system, or switch visibility to “Anyone”.';
    return;
  }

  const saved = await save({
    provided: providedDrafts.value,
    responsibilities: responsibilityDrafts.value,
    allowedSspIds:
      visibilityMode.value === 'selected' ? selectedSspIds.value : [],
  });
  if (!saved) return;

  toast.add({
    severity: 'success',
    summary: 'Implementation shared',
    detail: state.value?.alreadyPublished
      ? 'Other systems can now import it. Existing importers will be notified of the update.'
      : 'Other systems can now import it.',
    life: 4000,
  });
  visible.value = false;
  emit('saved');
}
</script>
