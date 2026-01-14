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
          :disabled="loadingControls"
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

      <div class="mb-4">
        <label class="inline-block pb-2">Components</label>
        <MultiSelect
          v-model="selectedComponents"
          :options="components"
          filter
          optionLabel="label"
          optionGroupLabel="label"
          optionGroupChildren="items"
          display="chip"
          placeholder="Select Components"
          class="w-full"
          :virtualScrollerOptions="{ itemSize: 44 }"
          :disabled="loadingComponents"
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
import type { Catalog, ComponentDefinition, Control, DefinedComponent } from '@/oscal';
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

interface ComponentOption {
  label: string;
  value: string;
}

interface SelectControl {
  label: string;
  code: string;
  items: ControlOption[];
}

interface SelectComponent {
  label: string;
  code: string;
  items: ComponentOption[];
}

const selectedControls = ref<ControlOption[]>([]);
const selectedComponents = ref<ComponentOption[]>([]);
const controls = ref<SelectControl[]>([]);
const components = ref<SelectComponent[]>([]);
const loadingControls = ref<boolean>(true);
const loadingComponents = ref<boolean>(true);

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const { data: componentDefinitions } = useDataApi<ComponentDefinition[]>('/api/oscal/component-definitions');
const { execute: fetchFullCatalog } = useDataApi<Catalog>(null, null, { abortPrevious: false });
const { execute: fetchFullComponentDefinition } = useDataApi<ComponentDefinition>(null, null, { abortPrevious: false });
const { execute: createDashboard } = useDataApi<Dashboard>(
  '/api/filters',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

watch(catalogs, buildControlList);
watch(componentDefinitions, buildComponentList);

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
      loadingControls.value = false;
    }
  }
  console.log('[CreateFormView] Building control list: done');
}

async function buildComponentList() {
  console.log('[CreateFormView] Building component list: start');
  // Reset before rebuilding to avoid duplicates on re-runs
  components.value = [];
  for (const componentDefinition of componentDefinitions.value || []) {
    try {
      console.time(`[CreateFormView] fetch componentDefinition ${componentDefinition.uuid}`);
      const response = await fetchFullComponentDefinition(
        `/api/oscal/component-definitions/${componentDefinition.uuid}/full`,
      );
      console.timeEnd(`[CreateFormView] fetch componentDefinition ${componentDefinition.uuid}`);
      // useAxios execute() returns AxiosResponse; payload is in response.data.data
      const fullComponentDefinition = response?.data.value?.data as ComponentDefinition | undefined;
      if (!fullComponentDefinition) {
        console.warn(
          `[CreateFormView] No componentDefinition payload for ${componentDefinition.uuid}; skipping`,
        );
        continue;
      }
      const results = [] as SelectComponent[];
      let componentList = [] as ComponentOption[];
      if (fullComponentDefinition.components) {
        fullComponentDefinition.components.forEach((component) => {
          console.log(`[CreateFormView] Added component ${component.title} for definition ${componentDefinition.uuid}`)
          componentList = [...componentList, ...getComponentSelectList(component)];
        });

        results.push({
          label: componentDefinition.metadata.title,
          code: componentDefinition.uuid,
          items: componentList,
        });
      } else {
        console.log(`[CreateFormView] No components defined for component definition ${componentDefinition.uuid}`)
      }

      let itemCount = componentList.length;
      components.value = [...components.value, ...results];
      console.log(
        `[CreateFormView] Processed componentDefinition ${componentDefinition.uuid}: items=${itemCount}, totalItemsAccumulated=${components.value.reduce((n, g) => n + g.items.length, 0)}`,
      );
    } catch (error) {
      console.error(
        `[CreateFormView] Error fetching full componentDefinition ${componentDefinition.uuid}:`,
        error,
      );
    } finally {
      loadingComponents.value = false;
    }
  }
  console.log('[CreateFormView] Building component list: done');
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

function getComponentSelectList(component: DefinedComponent): ComponentOption[] {
    return [{
      label: component.title,
      value: component.uuid,
    }];
}

async function submit() {
  const controlIds = [] as string[];
  const componentIds = [] as string[];
  selectedControls.value.forEach((control) => {
    controlIds.push(control.value);
  });
  selectedComponents.value.forEach((component) => {
    componentIds.push(component.value);
  })
  try {
    const parsedFilter = new FilterParser(filter.value).parse();
    await createDashboard({
      data: {
        ...dashboard.value,
        filter: parsedFilter,
        controls: controlIds,
        components: componentIds,
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
