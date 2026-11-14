<script setup lang="ts">
/**
 * Configure System → System Implementation (reached by link): the SSP system implementation's
 * remarks, properties and links, with counts of its users and components, and an edit dialog
 * for the remarks, properties and links. Users and components have their own sections.
 */
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { Link, Property, SystemImplementation } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string }>();

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const url = `/api/oscal/system-security-plans/${props.sspId}/system-implementation`;
const implementation = useApiQuery<SystemImplementation>(url);
const data = computed(() => implementation.data.value);

const editDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing security plans.",
);

const facts = computed(() => [
  { key: 'remarks', label: 'Remarks', value: data.value?.remarks },
  {
    key: 'props',
    label: 'Properties',
    value: (data.value?.props ?? [])
      .map((p) => `${p.name}: ${p.value}`)
      .join(', '),
  },
  { key: 'links', label: 'Links', value: data.value?.links?.length ? ' ' : '' },
]);
const counts = computed(() => [
  {
    key: 'users',
    label: 'Users',
    value: plural(data.value?.users?.length ?? 0, 'user'),
  },
  {
    key: 'components',
    label: 'Components',
    value: plural(data.value?.components?.length ?? 0, 'component'),
  },
]);

// Edit ---------------------------------------------------------------------------------------

const editing = ref(false);
const saving = ref(false);
const saveError = ref('');
const draft = reactive<{ remarks: string; props: Property[]; links: Link[] }>({
  remarks: '',
  props: [],
  links: [],
});
const newProp = (): Property => ({ name: '', value: '' });
const newLink = (): Link => ({ href: '', text: '' });

function openEdit() {
  draft.remarks = data.value?.remarks ?? '';
  draft.props = (data.value?.props ?? []).map((p) => ({ ...p }));
  draft.links = (data.value?.links ?? []).map((l) => ({ ...l }));
  saveError.value = '';
  editing.value = true;
}

async function save() {
  if (!data.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    const response = await api.put<{ data: SystemImplementation }>(
      url,
      {
        ...data.value,
        remarks: draft.remarks.trim() || undefined,
        props: draft.props.filter((p) => p.name?.trim()),
        links: draft.links.filter((l) => l.href.trim()),
      },
      { transformRequest: [decamelizeKeys] },
    );
    implementation.data.value = response.data.data;
    editing.value = false;
    toast.add({
      severity: 'success',
      summary: 'System implementation saved',
      life: 3000,
    });
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <DataState
    :status="implementation.status.value"
    subject="the system implementation"
    skeleton="panel"
    @retry="implementation.retry"
  >
    <Stack gap="5">
      <Panel title="System implementation" :level="2">
        <template #actions>
          <Button icon="edit" :disabled-reason="editDenied" @click="openEdit"
            >Edit</Button
          >
        </template>
        <DescriptionList :items="facts" layout="stacked">
          <template v-if="data?.links?.length" #value-links>
            <Stack gap="1">
              <TextLink
                v-for="link in data?.links"
                :key="link.href"
                :href="link.href"
                >{{ link.text || link.href }}</TextLink
              >
            </Stack>
          </template>
        </DescriptionList>
      </Panel>
      <Panel title="Contents" :level="2">
        <DescriptionList :items="counts">
          <template #value-users>
            <TextLink
              :to="{ name: 'system-configure-users', params: route.params }"
              >{{ counts[0]!.value }}</TextLink
            >
          </template>
          <template #value-components>
            <TextLink
              :to="{
                name: 'system-configure-components',
                params: route.params,
              }"
              >{{ counts[1]!.value }}</TextLink
            >
          </template>
        </DescriptionList>
      </Panel>
    </Stack>

    <Dialog v-model:open="editing" title="Edit system implementation" size="l">
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="save">
          <Stack gap="4">
            <FormField label="Remarks">
              <Textarea v-model="draft.remarks" :rows="4" />
            </FormField>
            <FieldList
              v-model="draft.props"
              legend="Properties"
              item-label="property"
              add-label="Add property"
              empty-text="No properties."
              :new-item="newProp"
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
              v-model="draft.links"
              legend="Links"
              item-label="link"
              add-label="Add link"
              empty-text="No links."
              :new-item="newLink"
            >
              <template #item="{ item }">
                <Grid min="sm" gap="2">
                  <FormField label="URL"
                    ><TextInput v-model="item.href" type="url"
                  /></FormField>
                  <FormField label="Text"
                    ><TextInput v-model="item.text"
                  /></FormField>
                </Grid>
              </template>
            </FieldList>
            <InlineMessage v-if="saveError" tone="error" title="Not saved">
              <p>{{ saveError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving"
                >Save</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
  </DataState>
</template>
