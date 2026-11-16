<template>
  <form novalidate @submit.prevent="updateStatement()">
    <Stack gap="4">
      <FormField label="Statement ID" required hint="e.g. au-1_smt">
        <TextInput v-model="statementData.statementId" />
      </FormField>
      <FormField label="Remarks">
        <Textarea v-model="statementData.remarks" :rows="3" />
      </FormField>
      <FieldList
        v-model="statementData.props!"
        legend="Properties"
        item-label="property"
        add-label="Add property"
        empty-text="No properties."
        :new-item="newProperty"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Name"
              ><TextInput v-model="item.name"
            /></FormField>
            <FormField label="Value"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FieldList
        v-model="statementData.links!"
        legend="Links"
        item-label="link"
        add-label="Add link"
        empty-text="No links."
        :new-item="newLink"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="URL"><TextInput v-model="item.href" /></FormField>
            <FormField label="Relation"
              ><TextInput v-model="item.rel"
            /></FormField>
            <FormField label="Text"
              ><TextInput v-model="item.text"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <Cluster justify="end" gap="2">
        <Button @click="$emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="saving"
          :disabled-reason="saveDenied()"
          >Save statement</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>

<script setup lang="ts">
/** Editing a control statement's ID, remarks, properties and links. The script is the classic form's. */
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { reactive, onMounted } from 'vue';
import { uuid } from '@/utils/uuid';
import { useToast } from 'primevue/usetoast';
import type { Statement } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
// New rows for the field lists, typed as the statement's own.
type StatementProperty = NonNullable<typeof statementData.props>[number];
type StatementLink = NonNullable<typeof statementData.links>[number];
const newProperty = (): StatementProperty => ({
  name: '',
  value: '',
  class: '',
  ns: '',
  uuid: uuid(),
});
const newLink = (): StatementLink => ({ href: '', rel: '', text: '' });
const saveDenied = () =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing this system's statements.";

const props = defineProps<{
  sspId: string;
  reqId: string;
  statement: Statement;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [statement: Statement];
}>();

const toast = useToast();
const {
  data: updatedStatement,
  execute: updateStatementApi,
  isLoading: saving,
} = useDataApi<Statement>(
  `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.reqId}/statements/${props.statement.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const statementData = reactive<Statement>({
  uuid: '',
  statementId: '',
  props: [],
  links: [],
  remarks: '',
});

onMounted(() => {
  Object.assign(statementData, {
    uuid: props.statement.uuid,
    statementId: props.statement.statementId,
    remarks: props.statement.remarks,
    props: [...(props.statement.props || [])],
    links: [...(props.statement.links || [])],
    byComponents: props.statement.byComponents,
  });
});

const updateStatement = async () => {
  if (!statementData.statementId.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Statement ID is required.',
      life: 3000,
    });
    return;
  }

  try {
    await updateStatementApi({
      data: statementData,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Statement updated successfully.',
      life: 3000,
    });

    emit('saved', updatedStatement.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage =
      errorResponse.response?.data?.errors.body ||
      'Failed to update statement.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    });
  }
};
</script>
