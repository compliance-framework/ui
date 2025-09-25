<template>
  <PageHeader> New Dashboard </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">Name</label>
        <FormInput v-model="dashboard.name" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Result Filter</label>
        <FormInput v-model="filter" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Controls</label>
        <MultiSelect
          v-model="selectedControls"
          :options="controls"
          filter
          optionLabel="label"
          optionGroupLabel="label"
          optionGroupChildren="items"
          display="chip"
          placeholder="Select Controls"
          class="w-full"
          :virtualScrollerOptions="{ itemSize: 44 }"
          :disabled="loading"
        >
          <template #optiongroup="slotProps">
            <div class="flex items-center gap-2">
              <img
                :alt="slotProps.option.label"
                src="https://primefaces.org/cdn/primevue/images/flag/flag_placeholder.png"
                :class="`flag flag-${slotProps.option.code.toLowerCase()}`"
                style="width: 18px"
              />
              <div>{{ slotProps.option.label }}</div>
            </div>
          </template>
        </MultiSelect>
      </div>

      <div class="text-right">
        <PrimaryButton type="submit"> Submit </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Dashboard } from '@/stores/filters.ts';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import type { Catalog, Control } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const router = useRouter();
const route = useRoute();
const dashboard = ref<Dashboard>({} as Dashboard);

const filter = ref<string>('');
onMounted(() => {
  if (route.query['filter']) {
    filter.value = route.query['filter'] as string;
  }
});

interface ControlOption {
  label: string;
  value: string;
}

interface SelectControl {
  label: string;
  code: string;
  items: ControlOption[];
}

const selectedControls = ref<ControlOption[]>([]);
const controls = ref<SelectControl[]>([]);
const loading = ref<boolean>(true);

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const { execute: fetchFullCatalog } = useDataApi<Catalog>(null, null, {
  abortPrevious: false,
});
const { execute: createDashboard } = useDataApi<Dashboard>(
  '/api/filters',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

watch(catalogs, buildControlList);

async function buildControlList() {
  console.log('[CreateFormView] Building control list: start');
  // Reset before rebuilding to avoid duplicates on re-runs
  controls.value = [];
  for (const catalog of catalogs.value || []) {
    try {
      console.time(`[CreateFormView] fetch catalog ${catalog.uuid}`);
      const response = await fetchFullCatalog(
        `/api/oscal/catalogs/${catalog.uuid}/full`,
      );
      console.timeEnd(`[CreateFormView] fetch catalog ${catalog.uuid}`);
      // useAxios execute() returns AxiosResponse; payload is in response.data.data
      const fullCatalog = response?.data.value?.data as Catalog | undefined;
      if (!fullCatalog) {
        console.warn(
          `[CreateFormView] No catalog payload for ${catalog.uuid}; skipping`,
        );
        continue;
      }
      const results = [] as SelectControl[];
      let groupCount = 0;
      let itemCount = 0;
      for (const group of fullCatalog.groups || []) {
        let controlList = [] as ControlOption[];
        if (group.controls) {
          group.controls.forEach((control) => {
            controlList = [...controlList, ...getControlSelectList(control)];
          });

          results.push({
            label: group.title,
            code: group.id,
            items: controlList,
          });
          groupCount += 1;
          itemCount += controlList.length;
        }
      }
      controls.value = [...controls.value, ...results];
      console.log(
        `[CreateFormView] Processed catalog ${catalog.uuid}: groups=${groupCount}, items=${itemCount}, totalItemsAccumulated=${controls.value.reduce((n, g) => n + g.items.length, 0)}`,
      );
    } catch (error) {
      console.error(
        `[CreateFormView] Error fetching full catalog ${catalog.uuid}:`,
        error,
      );
    } finally {
      loading.value = false;
    }
  }
  console.log('[CreateFormView] Building control list: done');
}

function getControlSelectList(control: Control): ControlOption[] {
  let results = [] as ControlOption[];

  if (control.controls) {
    control.controls.forEach((cont) => {
      let subResults = [] as ControlOption[];
      if (cont.controls && cont.controls.length > 0) {
        subResults = getControlSelectList(cont);
      }
      results.push({
        label: cont.id + ' ' + cont.title,
        value: cont.id,
      });
      results = [...results, ...subResults];
    });
  } else {
    results.push({
      label: control.id + ' ' + control.title,
      value: control.id,
    });
  }

  return results;
}

async function submit() {
  const controlIds = [] as string[];
  selectedControls.value.forEach((control) => {
    controlIds.push(control.value);
  });
  try {
    const parsedFilter = new FilterParser(filter.value).parse();
    await createDashboard({
      data: {
        ...dashboard.value,
        filter: parsedFilter,
        controls: controlIds,
      },
    });
    return router.push({
      name: 'evidence:index',
      query: { filter: filter.value },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
