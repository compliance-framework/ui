<script setup lang="ts">
/**
 * One component's statement for a control, in the Implementation drawer: the component, its open
 * risks for this control (linking to the register), the statement and implementation status,
 * and a menu to edit or delete it, then what it shares (ByComponentResponsibilities). Editing
 * happens in place; the screen saves or deletes.
 */
import { computed, ref, watch } from 'vue';
import VueMarkdown from 'vue-markdown-render';
import { useDataApi } from '@/composables/axios';
import type { ByComponent, Risk, SystemComponent } from '@/oscal';
import {
  getRiskComponentIds,
  getRiskControlIds,
  isClosedStatus,
} from '@/utils/risk-register';
import {
  implementationStatusLabel,
  implementationStatusOptionsWithNone,
  normalizeByComponentImplementationStatus,
} from '@/views/control-implementations/partials/implementation-status';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ByComponentResponsibilities from './ByComponentResponsibilities.vue';

const props = defineProps<{
  byComponent: ByComponent;
  controlId?: string;
  sspId?: string;
  sspRisks?: Risk[];
  /** The register is fetched up to this many risks, so a count at it may be higher. */
  riskFetchLimit?: number;
  editDeniedReason?: string;
}>();
const emit = defineEmits<{
  save: [byComponent: ByComponent];
  delete: [byComponent: ByComponent];
}>();

const { data: component, execute: fetchComponent } =
  useDataApi<SystemComponent>(null, {}, { immediate: false });
watch(
  () =>
    props.sspId && props.byComponent.componentUuid
      ? `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components/${props.byComponent.componentUuid}`
      : null,
  (url) => void (url && fetchComponent(url).catch(() => undefined)),
  { immediate: true },
);
const title = computed(
  () => component.value?.title || 'Component not found in this plan',
);

const same = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const openRisks = computed(() =>
  !props.controlId || !props.byComponent.componentUuid
    ? 0
    : (props.sspRisks ?? []).filter(
        (risk) =>
          !isClosedStatus(risk.status) &&
          getRiskComponentIds(risk).some((id) =>
            same(id, props.byComponent.componentUuid),
          ) &&
          getRiskControlIds(risk).some((id) => same(id, props.controlId)),
      ).length,
);
const riskLabel = computed(() => {
  const capped =
    props.riskFetchLimit && openRisks.value >= props.riskFetchLimit;
  return `${capped ? `${openRisks.value}+` : openRisks.value} open ${
    openRisks.value === 1 && !capped ? 'risk' : 'risks'
  }`;
});

const status = computed(() =>
  implementationStatusLabel(props.byComponent.implementationStatus?.state),
);

// Edit in place ------------------------------------------------------------------------------

const editing = ref(false);
const statusOptions = [...implementationStatusOptionsWithNone];
const draft = ref({ description: '', state: '', remarks: '' });

function startEdit() {
  draft.value = {
    description: props.byComponent.description ?? '',
    state: props.byComponent.implementationStatus?.state ?? '',
    remarks: props.byComponent.implementationStatus?.remarks ?? '',
  };
  editing.value = true;
}

function save() {
  const next: ByComponent = JSON.parse(JSON.stringify(props.byComponent));
  next.description = draft.value.description;
  next.implementationStatus = draft.value.state
    ? { state: draft.value.state, remarks: draft.value.remarks || undefined }
    : undefined;
  emit('save', normalizeByComponentImplementationStatus(next));
  editing.value = false;
}

const confirmDelete = ref(false);
const actions = computed<MenuEntry[]>(() => [
  {
    label: 'Edit statement',
    icon: 'edit',
    disabledReason: props.editDeniedReason,
    onSelect: startEdit,
  },
  {
    label: 'Delete statement',
    icon: 'delete',
    tone: 'danger',
    disabledReason: props.editDeniedReason,
    onSelect: () => (confirmDelete.value = true),
  },
]);
</script>

<template>
  <Panel :title="title" :level="3">
    <template #actions>
      <Menu :label="`Actions for ${title}`" :items="actions" />
    </template>
    <Stack gap="3">
      <Cluster v-if="openRisks || status" gap="2">
        <Tag v-if="status" :label="status" />
        <TextLink
          v-if="openRisks && controlId"
          :to="{ name: 'risks:index', query: { controlId } }"
          >{{ riskLabel }}</TextLink
        >
      </Cluster>
      <form v-if="editing" novalidate @submit.prevent="save">
        <Stack gap="3">
          <FormField label="Statement">
            <Textarea v-model="draft.description" :rows="4" auto-grow />
          </FormField>
          <FormField label="Implementation status">
            <Select v-model="draft.state" :options="statusOptions" />
          </FormField>
          <FormField
            v-if="draft.state"
            label="Status remarks"
            hint="Why it has this status, or what is left to do."
          >
            <Textarea v-model="draft.remarks" :rows="2" auto-grow />
          </FormField>
          <Cluster justify="end" gap="2">
            <Button @click="editing = false">Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </Cluster>
        </Stack>
      </form>
      <template v-else>
        <Text v-if="byComponent.description" as="div" variant="prose"
          ><VueMarkdown :source="byComponent.description"
        /></Text>
        <Text v-else variant="secondary">No statement yet.</Text>
        <Text
          v-if="byComponent.implementationStatus?.remarks"
          variant="secondary"
          >{{ byComponent.implementationStatus.remarks }}</Text
        >
      </template>
      <ByComponentResponsibilities :by-component="byComponent" />
    </Stack>
    <ConfirmDialog
      v-model:open="confirmDelete"
      :title="`Delete the statement for ${title}?`"
      confirm-label="Delete statement"
      @confirm="emit('delete', byComponent)"
      ><Text>This can't be undone.</Text></ConfirmDialog
    >
  </Panel>
</template>
