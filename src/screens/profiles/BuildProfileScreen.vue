<script setup lang="ts">
/**
 * Build a profile from props (/profiles/build-props): pick a catalog, give rules on its controls'
 * props (any or all must match), and build a new profile from the matching controls. The result
 * links to the new profile and lists the matched controls.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@/ds/toasts';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { ACTIONS, RESOURCES } from '@/constants/permissions';
import type { Catalog } from '@/oscal';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

interface Rule {
  name: string;
  operator: string;
  value: string;
}
interface BuildResult {
  profileId: string;
  controlIds: string[];
}

const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const createDenied = computed(() =>
  can(RESOURCES.PROFILE, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating profiles.",
);

const catalogs = useApiQuery<Catalog[]>('/api/oscal/catalogs');
const catalogOptions = computed(() =>
  (catalogs.data.value ?? []).map((c) => ({
    value: c.uuid,
    label: c.metadata?.title || c.uuid,
  })),
);

const draft = reactive({
  catalogId: '',
  matchStrategy: 'any',
  title: 'Prop-matched profile',
  version: '1.0.0',
  rules: [{ name: 'label', operator: 'contains', value: 'AC-' }] as Rule[],
});
watch(
  () => catalogs.data.value,
  (list) => {
    if (list?.length && !draft.catalogId) draft.catalogId = list[0]!.uuid;
  },
  { immediate: true },
);

const operators = ['equals', 'contains', 'regex', 'in'].map((value) => ({
  value,
  label: value,
}));
const strategies = [
  { value: 'any', label: 'Any rule matches' },
  { value: 'all', label: 'Every rule matches' },
];
const newRule = (): Rule => ({ name: '', operator: 'equals', value: '' });

const errors = reactive({ catalog: '', title: '', rules: '' });
const building = ref(false);
const buildError = ref('');
const result = ref<BuildResult>();

async function build() {
  errors.catalog = draft.catalogId ? '' : 'Choose a catalog.';
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.rules =
    draft.rules.length && draft.rules.every((r) => r.value.trim())
      ? ''
      : 'Add at least one rule, and give every rule a value.';
  if (errors.catalog || errors.title || errors.rules) return;
  building.value = true;
  buildError.value = '';
  try {
    const response = await api.post<{ data: BuildResult }>(
      '/api/oscal/profiles/build-props',
      {
        catalogId: draft.catalogId,
        matchStrategy: draft.matchStrategy,
        rules: draft.rules,
        title: draft.title.trim(),
        version: draft.version.trim(),
      },
      { transformRequest: [decamelizeKeys] },
    );
    result.value = response.data.data;
    toast.add({
      severity: 'success',
      summary: 'Profile built',
      detail: `It selects ${plural(result.value.controlIds?.length ?? 0, 'control')}.`,
      life: 3000,
    });
  } catch (error) {
    buildError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    building.value = false;
  }
}
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Profiles', to: { name: 'profile-list' } }]"
    />
    <PageHeader
      title="Build a profile from props"
      description="Select controls from a catalog by rules on their props."
    />
    <form novalidate @submit.prevent="build">
      <Stack gap="5">
        <Panel title="Source" :level="2">
          <Stack gap="4">
            <FormField label="Catalog" required :error="errors.catalog">
              <Select
                v-model="draft.catalogId"
                :options="catalogOptions"
                :placeholder="
                  catalogs.status.value === 'loading'
                    ? 'Loading catalogs…'
                    : 'Choose a catalog'
                "
              />
            </FormField>
            <Grid min="sm" gap="4">
              <FormField label="Profile title" required :error="errors.title">
                <TextInput v-model="draft.title" />
              </FormField>
              <FormField label="Version">
                <TextInput v-model="draft.version" />
              </FormField>
            </Grid>
          </Stack>
        </Panel>
        <Panel title="Rules" :level="2">
          <Stack gap="4">
            <RadioGroup
              v-model="draft.matchStrategy"
              legend="Select a control when"
              :options="strategies"
              variant="segmented"
            />
            <FieldList
              v-model="draft.rules"
              legend="Rules"
              item-label="rule"
              add-label="Add rule"
              empty-text="No rules yet."
              hint="Each rule tests one prop, e.g. label contains AC-."
              :error="errors.rules"
              :new-item="newRule"
            >
              <template #item="{ item }">
                <Grid min="sm" gap="2">
                  <FormField label="Prop name"
                    ><TextInput v-model="item.name"
                  /></FormField>
                  <FormField label="Operator"
                    ><Select v-model="item.operator" :options="operators"
                  /></FormField>
                  <FormField label="Value"
                    ><TextInput v-model="item.value"
                  /></FormField>
                </Grid>
              </template>
            </FieldList>
          </Stack>
        </Panel>
        <InlineMessage v-if="buildError" tone="error" title="Not built">
          <p>{{ buildError }}</p>
        </InlineMessage>
        <Cluster justify="end">
          <Button
            variant="primary"
            type="submit"
            :loading="building"
            :disabled-reason="createDenied"
            >Build profile</Button
          >
        </Cluster>
      </Stack>
    </form>

    <Panel v-if="result" title="Result" :level="2">
      <Stack gap="3">
        <Text
          >Built
          <TextLink
            :to="{ name: 'profile:view', params: { id: result.profileId } }"
            >{{ draft.title || 'the profile' }}</TextLink
          >, selecting
          {{ plural(result.controlIds?.length ?? 0, 'control') }}.</Text
        >
        <Cluster v-if="result.controlIds?.length" gap="1">
          <Tag v-for="id in result.controlIds" :key="id" :label="id" />
        </Cluster>
      </Stack>
    </Panel>
  </Stack>
</template>
