<template>
  <form @submit.prevent="submit">
    <div class="mb-4">
      <label class="inline-block pb-2">Name</label>
      <FormInput v-model="name" />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2">Result Filter</label>
      <FormInput v-model="filter" />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2">Scope</label>
      <Select
        v-model="selectedSspId"
        :options="sspScopeOptions"
        optionLabel="label"
        optionValue="value"
        class="w-full"
      />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2">Controls</label>
      <MultiSelect
        v-model="selectedControls"
        :options="controls"
        filter
        dataKey="value"
        optionLabel="label"
        optionGroupLabel="label"
        optionGroupChildren="items"
        display="chip"
        placeholder="Select Controls"
        class="w-full"
        :class="
          disableControlSelection
            ? 'opacity-50 cursor-not-allowed bg-gray-100'
            : ''
        "
        :virtualScrollerOptions="{ itemSize: 44 }"
        :disabled="disableControlSelection"
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
        dataKey="value"
        optionLabel="label"
        optionGroupLabel="label"
        optionGroupChildren="items"
        display="chip"
        placeholder="Select Components"
        class="w-full"
        :class="
          disableComponentSelection
            ? 'opacity-50 cursor-not-allowed bg-gray-100'
            : ''
        "
        :virtualScrollerOptions="{ itemSize: 44 }"
        :disabled="disableComponentSelection"
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

    <div class="flex justify-end gap-2">
      <SecondaryButton v-if="showCancel" type="button" @click="emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton
        type="submit"
        :disabled="!canSubmit"
        v-tooltip.top="{
          value: permissionTooltip(RESOURCES.FILTER, permissionAction),
          disabled: canSubmit,
        }"
      >
        {{ submitLabel }}
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { FilterParser, serializeFilter } from '@/parsers/labelfilter.ts';
import type { Dashboard, DashboardCreate } from '@/stores/filters.ts';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import Select from '@/volt/Select.vue';
import type {
  Catalog,
  SystemSecurityPlan,
  Control,
  SystemComponent,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const props = withDefaults(
  defineProps<{
    /** When provided, the form is prefilled for editing this dashboard. */
    dashboard?: Dashboard | null;
    /** Prefill the Result Filter input (create flow deep-links `?filter=`). */
    initialFilter?: string;
    submitLabel?: string;
    showCancel?: boolean;
  }>(),
  {
    dashboard: null,
    initialFilter: '',
    submitLabel: 'Submit',
    showCancel: false,
  },
);

const emit = defineEmits<{
  submit: [payload: DashboardCreate];
  cancel: [];
}>();

const { can, permissionTooltip } = usePermissions();

// Editing requires update, creating requires create.
const permissionAction = computed(() =>
  props.dashboard ? ACTIONS.UPDATE : ACTIONS.CREATE,
);
const canSubmit = computed(() => can(RESOURCES.FILTER, permissionAction.value));

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

const name = ref<string>(props.dashboard?.name ?? '');
const filter = ref<string>(
  props.dashboard
    ? serializeFilter(props.dashboard.filter)
    : props.initialFilter,
);
const selectedSspId = ref<string | null>(props.dashboard?.sspId ?? null);
const selectedControls = ref<ControlOption[]>(
  (props.dashboard?.controls ?? []).map((control) => ({
    label: `${control.id} ${control.title}`,
    value: control.id,
  })),
);
const selectedComponents = ref<ComponentOption[]>(
  (props.dashboard?.components ?? []).map((component) => ({
    label: component.title,
    value: component.uuid,
  })),
);

const controls = ref<SelectControl[]>([]);
const components = ref<SelectComponent[]>([]);
const loadingControls = ref<boolean>(true);
const loadingComponents = ref<boolean>(true);
const disableControlSelection = computed(
  () => loadingControls.value || selectedComponents.value.length > 0,
);
const disableComponentSelection = computed(
  () => loadingComponents.value || selectedControls.value.length > 0,
);

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const { data: systemSecurityPlans } = useDataApi<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);
const sspScopeOptions = computed(() => [
  { label: 'Global', value: null },
  ...(systemSecurityPlans.value ?? []).map((ssp) => ({
    label: ssp.metadata.title,
    value: ssp.uuid,
  })),
]);
const { execute: fetchFullCatalog } = useDataApi<Catalog>(null, null, {
  abortPrevious: false,
});
const { execute: fetchFullSystemSecurityPlan } = useDataApi<SystemSecurityPlan>(
  null,
  null,
  { abortPrevious: false },
);

watch(catalogs, buildControlList);
watch(systemSecurityPlans, buildComponentList);

async function buildControlList() {
  // Reset before rebuilding to avoid duplicates on re-runs
  controls.value = [];
  for (const catalog of catalogs.value || []) {
    try {
      const response = await fetchFullCatalog(
        `/api/oscal/catalogs/${catalog.uuid}/full`,
      );
      // useAxios execute() returns AxiosResponse; payload is in response.data.data
      const fullCatalog = response?.data.value?.data as Catalog | undefined;
      if (!fullCatalog) {
        continue;
      }
      const results = [] as SelectControl[];
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
        }
      }
      controls.value = [...controls.value, ...results];
    } catch (error) {
      console.error(`Error fetching full catalog ${catalog.uuid}:`, error);
    }
  }
  loadingControls.value = false;
}

async function buildComponentList() {
  // Reset before rebuilding to avoid duplicates on re-runs
  components.value = [];
  for (const systemSecurityPlan of systemSecurityPlans.value || []) {
    try {
      const response = await fetchFullSystemSecurityPlan(
        `/api/oscal/system-security-plans/${systemSecurityPlan.uuid}/full`,
      );
      // useAxios execute() returns AxiosResponse; payload is in response.data.data
      const fullSystemSecurityPlan = response?.data.value?.data as
        | SystemSecurityPlan
        | undefined;
      if (!fullSystemSecurityPlan) {
        continue;
      }
      const results = [] as SelectComponent[];
      let componentList = [] as ComponentOption[];
      if (fullSystemSecurityPlan.systemImplementation.components) {
        fullSystemSecurityPlan.systemImplementation.components.forEach(
          (component) => {
            componentList = [
              ...componentList,
              ...getComponentSelectList(component),
            ];
          },
        );

        results.push({
          label: systemSecurityPlan.metadata.title,
          code: systemSecurityPlan.uuid,
          items: componentList,
        });
      }

      components.value = [...components.value, ...results];
    } catch (error) {
      console.error(
        `Error fetching full systemSecurityPlan ${systemSecurityPlan.uuid}:`,
        error,
      );
    }
  }
  loadingComponents.value = false;
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

function getComponentSelectList(component: SystemComponent): ComponentOption[] {
  return [
    {
      label: component.title,
      value: component.uuid,
    },
  ];
}

function submit() {
  const controlIds = selectedControls.value.map((control) => control.value);
  const componentIds = selectedComponents.value.map(
    (component) => component.value,
  );
  try {
    const parsedFilter = new FilterParser(filter.value).parse();
    emit('submit', {
      ...(props.dashboard ?? {}),
      name: name.value,
      sspId: selectedSspId.value,
      filter: parsedFilter,
      controls: controlIds,
      components: componentIds,
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
