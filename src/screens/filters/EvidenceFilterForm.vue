<script setup lang="ts">
/**
 * An evidence filter's form (create, or edit a saved filter): name, the filter expression, the
 * system it belongs to (or Global) and whether it follows that system's scope, and the controls
 * or the components it links to. It saves the filter itself and emits `saved`. The script is the
 * classic form's, with saving added.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { FilterParser, serializeFilter } from '@/parsers/labelfilter.ts';
import type { Dashboard, DashboardCreate } from '@/stores/filters.ts';
import type {
  Catalog,
  SystemSecurityPlan,
  Control,
  SystemComponent,
} from '@/oscal';
import { useAuthenticatedInstance, useDataApi } from '@/composables/axios';
import { sspHasScopeEntries } from '@/composables/useSspScope';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useConfigStore } from '@/stores/config';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = withDefaults(
  defineProps<{
    /** When provided, the form is prefilled for editing this dashboard. */
    dashboard?: Dashboard | null;
    /** Prefill the Result Filter input (create flow deep-links `?filter=`). */
    initialFilter?: string;
    /** Pre-select the SSP on create (This System > Evidence deep-links `?sspId=`). */
    initialSspId?: string | null;
  }>(),
  {
    dashboard: null,
    initialFilter: '',
    initialSspId: null,
  },
);

const emit = defineEmits<{
  saved: [payload: DashboardCreate];
  cancel: [];
}>();

const { can } = usePermissions();

const configStore = useConfigStore();
const filterComponentLinkingEnabled = computed(
  () => configStore.filterComponentLinkingEnabled,
);
onMounted(() => configStore.getConfig());

// Editing requires update, creating requires create.
const permissionAction = computed(() =>
  props.dashboard ? ACTIONS.UPDATE : ACTIONS.CREATE,
);
const submitDenied = computed(() =>
  can(RESOURCES.FILTER, permissionAction.value)
    ? undefined
    : props.dashboard
      ? "Your access doesn't include changing evidence filters."
      : "Your access doesn't include creating evidence filters.",
);

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

// A filter that follows its SSP's scope is edited through its own expression
// (scopeBase); the stored filter is that AND the scope, shown read-only.
const followingBase = props.dashboard?.scopeBase ?? null;
const effectiveFilter = props.dashboard
  ? serializeFilter(props.dashboard.filter)
  : '';

const name = ref<string>(props.dashboard?.name ?? '');
const filter = ref<string>(
  props.dashboard
    ? serializeFilter(followingBase ?? props.dashboard.filter)
    : props.initialFilter,
);
const selectedSspId = ref<string | null>(
  props.dashboard ? (props.dashboard.sspId ?? null) : props.initialSspId,
);

// "Follow this SSP's scope": shown when the chosen SSP has scope entries (or the filter
// already follows that SSP's scope), on by default for new filters.
const followScope = ref<boolean>(props.dashboard ? !!followingBase : true);
const selectedSspHasScope = ref(false);
const followVisible = computed(
  () =>
    !!selectedSspId.value &&
    (selectedSspHasScope.value ||
      (!!followingBase && selectedSspId.value === props.dashboard?.sspId)),
);
// Until the SSP's scope is read, whether the filter may follow it is unknown, so the form
// cannot be submitted: saving then would silently drop following.
const scopeCheck = ref<'done' | 'loading' | 'failed'>('done');
const scopeApi = useAuthenticatedInstance();
async function checkScope(sspId: string | null) {
  selectedSspHasScope.value = false;
  scopeCheck.value = sspId ? 'loading' : 'done';
  if (!sspId) return;
  try {
    const hasScope = await sspHasScopeEntries(scopeApi, sspId);
    if (selectedSspId.value !== sspId) return;
    selectedSspHasScope.value = hasScope;
    scopeCheck.value = 'done';
  } catch (error) {
    if (selectedSspId.value !== sspId) return;
    console.error(`Error reading the scope of SSP ${sspId}:`, error);
    scopeCheck.value = 'failed';
  }
}
watch(selectedSspId, checkScope, { immediate: true });
// Whether the input holds the following filter's own expression. Once it stops following
// (unticked, or moved to another scope), the API keeps the effective filter, so show that.
const showingBase = computed(
  () => !!followingBase && followVisible.value && followScope.value,
);
watch(showingBase, (base) => {
  filter.value = serializeFilter(
    base ? followingBase! : props.dashboard!.filter,
  );
});
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
// A filter links to controls or to components, not both.
const controlsDenied = computed(() =>
  selectedComponents.value.length
    ? 'This filter links to components. Remove them to link controls.'
    : undefined,
);
const componentsDenied = computed(() =>
  selectedControls.value.length
    ? 'This filter links to controls. Remove them to link components.'
    : undefined,
);
const controlOptions = computed(() => {
  const chosen = new Set(selectedControls.value.map((c) => c.value));
  return controls.value
    .flatMap((group) => group.items)
    .filter((c) => !chosen.has(c.value));
});
const componentOptions = computed(() => {
  const chosen = new Set(selectedComponents.value.map((c) => c.value));
  return components.value.flatMap((ssp) =>
    ssp.items
      .filter((c) => !chosen.has(c.value))
      .map((c) => ({ value: c.value, label: `${c.label} (${ssp.label})` })),
  );
});
// Choosing in a picker adds the choice to the list and clears the picker.
const controlToAdd = ref('');
watch(controlToAdd, (value) => {
  const option = controlOptions.value.find((c) => c.value === value);
  if (option) selectedControls.value = [...selectedControls.value, option];
  if (value) controlToAdd.value = '';
});
const componentToAdd = ref('');
watch(componentToAdd, (value) => {
  const option = componentOptions.value.find((c) => c.value === value);
  if (option) selectedComponents.value = [...selectedComponents.value, option];
  if (value) componentToAdd.value = '';
});
// The system Select holds '' for Global.
const sspChoice = computed({
  get: () => selectedSspId.value ?? '',
  set: (value: string) => (selectedSspId.value = value || null),
});

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');
const { data: systemSecurityPlans } = useDataApi<SystemSecurityPlan[]>(
  '/api/oscal/system-security-plans',
);
const sspScopeOptions = computed(() => [
  { label: 'Global (every system)', value: '' },
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
        SystemSecurityPlan | undefined;
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

  // The control itself, then its enhancements: the classic list left out a control that had
  // enhancements, so AC-2 could not be linked, only AC-2(1) and so on.
  results.push({ label: control.id + ' ' + control.title, value: control.id });
  for (const child of control.controls ?? []) {
    results = [...results, ...getControlSelectList(child)];
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

const api = useAuthenticatedInstance();
const nameError = ref('');
const filterError = ref('');
const saveError = ref('');
const saving = ref(false);

async function submit() {
  if (scopeCheck.value !== 'done') return;
  nameError.value = name.value.trim() ? '' : 'Enter a name.';
  filterError.value = '';
  saveError.value = '';
  let parsedFilter;
  try {
    parsedFilter = new FilterParser(filter.value).parse();
  } catch (error) {
    // The classic form only logged this, so an invalid filter did nothing on Submit.
    filterError.value =
      error instanceof Error ? error.message : 'The filter is invalid.';
  }
  if (nameError.value || !parsedFilter) return;
  // followSspScope: true makes the filter follow; false is only sent to stop a filter
  // that follows today, since the API keeps the effective filter when it is false.
  const follow = followVisible.value && followScope.value;
  const payload: DashboardCreate = {
    ...(props.dashboard ?? {}),
    name: name.value.trim(),
    sspId: selectedSspId.value,
    filter: parsedFilter,
    controls: selectedControls.value.map((control) => control.value),
    components: selectedComponents.value.map((component) => component.value),
    ...(follow || followingBase ? { followSspScope: follow } : {}),
  };
  saving.value = true;
  try {
    // /api/filters is a camelCase API: no decamelizeKeys, or followSspScope and sspId
    // would go out kebab-cased.
    if (props.dashboard?.id) {
      await api.put(`/api/filters/${props.dashboard.id}`, payload);
    } else {
      await api.post('/api/filters', payload);
    }
    emit('saved', payload);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="5">
      <FormField label="Name" required :error="nameError || undefined">
        <TextInput v-model="name" />
      </FormField>
      <FormField
        label="Filter"
        :error="filterError || undefined"
        :hint="
          showingBase
            ? 'This filter follows its system\'s scope: edit its own expression here.'
            : 'Labels to match, e.g. team=payments AND env!=dev'
        "
      >
        <TextInput v-model="filter" />
      </FormField>
      <Text
        v-if="showingBase && selectedSspId === props.dashboard?.sspId"
        variant="caption"
        data-testid="effective-filter"
        >Effective filter, with the scope: {{ effectiveFilter }}</Text
      >
      <FormField label="System">
        <Select v-model="sspChoice" :options="sspScopeOptions" />
      </FormField>
      <Checkbox
        v-if="followVisible"
        v-model="followScope"
        label="Follow this system's scope"
        description="The filter also matches the system's scope, and changes with it."
        data-testid="follow-ssp-scope"
      />
      <InlineMessage
        v-if="scopeCheck === 'failed'"
        tone="error"
        title="Scope not read"
        data-testid="scope-error"
      >
        <p>
          This system's scope couldn't be read, so the filter can't follow it
          yet.
        </p>
        <template #actions>
          <Button @click="checkScope(selectedSspId)">Retry</Button>
        </template>
      </InlineMessage>
      <Stack gap="2">
        <Text as="span" variant="label">Controls</Text>
        <Stack v-if="selectedControls.length" gap="1" as="ul">
          <li v-for="control in selectedControls" :key="control.value">
            <Cluster justify="between" gap="2">
              <Text as="span">{{ control.label }}</Text>
              <IconButton
                icon="close"
                :label="`Remove ${control.value}`"
                @click="
                  selectedControls = selectedControls.filter(
                    (c) => c.value !== control.value,
                  )
                "
              />
            </Cluster>
          </li>
        </Stack>
        <Text v-if="controlsDenied" variant="caption">{{
          controlsDenied
        }}</Text>
        <FormField v-else label="Link a control">
          <Combobox
            v-model="controlToAdd"
            :options="controlOptions"
            :loading="loadingControls"
            placeholder="Control ID or title"
          />
        </FormField>
      </Stack>
      <Stack v-if="filterComponentLinkingEnabled" gap="2">
        <Text as="span" variant="label">Components</Text>
        <Stack v-if="selectedComponents.length" gap="1" as="ul">
          <li v-for="component in selectedComponents" :key="component.value">
            <Cluster justify="between" gap="2">
              <Text as="span">{{ component.label }}</Text>
              <IconButton
                icon="close"
                :label="`Remove ${component.label}`"
                @click="
                  selectedComponents = selectedComponents.filter(
                    (c) => c.value !== component.value,
                  )
                "
              />
            </Cluster>
          </li>
        </Stack>
        <Text v-if="componentsDenied" variant="caption">{{
          componentsDenied
        }}</Text>
        <FormField v-else label="Link a component">
          <Combobox
            v-model="componentToAdd"
            :options="componentOptions"
            :loading="loadingComponents"
            placeholder="Component name"
          />
        </FormField>
      </Stack>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button v-if="dashboard" @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="saving"
          :disabled-reason="
            submitDenied ??
            (scopeCheck === 'loading'
              ? 'Checking the system\'s scope…'
              : scopeCheck === 'failed'
                ? 'Retry reading the system\'s scope first.'
                : undefined)
          "
          >{{ dashboard ? 'Save filter' : 'Create filter' }}</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
