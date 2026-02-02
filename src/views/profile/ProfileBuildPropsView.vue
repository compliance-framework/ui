<template>
  <div class="p-6">
    <PageHeader>Build Profile by Props</PageHeader>
    <div class="mt-2">
      <PageSubHeader
        >Select controls from a catalog using prop rules</PageSubHeader
      >
    </div>

    <div
      class="mt-4 rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 p-4"
    >
      <form @submit.prevent="buildProfile">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Catalog UUID</label>
            <input
              v-model="catalogId"
              class="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <p
              v-if="catalogId && !uuidRe.test(catalogId)"
              class="text-red-600 text-xs mt-1"
            >
              Invalid UUID format
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Select Catalog</label>
            <select
              v-model="selectedCatalog"
              @change="selectCatalog(selectedCatalog)"
              class="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="" disabled>Select a catalog</option>
              <option v-for="c in catalogs || []" :key="c.uuid" :value="c.uuid">
                {{ c.metadata?.title || c.uuid }}
              </option>
            </select>
            <p
              v-if="!catalogs || catalogs.length === 0"
              class="text-xs mt-1 text-gray-500"
            >
              No catalogs found. Import or create a catalog first.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Match Strategy</label>
            <select
              v-model="matchStrategy"
              class="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="any">any</option>
              <option value="all">all</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Profile Title</label>
            <input
              v-model="title"
              class="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Prop-Matched Profile"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1"
              >Profile Version</label
            >
            <input
              v-model="version"
              class="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium mb-2">Rules</label>
          <div
            v-for="(r, idx) in rules"
            :key="idx"
            class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3"
          >
            <input
              v-model="r.name"
              class="rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
              placeholder="prop name (optional, e.g. class)"
            />
            <select
              v-model="r.operator"
              class="rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="equals">equals</option>
              <option value="contains">contains</option>
              <option value="regex">regex</option>
              <option value="in">in</option>
            </select>
            <input
              v-model="r.value"
              class="rounded border px-3 py-2 dark:bg-slate-800 dark:text-slate-200"
              placeholder="value (e.g. technical)"
            />
            <button
              type="button"
              class="rounded bg-red-600 text-white px-3 py-2"
              @click="removeRule(idx)"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            class="rounded bg-slate-600 text-white px-3 py-2"
            @click="addRule"
          >
            Add Rule
          </button>
        </div>

        <div class="mt-6">
          <PrimaryButton type="submit" :disabled="submitting || !canSubmit">
            {{ submitting ? 'Building...' : 'Build Profile' }}
          </PrimaryButton>
        </div>
      </form>
    </div>

    <div
      v-if="result"
      class="mt-4 rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 p-4"
    >
      <h3 class="text-lg font-medium mb-2">Result</h3>
      <p class="mb-2">
        Profile ID:
        <router-link
          :to="{ name: 'profile:view', params: { id: result.profileId } }"
          class="text-blue-600"
        >
          {{ result.profileId }}
        </router-link>
      </p>
      <p class="mb-2">Matched Control IDs: {{ result.controlIds.length }}</p>
      <div class="mt-2">
        <details>
          <summary class="cursor-pointer">Show JSON</summary>
          <pre class="overflow-auto text-xs mt-2">{{ prettyResult }}</pre>
        </details>
      </div>
    </div>
  </div>
  <div class="h-screen w-full"></div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosHeaders } from 'axios';
import type { Catalog } from '@/oscal';

const toast = useToast();
const uuidRe =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const catalogId = ref<string>('');
const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const selectedCatalog = ref<string>('');
function selectCatalog(id: string) {
  selectedCatalog.value = id;
  catalogId.value = id;
}
watch(
  catalogs,
  (val) => {
    if (val && val.length > 0 && !catalogId.value) {
      selectedCatalog.value = val[0].uuid;
      catalogId.value = val[0].uuid;
    }
  },
  { immediate: true },
);
const matchStrategy = ref<'any' | 'all'>('any');
const title = ref<string>('Prop-Matched Profile');
const version = ref<string>('1.0.0');
const rules = ref<Array<{ name: string; operator: string; value: string }>>([
  { name: 'label', operator: 'contains', value: 'AC-' },
]);
const submitting = ref<boolean>(false);

const canSubmit = computed(() => {
  const rs = rules.value;
  const hasValidRules =
    rs.length > 0 &&
    rs.every(
      (r) =>
        !!r.operator &&
        typeof r.value === 'string' &&
        r.value.trim().length > 0,
    );
  return uuidRe.test(catalogId.value) && hasValidRules;
});

function addRule() {
  rules.value.push({ name: '', operator: 'equals', value: '' });
}
function removeRule(idx: number) {
  rules.value.splice(idx, 1);
}

type BuildResponse = {
  profileId: string;
  controlIds: string[];
  profile: Record<string, unknown>;
};

const { execute } = useDataApi<{
  profileId: string;
  controlIds: string[];
  profile: unknown;
}>(
  '/api/oscal/profiles/build-props',
  {
    method: 'POST',
    transformRequest: [
      (data, headers) =>
        decamelizeKeys(data, headers as unknown as AxiosHeaders),
    ],
  },
  { immediate: false },
);

const result = ref<BuildResponse | null>(null);
const prettyResult = computed(() =>
  result.value ? JSON.stringify(result.value, null, 2) : '',
);

async function buildProfile() {
  if (!canSubmit.value) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Please enter a valid Catalog UUID and complete all rule fields.',
      life: 2500,
    });
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      catalogId: catalogId.value,
      matchStrategy: matchStrategy.value,
      rules: rules.value,
      title: title.value,
      version: version.value,
    };
    const resp = await execute('/api/oscal/profiles/build-props', {
      data: payload,
    });
    result.value = resp.data.value?.data as BuildResponse;
    const count = result.value?.controlIds?.length ?? 0;
    toast.add({
      severity: count > 0 ? 'success' : 'info',
      summary: 'Profile built',
      detail: `Matched ${count} control(s)`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Build Failed',
      detail:
        error instanceof Error ? error.message : 'Failed to build profile',
      life: 3000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>
