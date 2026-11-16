<script setup lang="ts">
/**
 * The system's characteristics: its name and short name, sensitivity level, description and
 * remarks. Loads them on mount (emitting `updated` with an empty object if they can't be loaded,
 * so the parent can say so), saves the whole record, and emits `updated` once saved.
 */
import { computed, onMounted, ref } from 'vue';
import { type SystemCharacteristics } from '@/oscal';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Skeleton from '@/ds/components/Skeleton/Skeleton.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const { can, permissionTooltip } = usePermissions();

const sspStore = useSystemSecurityPlanStore();

const props = defineProps<{
  systemSecurityPlanId: string;
}>();

const characteristics = ref<SystemCharacteristics>({} as SystemCharacteristics);
const loading = ref(true);
const saving = ref(false);
const saveError = ref('');

const emit = defineEmits<{
  updated: [characteristics: SystemCharacteristics];
  cancel: [];
}>();

const saveDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : permissionTooltip(RESOURCES.SSP, ACTIONS.UPDATE),
);

async function updateCharacteristics() {
  saveError.value = '';
  saving.value = true;
  try {
    await sspStore.updateCharacteristics(
      props.systemSecurityPlanId,
      characteristics.value,
    );
    emit('updated', characteristics.value);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  sspStore
    .getCharacteristics(props.systemSecurityPlanId)
    .then((data) => {
      characteristics.value = data.data;
    })
    .catch(() => {
      emit('updated', {} as SystemCharacteristics);
    })
    .finally(() => {
      loading.value = false;
    });
});
</script>

<template>
  <Skeleton v-if="loading" :count="5" />
  <form v-else novalidate @submit.prevent="updateCharacteristics">
    <Stack gap="4">
      <Grid min="sm" gap="4">
        <FormField label="System name">
          <TextInput v-model="characteristics.systemName" />
        </FormField>
        <FormField label="Short name">
          <TextInput v-model="characteristics.systemNameShort" />
        </FormField>
        <FormField label="Sensitivity level" hint="e.g. moderate">
          <TextInput v-model="characteristics.securitySensitivityLevel" />
        </FormField>
      </Grid>
      <FormField label="Description">
        <Textarea v-model="characteristics.description" :rows="4" />
      </FormField>
      <FormField label="Remarks">
        <Textarea v-model="characteristics.remarks" :rows="3" />
      </FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="saving"
          :disabled-reason="saveDenied"
          >Save characteristics</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
